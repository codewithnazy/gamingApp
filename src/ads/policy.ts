// Pure rules for when a full-screen (interstitial) ad may appear. Kept separate from the ad SDK so
// it can be unit-tested and so the behaviour is easy to read and change.
import type { InterstitialRules } from './config.ts';

export interface InterstitialGate {
  /** Puzzles finished since the last interstitial was shown. */
  completedSinceAd: number;
  /** When the last interstitial was shown (ms since epoch), or null if none yet this session. */
  lastShownAt: number | null;
}

export const NEW_GATE: InterstitialGate = { completedSinceAd: 0, lastShownAt: null };

export const onPuzzleCompleted = (g: InterstitialGate): InterstitialGate => ({
  ...g,
  completedSinceAd: g.completedSinceAd + 1,
});

export const onInterstitialShown = (g: InterstitialGate, now: number): InterstitialGate => ({
  completedSinceAd: 0,
  lastShownAt: now,
});

/**
 * May an interstitial be shown right now? `nextLevel` is the level the player is about to enter
 * (use a large number for quick play, which has no levels).
 */
export function canShowInterstitial(
  gate: InterstitialGate,
  now: number,
  nextLevel: number,
  rules: InterstitialRules,
): boolean {
  if (nextLevel < rules.firstEligibleLevel) return false;
  if (gate.completedSinceAd < rules.everyNLevels) return false;
  if (gate.lastShownAt !== null && now - gate.lastShownAt < rules.minGapMs) return false;
  return true;
}
