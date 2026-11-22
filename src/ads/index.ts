// The ad SERVICE the rest of the app talks to. Screens never touch the AdMob SDK directly.
//
//   screens -> requestRewardedAd() / maybeShowInterstitial()   (this file: policy + single-flight)
//                -> adsImpl (native AdMob)  or  adsImpl.web (simulation)
//
// Guarantees: one ad request at a time; typed results; a reward is only ever reported as 'earned'
// when the SDK's own reward callback fired; and an ad problem can never block or crash the game.
import { ADS_CONFIG } from './config';
import { getSessionStart, showInterstitialAd, showRewardedAd, waitForRewarded } from './adsImpl';
import { canShowInterstitial, newGate, onInterstitialShown, onPuzzleCompleted, type InterstitialGate } from './policy';
import { getAdsState, setAdsState } from './store';
import type { InterstitialStatus, RewardedStatus } from './types';

export { initAds } from './adsImpl';
export { useAdsState, getAdsState } from './store';
export { BannerSlot } from './BannerSlot';
export { AdOverlay } from './AdOverlay';
export type { InterstitialStatus, RewardedStatus } from './types';

// ---- single-flight: at most one ad request in progress ----------------------------------------

let inFlight = false;

async function exclusive<T>(busyValue: T, errorValue: T, run: () => Promise<T>): Promise<T> {
  if (inFlight) return busyValue;
  inFlight = true;
  setAdsState({ busy: true });
  try {
    return await run();
  } catch {
    // An SDK problem must never get in the player's way.
    return errorValue;
  } finally {
    inFlight = false;
    setAdsState({ busy: false });
  }
}

/**
 * Ask the player to watch a rewarded ad. Waits briefly for one to load, shows it, and reports what
 * happened. ONLY the 'earned' status may be turned into a reward by the caller.
 */
export function requestRewardedAd(): Promise<RewardedStatus> {
  return exclusive<RewardedStatus>('busy', 'failed', async () => {
    if (!getAdsState().enabled) return 'unavailable';
    const ready = await waitForRewarded(ADS_CONFIG.rewarded.loadTimeoutMs);
    if (ready !== 'ready') return ready; // 'unavailable' (load failed/offline) or 'timeout' (too slow)
    const outcome = await showRewardedAd(ADS_CONFIG.rewarded.showTimeoutMs);
    return outcome;
  });
}

// ---- interstitials ----------------------------------------------------------------------------

// Session-only: the gate resets every time the app starts, which only makes ads rarer.
let gate: InterstitialGate = newGate(ADS_CONFIG.interstitial);

/** Call whenever the player finishes a puzzle. (Restarts, replays and abandoned puzzles don't count.) */
export function notePuzzleCompleted() {
  gate = onPuzzleCompleted(gate);
}

/** Is a between-puzzles ad currently allowed? (Exposed for tests/analytics; no side effects.) */
export const interstitialAllowed = (nextLevel: number, now = Date.now()) =>
  getAdsState().enabled && canShowInterstitial(gate, now, nextLevel, ADS_CONFIG.interstitial, getSessionStart());

/**
 * At a natural break (the player tapped Continue after finishing a puzzle): show a full-screen ad
 * only if the frequency rules allow it and one is ready. Always resolves quickly and never blocks
 * the game; the caller simply carries on afterwards. `nextLevel` is the level about to start (use a
 * big number for quick play / daily challenge).
 */
export async function maybeShowInterstitial(nextLevel: number): Promise<InterstitialStatus> {
  if (!interstitialAllowed(nextLevel)) return 'unavailable';
  const status = await exclusive<InterstitialStatus>('busy', 'failed', async () => {
    const outcome = await showInterstitialAd(ADS_CONFIG.interstitial.showTimeoutMs);
    return outcome === 'closed' ? 'shown' : outcome === 'earned' ? 'shown' : outcome;
  });
  // Only an ad that really appeared resets the schedule; a failed/unavailable one keeps its place.
  if (status === 'shown') gate = onInterstitialShown(gate, Date.now(), ADS_CONFIG.interstitial);
  return status;
}
