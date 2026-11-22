// Analytics engine: PURE (no React Native, no Firebase import) so its privacy and safety rules can
// be unit-tested. Providers (Firebase, console, ...) are injected.
//
// Rules enforced here:
//  - events are only SENT when the player has not opted out AND consent is granted;
//  - while consent is still unknown, events wait in a small queue; they are sent if consent is
//    granted and thrown away if it is denied (nothing leaves the device without consent);
//  - parameters are sanitised: only numbers / booleans / short strings, and anything that looks
//    like an e-mail address is dropped (a last line of defence - we never pass personal data);
//  - nothing a provider does (throw, reject, hang) can ever reach the game.

export type ParamValue = string | number | boolean;
export type Params = Record<string, ParamValue>;

export interface AnalyticsProvider {
  readonly name: string;
  log(name: string, params: Params): void;
  /** Tell the backend whether collection is currently allowed (e.g. Firebase collection switch). */
  setEnabled(enabled: boolean): void;
}

export type ConsentState = 'unknown' | 'granted' | 'denied';

export const MAX_PARAMS = 25; // Firebase's per-event limit
export const MAX_STRING = 100;
export const MAX_QUEUE = 50;
export const MAX_BUFFER = 200;

export function sanitizeParams(input: unknown): Params {
  const out: Params = {};
  if (!input || typeof input !== 'object') return out;
  for (const [rawKey, value] of Object.entries(input as Record<string, unknown>)) {
    if (Object.keys(out).length >= MAX_PARAMS) break;
    const key = rawKey.slice(0, 40);
    if (typeof value === 'number') {
      if (Number.isFinite(value)) out[key] = value;
    } else if (typeof value === 'boolean') {
      out[key] = value;
    } else if (typeof value === 'string') {
      if (value.includes('@')) continue; // looks like an e-mail address: never send
      out[key] = value.slice(0, MAX_STRING);
    }
  }
  return out;
}

export interface RecordedEvent {
  name: string;
  params: Params;
}

export interface Analytics {
  track(name: string, params?: unknown): void;
  /** The player's own switch (Settings). */
  setUserOptIn(optIn: boolean): void;
  /** The result of the consent flow. Until called, consent is 'unknown'. */
  setConsent(granted: boolean): void;
  /** True when events are currently being sent. */
  isActive(): boolean;
  /** The most recently SENT events (for debugging and tests). */
  getRecent(): readonly RecordedEvent[];
}

export function createAnalytics(opts: {
  providers: AnalyticsProvider[];
  /** Start with consent already decided (e.g. platforms where no consent flow exists). */
  initialConsent?: ConsentState;
  onProviderError?: (provider: string, error: unknown) => void;
}): Analytics {
  let consent: ConsentState = opts.initialConsent ?? 'unknown';
  let optIn = true;
  let queue: RecordedEvent[] = [];
  const recent: RecordedEvent[] = [];
  let lastActive: boolean | null = null;

  const safe = (provider: AnalyticsProvider, fn: () => void) => {
    try {
      fn();
    } catch (e) {
      try {
        opts.onProviderError?.(provider.name, e);
      } catch {
        // even the error reporter must not break the game
      }
    }
  };

  const active = () => optIn && consent === 'granted';

  const syncProviders = () => {
    const now = active();
    if (now === lastActive) return;
    lastActive = now;
    for (const p of opts.providers) safe(p, () => p.setEnabled(now));
  };

  const send = (e: RecordedEvent) => {
    recent.push(e);
    if (recent.length > MAX_BUFFER) recent.shift();
    for (const p of opts.providers) safe(p, () => p.log(e.name, e.params));
  };

  const flushQueue = () => {
    const pending = queue;
    queue = [];
    if (active()) pending.forEach(send);
  };

  return {
    track(name, params) {
      try {
        const event: RecordedEvent = { name: String(name).slice(0, 40), params: sanitizeParams(params) };
        if (!optIn || consent === 'denied') return; // dropped: opted out or denied
        if (consent === 'unknown') {
          queue.push(event);
          if (queue.length > MAX_QUEUE) queue.shift();
          return;
        }
        send(event);
      } catch {
        // analytics must never affect gameplay
      }
    },
    setUserOptIn(v) {
      optIn = v;
      if (!v) queue = [];
      syncProviders();
      flushQueue();
    },
    setConsent(granted) {
      consent = granted ? 'granted' : 'denied';
      if (!granted) queue = [];
      syncProviders();
      flushQueue();
    },
    isActive: active,
    getRecent: () => recent,
  };
}
