import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_PARAMS, MAX_QUEUE, MAX_STRING, createAnalytics, sanitizeParams, type AnalyticsProvider } from './core.ts';

function fakeProvider(opts: { throwOnLog?: boolean } = {}) {
  const logged: { name: string; params: Record<string, unknown> }[] = [];
  const enabled: boolean[] = [];
  const p: AnalyticsProvider = {
    name: 'fake',
    log: (name, params) => {
      if (opts.throwOnLog) throw new Error('backend exploded');
      logged.push({ name, params });
    },
    setEnabled: (e) => enabled.push(e),
  };
  return { p, logged, enabled };
}

test('sanitizeParams keeps numbers, booleans and short strings only', () => {
  const out = sanitizeParams({ level: 7, ok: true, tier: 'Master', obj: { a: 1 }, fn: () => 1, nul: null, undef: undefined, nan: NaN, inf: Infinity });
  assert.deepEqual(out, { level: 7, ok: true, tier: 'Master' });
});

test('sanitizeParams drops anything that looks like an e-mail and truncates long strings', () => {
  const out = sanitizeParams({ who: 'someone@example.com', note: 'x'.repeat(500) });
  assert.equal('who' in out, false, 'no e-mail addresses ever');
  assert.equal((out.note as string).length, MAX_STRING);
});

test('sanitizeParams enforces the 25-parameter limit and tolerates junk input', () => {
  const many = Object.fromEntries(Array.from({ length: 60 }, (_, i) => [`p${i}`, i]));
  assert.equal(Object.keys(sanitizeParams(many)).length, MAX_PARAMS);
  assert.deepEqual(sanitizeParams(null), {});
  assert.deepEqual(sanitizeParams('text'), {});
  assert.deepEqual(sanitizeParams(undefined), {});
});

test('events are sent once consent is granted', () => {
  const f = fakeProvider();
  const a = createAnalytics({ providers: [f.p], initialConsent: 'granted' });
  a.track('level_completed', { level: 3, stars: 2 });
  assert.deepEqual(f.logged, [{ name: 'level_completed', params: { level: 3, stars: 2 } }]);
  assert.equal(a.getRecent().length, 1);
});

test('while consent is unknown events wait; they are sent if consent is granted', () => {
  const f = fakeProvider();
  const a = createAnalytics({ providers: [f.p] });
  a.track('app_opened', {});
  a.track('level_started', { level: 1 });
  assert.equal(f.logged.length, 0, 'nothing leaves the device before consent');
  a.setConsent(true);
  assert.deepEqual(f.logged.map((e) => e.name), ['app_opened', 'level_started']);
  assert.deepEqual(f.enabled, [true]);
});

test('if consent is denied the waiting events are thrown away and later events are dropped', () => {
  const f = fakeProvider();
  const a = createAnalytics({ providers: [f.p] });
  a.track('app_opened', {});
  a.setConsent(false);
  a.track('level_started', { level: 1 });
  assert.equal(f.logged.length, 0);
  assert.equal(a.getRecent().length, 0);
  assert.equal(a.isActive(), false);
});

test('the player can opt out and back in', () => {
  const f = fakeProvider();
  const a = createAnalytics({ providers: [f.p], initialConsent: 'granted' });
  a.setUserOptIn(false);
  a.track('level_started', { level: 1 });
  assert.equal(f.logged.length, 0, 'opted out: nothing sent');
  assert.equal(a.isActive(), false);
  a.setUserOptIn(true);
  a.track('level_started', { level: 2 });
  assert.equal(f.logged.length, 1);
  assert.deepEqual(f.enabled, [false, true], 'the backend collection switch follows the opt-in');
});

test('opting out also clears anything still waiting for consent', () => {
  const f = fakeProvider();
  const a = createAnalytics({ providers: [f.p] });
  a.track('app_opened', {});
  a.setUserOptIn(false);
  a.setConsent(true);
  assert.equal(f.logged.length, 0);
});

test('a provider that throws never breaks tracking, and other providers still get the event', () => {
  const bad = fakeProvider({ throwOnLog: true });
  const good = fakeProvider();
  const errors: string[] = [];
  const a = createAnalytics({ providers: [bad.p, good.p], initialConsent: 'granted', onProviderError: (n) => errors.push(n) });
  assert.doesNotThrow(() => a.track('level_started', { level: 1 }));
  assert.equal(good.logged.length, 1);
  assert.deepEqual(errors, ['fake']);
});

test('even a throwing error reporter and nonsense input cannot break tracking', () => {
  const bad = fakeProvider({ throwOnLog: true });
  const a = createAnalytics({
    providers: [bad.p],
    initialConsent: 'granted',
    onProviderError: () => {
      throw new Error('reporter exploded');
    },
  });
  assert.doesNotThrow(() => a.track('x', { level: 1 }));
  assert.doesNotThrow(() => a.track(undefined as unknown as string, 12 as unknown));
});

test('the pre-consent queue and the debug buffer are bounded', () => {
  const f = fakeProvider();
  const a = createAnalytics({ providers: [f.p] });
  for (let i = 0; i < MAX_QUEUE + 30; i++) a.track('e', { i });
  a.setConsent(true);
  assert.equal(f.logged.length, MAX_QUEUE, 'oldest waiting events are dropped');
  assert.equal(f.logged[f.logged.length - 1].params.i, MAX_QUEUE + 29, 'newest are kept');
});

test('event names are truncated to the 40-character limit', () => {
  const f = fakeProvider();
  const a = createAnalytics({ providers: [f.p], initialConsent: 'granted' });
  a.track('n'.repeat(80), {});
  assert.equal(f.logged[0].name.length, 40);
});
