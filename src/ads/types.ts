// Typed outcomes for every ad request, so callers (and tests) never have to guess what happened.

/**
 * Rewarded ad outcome.
 *  - earned:      the SDK's reward callback fired - the ONLY status that may pay a reward
 *  - closed:      the ad was shown but closed early / without the reward
 *  - unavailable: ads are off, blocked by consent, or no ad could be loaded
 *  - timeout:     the ad took too long to load or to open
 *  - failed:      the SDK reported an error
 *  - busy:        another ad request is already in progress (ignored, never queued)
 */
export type RewardedStatus = 'earned' | 'closed' | 'unavailable' | 'timeout' | 'failed' | 'busy';

/** Interstitial outcome. `shown` means it really appeared and was closed. */
export type InterstitialStatus = 'shown' | 'unavailable' | 'timeout' | 'failed' | 'busy';

/** What the full-screen helper reports before the public API maps it. */
export type FullscreenOutcome = 'earned' | 'closed' | 'timeout' | 'failed';
