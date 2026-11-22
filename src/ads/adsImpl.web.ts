// Web preview: ads are SIMULATED (no real network ads). This exists so the whole ad experience -
// the free-hint button, the between-level ad and the banner - can be previewed and tested in a
// browser. Real ads only run in native builds (see adsImpl.ts).
import { ADS_CONFIG } from './config';
import { setAdsState } from './store';

export const SIMULATED_AD_MS = 1200;
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function initAds(): Promise<void> {
  if (!ADS_CONFIG.enabled) return;
  setAdsState({ enabled: true, rewardedReady: true });
}

export async function showRewardedAd(): Promise<boolean> {
  setAdsState({ simulating: 'rewarded' });
  await wait(SIMULATED_AD_MS);
  setAdsState({ simulating: null });
  return true;
}

export async function showInterstitialAd(): Promise<boolean> {
  setAdsState({ simulating: 'interstitial' });
  await wait(SIMULATED_AD_MS);
  setAdsState({ simulating: null });
  return true;
}
