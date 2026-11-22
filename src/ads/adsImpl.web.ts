// Web preview: ads are SIMULATED (no real network ads). This lets the whole ad experience - hints,
// free coins, the between-levels ad, the banner, and every failure mode - be previewed and tested
// in a browser. Real ads only run in native builds (see adsImpl.ts).
//
// Test modes, chosen by URL query (web only):
//   ?ads=ok (default)  ads work and the reward is earned
//   ?ads=early         the player closes the rewarded ad early (no reward)
//   ?ads=fail          the ad SDK reports an error when showing
//   ?ads=none          no ad is ever available (offline / no fill)
//   ?ads=slow          the rewarded ad takes ~2.5s to load (exercises the loading state)
//   ?adtest=1          skip the 60s start-up grace so interstitial rules can be tested quickly
import { ADS_CONFIG } from './config';
import { getAdsState, setAdsState, subscribeAds } from './store';
import type { FullscreenOutcome } from './types';

export const SIMULATED_AD_MS = 1200;
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const param = (name: string): string | null => {
  try {
    return typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get(name) : null;
  } catch {
    return null;
  }
};
const mode = param('ads') ?? 'ok';

const STARTED = param('adtest') === '1' ? 0 : Date.now();
export const getSessionStart = () => STARTED;

export async function initAds(): Promise<void> {
  if (!ADS_CONFIG.enabled) return;
  if (mode === 'none') {
    setAdsState({ enabled: true, rewardedReady: false });
    return;
  }
  if (mode === 'slow') {
    setAdsState({ enabled: true, rewardedReady: false });
    setTimeout(() => setAdsState({ rewardedReady: true }), 2500);
    return;
  }
  setAdsState({ enabled: true, rewardedReady: true });
}

export function waitForRewarded(timeoutMs: number): Promise<'ready' | 'unavailable' | 'timeout'> {
  if (getAdsState().rewardedReady) return Promise.resolve('ready');
  if (!getAdsState().enabled || mode === 'none') return Promise.resolve('unavailable');
  return new Promise((resolve) => {
    let off: (() => void) | null = null;
    const finish = (r: 'ready' | 'timeout') => {
      clearTimeout(timer);
      off?.();
      resolve(r);
    };
    const timer = setTimeout(() => finish('timeout'), timeoutMs);
    off = subscribeAds(() => {
      if (getAdsState().rewardedReady) finish('ready');
    });
  });
}

async function play(kind: 'rewarded' | 'interstitial'): Promise<void> {
  setAdsState({ simulating: kind });
  await wait(SIMULATED_AD_MS);
  setAdsState({ simulating: null });
}

export async function showRewardedAd(_openTimeoutMs: number): Promise<FullscreenOutcome | 'unavailable'> {
  if (mode === 'none' || !getAdsState().rewardedReady) return 'unavailable';
  if (mode === 'fail') return 'failed';
  await play('rewarded');
  return mode === 'early' ? 'closed' : 'earned';
}

export async function showInterstitialAd(_openTimeoutMs: number): Promise<FullscreenOutcome | 'unavailable'> {
  if (mode === 'none') return 'unavailable';
  if (mode === 'fail') return 'failed';
  await play('interstitial');
  return 'closed';
}
