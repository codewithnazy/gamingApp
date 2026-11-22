import type { AnalyticsEvents, EventName } from './events';

export type { AnalyticsEvents, EventName } from './events';

/**
 * Record an analytics event. Fully safe: it never throws and never blocks, whatever the backend does.
 * (Stage 1 placeholder: the real providers are wired in Stage 2.)
 */
export function track<E extends EventName>(name: E, params: AnalyticsEvents[E]): void {
  try {
    void name;
    void params;
  } catch {
    // analytics must never affect gameplay
  }
}
