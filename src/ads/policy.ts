// Pure rules for when a full-screen (interstitial) ad may appear. Kept separate from the ad SDK so
// it can be unit-tested and so the behaviour is easy to read and change.
import type { InterstitialRules } from './config.ts';

export interface InterstitialGate {
  /** Puzzles finished since the last interstitial was shown. */
  completedSinceAd: number;
  /** When the last interstitial was shown (ms since epoch), or null if none yet this session. */
  lastShownAt: number | null;
  /** How many finished puzzles are needed before the next ad (chosen from the configured range). */
  threshold: number;
}

/** Pick the next threshold from the configured range (inclusive). `rand` is injectable for tests. */
export function pickThreshold(rules: InterstitialRules, rand: () => number = Math.random): number {
  const lo = Math.max(1, Math.min(rules.minLevels, rules.maxLevels));
  const hi = Math.max(lo, rules.maxLevels);
  return lo + Math.min(hi - lo, Math.floor(rand() * (hi - lo + 1)));
}

export const newGate = (rules: InterstitialRules, rand?: () => number): InterstitialGate => ({
  completedSinceAd: 0,
  lastShownAt: null,
  threshold: pickThreshold(rules, rand),
});

export const onPuzzleCompleted = (g: InterstitialGate): InterstitialGate => ({
  ...g,
  completedSinceAd: g.completedSinceAd + 1,
});

export const onInterstitialShown = (
  g: InterstitialGate,
  now: number,
  rules: InterstitialRules,
  rand?: () => number,
): InterstitialGate => ({
  completedSinceAd: 0,
  lastShownAt: now,
  threshold: pickThreshold(rules, rand),
});

/**
 * May an interstitial be shown right now?
 *  - `nextLevel`: the level the player is about to enter (a large number for quick play / daily)
 *  - `sessionStartedAt`: when the app started, for the start-up grace period
 */
export function canShowInterstitial(
  gate: InterstitialGate,
  now: number,
  nextLevel: number,
  rules: InterstitialRules,
  sessionStartedAt: number,
): boolean {
  if (now - sessionStartedAt < rules.appStartGraceMs) return false;
  if (nextLevel < rules.firstEligibleLevel) return false;
  if (gate.completedSinceAd < gate.threshold) return false;
  if (gate.lastShownAt !== null && now - gate.lastShownAt < rules.minGapMs) return false;
  return true;
}
