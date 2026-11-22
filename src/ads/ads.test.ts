import test from 'node:test';
import assert from 'node:assert/strict';
import { ADS_CONFIG } from './config.ts';
import { NEW_GATE, canShowInterstitial, onInterstitialShown, onPuzzleCompleted } from './policy.ts';
import { UNIT_ID_PATTERN, isValidUnitId, resolveUnit } from './units.ts';

const rules = { everyNLevels: 3, minGapMs: 120_000, firstEligibleLevel: 5 };
const T0 = 1_000_000;

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

test('resolveUnit: test ads in dev, when unset, or when the ID is malformed; real ads only when valid in production', () => {
  const real = 'ca-app-pub-1234567890123456/1234567890';
  const ids = { android: real, ios: null };
  assert.deepEqual(resolveUnit(ids, 'android', 'TEST', false), { id: real, isTest: false });
  assert.deepEqual(resolveUnit(ids, 'android', 'TEST', true), { id: 'TEST', isTest: true }, 'dev always uses test ads');
  assert.deepEqual(resolveUnit(ids, 'ios', 'TEST', false), { id: 'TEST', isTest: true }, 'unset platform -> test');
  assert.deepEqual(
    resolveUnit({ android: 'oops', ios: null }, 'android', 'TEST', false),
    { id: 'TEST', isTest: true },
    'malformed id -> test, never a broken live request',
  );
});

test('the gentle default rules are what we say they are', () => {
  assert.deepEqual(ADS_CONFIG.interstitial, rules);
});

test('no interstitial for brand-new players, however many puzzles they finish', () => {
  let g = NEW_GATE;
  for (let i = 0; i < 10; i++) g = onPuzzleCompleted(g);
  assert.equal(canShowInterstitial(g, T0, 4, rules), false, 'levels before 5 are ad-free');
  assert.equal(canShowInterstitial(g, T0, 5, rules), true);
});

test('an interstitial needs 3 finished puzzles since the last one', () => {
  let g = NEW_GATE;
  g = onPuzzleCompleted(g);
  g = onPuzzleCompleted(g);
  assert.equal(canShowInterstitial(g, T0, 10, rules), false);
  g = onPuzzleCompleted(g);
  assert.equal(canShowInterstitial(g, T0, 10, rules), true);
});

test('after one is shown the counter resets and a minimum gap applies', () => {
  let g = NEW_GATE;
  for (let i = 0; i < 3; i++) g = onPuzzleCompleted(g);
  g = onInterstitialShown(g, T0);
  assert.equal(g.completedSinceAd, 0);
  for (let i = 0; i < 3; i++) g = onPuzzleCompleted(g);
  assert.equal(canShowInterstitial(g, T0 + 60_000, 10, rules), false, 'only 1 minute later: too soon');
  assert.equal(canShowInterstitial(g, T0 + 119_999, 10, rules), false);
  assert.equal(canShowInterstitial(g, T0 + 120_000, 10, rules), true, 'gap elapsed');
});

test('a failed/unavailable ad does not reset the counter, so the next chance is not lost', () => {
  let g = NEW_GATE;
  for (let i = 0; i < 3; i++) g = onPuzzleCompleted(g);
  // (the caller only calls onInterstitialShown when an ad really appeared)
  assert.equal(canShowInterstitial(g, T0, 10, rules), true);
  assert.equal(g.completedSinceAd, 3);
});

test('quick play (no levels) passes a large nextLevel and follows the same cap', () => {
  let g = NEW_GATE;
  for (let i = 0; i < 3; i++) g = onPuzzleCompleted(g);
  assert.equal(canShowInterstitial(g, T0, 9999, rules), true);
});
