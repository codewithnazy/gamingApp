import { ADS_CONFIG } from './config';
import { NEW_GATE, canShowInterstitial, onInterstitialShown, onPuzzleCompleted, type InterstitialGate } from './policy';
import { showInterstitialAd } from './adsImpl';

export { initAds, showRewardedAd } from './adsImpl';
export { useAdsState } from './store';
export { BannerSlot } from './BannerSlot';
export { AdOverlay } from './AdOverlay';

// Session-only: the gate resets every time the app starts, which only makes ads rarer.
let gate: InterstitialGate = NEW_GATE;

/** Call whenever the player finishes a puzzle. */
export function notePuzzleCompleted() {
  gate = onPuzzleCompleted(gate);
}

/**
 * Between puzzles: show a full-screen ad only if the gentle frequency rules allow it and one is
 * ready. Always resolves (never blocks the game) - the caller just carries on afterwards.
 * `nextLevel` is the level about to start (use a big number for quick play).
 */
export async function maybeShowInterstitial(nextLevel: number): Promise<void> {
  if (!canShowInterstitial(gate, Date.now(), nextLevel, ADS_CONFIG.interstitial)) return;
  try {
    if (await showInterstitialAd()) gate = onInterstitialShown(gate, Date.now());
  } catch {
    // An ad problem must never get in the player's way.
  }
}
