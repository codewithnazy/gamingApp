import test from 'node:test';
import assert from 'node:assert/strict';
import { ADS_CONFIG } from './config.ts';
import {
  canShowInterstitial,
  newGate,
  onInterstitialShown,
  onPuzzleCompleted,
  pickThreshold,
  type InterstitialGate,
} from './policy.ts';
import { UNIT_ID_PATTERN, isValidUnitId, resolveUnit } from './units.ts';

const rules = { minLevels: 3, maxLevels: 4, minGapMs: 120_000, firstEligibleLevel: 5, appStartGraceMs: 60_000, showTimeoutMs: 8000 };
const START = 1_000_000; // when the app "started"
const LATE = START + 10 * 60_000; // ten minutes into the session: grace long over
const low = () => 0; // rand() -> picks the minimum threshold (3)
const high = () => 0.999; // rand() -> picks the maximum threshold (4)

const gateAt = (completed: number, over: Partial<InterstitialGate> = {}): InterstitialGate => ({
  completedSinceAd: completed,
  lastShownAt: null,
  threshold: 3,
  ...over,
});

// ---- ad unit config ---------------------------------------------------------------------------

test('shipped config uses test ads only: no real ad IDs are committed', () => {
  for (const kind of Object.values(ADS_CONFIG.units)) {
    assert.equal(kind.android, null);
    assert.equal(kind.ios, null);
  }
});

test('ad unit ID validation catches typos', () => {
  assert.ok(isValidUnitId('ca-app-pub-1234567890123456/1234567890'));
  assert.ok(!isValidUnitId('ca-app-pub-1234567890123456~1234567890'), 'app id (~) is not a unit id');
  assert.ok(!isValidUnitId('ca-app-pub-123/456'));
  assert.ok(!isValidUnitId('REPLACE_ME'));
  assert.ok(!isValidUnitId(''));
  assert.ok(!isValidUnitId(null));
  assert.ok(UNIT_ID_PATTERN.test('ca-app-pub-3940256099942544/1033173712'), "Google's test ids match the format");
});

test('resolveUnit: test ads in dev, when unset, or malformed; real ads only when valid in production', () => {
  const real = 'ca-app-pub-1234567890123456/1234567890';
  const ids = { android: real, ios: null };
  assert.deepEqual(resolveUnit(ids, 'android', 'TEST', false), { id: real, isTest: false });
  assert.deepEqual(resolveUnit(ids, 'android', 'TEST', true), { id: 'TEST', isTest: true }, 'dev always uses test ads');
  assert.deepEqual(resolveUnit(ids, 'ios', 'TEST', false), { id: 'TEST', isTest: true }, 'unset platform -> test');
  assert.deepEqual(resolveUnit({ android: 'oops', ios: null }, 'android', 'TEST', false), { id: 'TEST', isTest: true });
});

test('the shipped interstitial rules match the spec (about every 3-4 levels, cooldown, grace)', () => {
  assert.deepEqual(ADS_CONFIG.interstitial, rules);
  assert.ok(ADS_CONFIG.interstitial.minLevels >= 3 && ADS_CONFIG.interstitial.maxLevels <= 4);
  assert.ok(ADS_CONFIG.rewarded.loadTimeoutMs > 0 && ADS_CONFIG.rewarded.showTimeoutMs > 0);
});

// ---- frequency policy -------------------------------------------------------------------------

test('pickThreshold stays within the configured 3-4 range', () => {
  assert.equal(pickThreshold(rules, low), 3);
  assert.equal(pickThreshold(rules, high), 4);
  const seen = new Set<number>();
  for (let i = 0; i < 200; i++) seen.add(pickThreshold(rules));
  assert.deepEqual([...seen].sort(), [3, 4]);
  assert.equal(pickThreshold({ ...rules, minLevels: 5, maxLevels: 5 }), 5, 'min == max is allowed');
  assert.equal(pickThreshold({ ...rules, minLevels: 4, maxLevels: 3 }) >= 1, true, 'inverted range is repaired');
});

test('never during the app start-up grace period', () => {
  const g = gateAt(10);
  assert.equal(canShowInterstitial(g, START + 5_000, 10, rules, START), false, '5s after launch');
  assert.equal(canShowInterstitial(g, START + 59_999, 10, rules, START), false);
  assert.equal(canShowInterstitial(g, START + 60_000, 10, rules, START), true, 'grace over');
});

test('no interstitial for brand-new players, however many puzzles they finish', () => {
  let g = newGate(rules, low);
  for (let i = 0; i < 10; i++) g = onPuzzleCompleted(g);
  assert.equal(canShowInterstitial(g, LATE, 4, rules, START), false, 'levels before 5 are ad-free');
  assert.equal(canShowInterstitial(g, LATE, 5, rules, START), true);
});

test('an interstitial needs the chosen number (3 or 4) of finished puzzles', () => {
  let g = newGate(rules, low); // threshold 3
  g = onPuzzleCompleted(onPuzzleCompleted(g));
  assert.equal(canShowInterstitial(g, LATE, 10, rules, START), false, '2 done');
  g = onPuzzleCompleted(g);
  assert.equal(canShowInterstitial(g, LATE, 10, rules, START), true, '3 done');

  let h = newGate(rules, high); // threshold 4
  for (let i = 0; i < 3; i++) h = onPuzzleCompleted(h);
  assert.equal(canShowInterstitial(h, LATE, 10, rules, START), false, '3 done is not enough for a 4-threshold');
  h = onPuzzleCompleted(h);
  assert.equal(canShowInterstitial(h, LATE, 10, rules, START), true);
});

test('after one is shown the counter resets, a new threshold is drawn, and the cooldown applies', () => {
  let g = gateAt(3);
  g = onInterstitialShown(g, LATE, rules, high);
  assert.equal(g.completedSinceAd, 0);
  assert.equal(g.threshold, 4, 'a fresh threshold is drawn for the next cycle');
  for (let i = 0; i < 4; i++) g = onPuzzleCompleted(g);
  assert.equal(canShowInterstitial(g, LATE + 60_000, 10, rules, START), false, '1 min later: too soon');
  assert.equal(canShowInterstitial(g, LATE + 119_999, 10, rules, START), false);
  assert.equal(canShowInterstitial(g, LATE + 120_000, 10, rules, START), true, 'cooldown elapsed');
});

test('a failed or unavailable ad does not reset the counter, so the chance is not lost', () => {
  const g = gateAt(3);
  // The service only calls onInterstitialShown when an ad really appeared.
  assert.equal(canShowInterstitial(g, LATE, 10, rules, START), true);
  assert.equal(g.completedSinceAd, 3);
});

test('restarts and replays never count: only onPuzzleCompleted advances the gate', () => {
  const g = newGate(rules, low);
  // (Restart / replay paths simply never call onPuzzleCompleted.)
  assert.equal(canShowInterstitial(g, LATE, 50, rules, START), false);
  assert.equal(g.completedSinceAd, 0);
});

test('quick play / daily (no levels) pass a large nextLevel and follow the same cap', () => {
  assert.equal(canShowInterstitial(gateAt(3), LATE, 9999, rules, START), true);
  assert.equal(canShowInterstitial(gateAt(2), LATE, 9999, rules, START), false);
});
