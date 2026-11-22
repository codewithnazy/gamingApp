// Real ads via Google AdMob (react-native-google-mobile-ads). Native builds only.
//
// This file is deliberately defensive: Expo Go does not include the AdMob native module, so the
// package is loaded inside try/catch and everything quietly turns into "no ads" if it is missing,
// if consent does not allow ads, or if anything fails. The game never depends on an ad.
import { Platform } from 'react-native';
import { ADS_CONFIG } from './config';
import { getAdsState, setAdsState, subscribeAds } from './store';
import type { FullscreenOutcome } from './types';
import { configuredUnits, resolveUnit, type ResolvedUnit } from './units';

type AdsLib = typeof import('react-native-google-mobile-ads');

let lib: AdsLib | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  lib = require('react-native-google-mobile-ads') as AdsLib;
} catch {
  lib = null; // e.g. Expo Go
}

const platform = Platform.OS === 'ios' ? 'ios' : 'android';

/** The ad unit to use for a placement (test ads in dev or until real IDs are configured). */
export function getUnit(kind: 'banner' | 'interstitial' | 'rewarded'): ResolvedUnit | null {
  if (!lib) return null;
  const testIds = { banner: lib.TestIds.ADAPTIVE_BANNER, interstitial: lib.TestIds.INTERSTITIAL, rewarded: lib.TestIds.REWARDED };
  return resolveUnit(configuredUnits(kind), platform, testIds[kind], __DEV__);
}

export const getAdsLib = () => lib;

// ---- preloaded full-screen ads ----------------------------------------------------------------

type RewardedAdInstance = ReturnType<AdsLib['RewardedAd']['createForAdRequest']>;
type InterstitialAdInstance = ReturnType<AdsLib['InterstitialAd']['createForAdRequest']>;
type Fullscreen = RewardedAdInstance | InterstitialAdInstance;

let rewarded: RewardedAdInstance | null = null;
let rewardedLoaded = false;
let interstitial: InterstitialAdInstance | null = null;
let interstitialLoaded = false;
let rewardedFails = 0;
let interstitialFails = 0;
let rewardedLoading = false;
/** Notified with true when a rewarded ad loads, false when loading fails (offline, no fill, ...). */
const rewardedLoadListeners = new Set<(ok: boolean) => void>();
let rewardedRetry: ReturnType<typeof setTimeout> | null = null;
let interstitialRetry: ReturnType<typeof setTimeout> | null = null;

/** When this app session began (for the interstitial start-up grace period). */
const SESSION_STARTED_AT = Date.now();
export const getSessionStart = () => SESSION_STARTED_AT;

// Retry failed loads with a growing delay (15s, 30s, ... capped at 5 min) so a dead network or an
// empty ad inventory never spams requests.
const retryDelay = (fails: number) => Math.min(300_000, 15_000 * 2 ** Math.max(0, fails - 1));

function loadRewarded() {
  if (!lib || rewardedLoading) return;
  const unit = getUnit('rewarded');
  if (!unit) return;
  if (rewardedRetry) {
    clearTimeout(rewardedRetry);
    rewardedRetry = null;
  }
  const ad = lib.RewardedAd.createForAdRequest(unit.id);
  rewarded = ad;
  rewardedLoaded = false;
  rewardedLoading = true;
  setAdsState({ rewardedReady: false });

  ad.addAdEventListener(lib.RewardedAdEventType.LOADED, () => {
    rewardedFails = 0;
    rewardedLoading = false;
    rewardedLoaded = true;
    setAdsState({ rewardedReady: true });
    rewardedLoadListeners.forEach((l) => l(true));
  });
  ad.addAdEventListener(lib.AdEventType.ERROR, () => {
    // Fired for load failures (offline, no fill, ...). Show-time errors are handled in showFullscreen.
    if (!rewardedLoading) return;
    rewardedLoading = false;
    rewardedLoaded = false;
    setAdsState({ rewardedReady: false });
    rewardedFails++;
    rewardedRetry = setTimeout(loadRewarded, retryDelay(rewardedFails));
    rewardedLoadListeners.forEach((l) => l(false));
  });
  ad.addAdEventListener(lib.AdEventType.CLOSED, () => {
    rewardedLoaded = false;
    setAdsState({ rewardedReady: false });
    loadRewarded(); // preload the next one
  });
  ad.load();
}

function loadInterstitial() {
  if (!lib) return;
  const unit = getUnit('interstitial');
  if (!unit) return;
  if (interstitialRetry) {
    clearTimeout(interstitialRetry);
    interstitialRetry = null;
  }
  const ad = lib.InterstitialAd.createForAdRequest(unit.id);
  interstitial = ad;
  interstitialLoaded = false;

  ad.addAdEventListener(lib.AdEventType.LOADED, () => {
    interstitialFails = 0;
    interstitialLoaded = true;
  });
  ad.addAdEventListener(lib.AdEventType.ERROR, () => {
    interstitialLoaded = false;
    interstitialFails++;
    interstitialRetry = setTimeout(loadInterstitial, retryDelay(interstitialFails));
  });
  ad.addAdEventListener(lib.AdEventType.CLOSED, () => {
    interstitialLoaded = false;
    loadInterstitial();
  });
  ad.load();
}

// ---- public API -------------------------------------------------------------------------------

let initPromise: Promise<void> | null = null;

/**
 * Start ads: show Google's consent form where the law requires it (EU/UK/etc.), configure the
 * request, initialise the SDK, then preload ads. Safe to call more than once. Never throws.
 */
export function initAds(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    if (!ADS_CONFIG.enabled || !lib || Platform.OS === 'web') return;
    try {
      // 1. Consent (UMP). The form only appears for users who need it.
      let canRequestAds = true;
      try {
        let info = await lib.AdsConsent.requestInfoUpdate();
        if (info.isConsentFormAvailable) info = await lib.AdsConsent.loadAndShowConsentFormIfRequired();
        canRequestAds = info.canRequestAds;
      } catch {
        // If the consent check itself fails, fall back to what Google last stored.
        try {
          canRequestAds = (await lib.AdsConsent.getConsentInfo()).canRequestAds;
        } catch {
          canRequestAds = false;
        }
      }
      if (!canRequestAds) return; // no consent -> no ads, and the game carries on

      // 2. Request configuration, then start the SDK.
      const ratings = lib.MaxAdContentRating;
      await lib.default().setRequestConfiguration({
        maxAdContentRating: ratings[ADS_CONFIG.maxAdContentRating],
        tagForChildDirectedTreatment: ADS_CONFIG.tagForChildDirectedTreatment,
        testDeviceIdentifiers: ADS_CONFIG.testDeviceIds,
      });
      await lib.default().initialize();

      setAdsState({ enabled: true });
      loadRewarded();
      loadInterstitial();
    } catch {
      setAdsState({ enabled: false });
    }
  })();
  return initPromise;
}

/**
 * Wait (up to `timeoutMs`) for a rewarded ad to be ready.
 *  - 'ready':       an ad is loaded
 *  - 'unavailable': the SDK reported that loading failed (offline / no fill) - no point waiting
 *  - 'timeout':     still loading when the time ran out
 */
export function waitForRewarded(timeoutMs: number): Promise<'ready' | 'unavailable' | 'timeout'> {
  if (rewardedLoaded) return Promise.resolve('ready');
  if (!getAdsState().enabled || !lib) return Promise.resolve('unavailable');
  if (!rewardedLoading) loadRewarded(); // not loading (e.g. waiting on retry back-off): try now
  return new Promise((resolve) => {
    const finish = (r: 'ready' | 'unavailable' | 'timeout') => {
      clearTimeout(timer);
      rewardedLoadListeners.delete(onResult);
      resolve(r);
    };
    const onResult = (ok: boolean) => finish(ok ? 'ready' : 'unavailable');
    const timer = setTimeout(() => finish('timeout'), timeoutMs);
    rewardedLoadListeners.add(onResult);
  });
}

/**
 * Show a loaded full-screen ad and wait for the result.
 *  - never opened within `openTimeoutMs`  -> 'timeout'
 *  - SDK error / show() rejected          -> 'failed'
 *  - opened and closed                    -> 'earned' if the reward callback fired, else 'closed'
 */
function showFullscreen(ad: Fullscreen, openTimeoutMs: number): Promise<FullscreenOutcome> {
  const l = lib;
  if (!l) return Promise.resolve('failed');
  const a = ad as RewardedAdInstance; // same listener API on both ad types
  return new Promise((resolve) => {
    let earned = false;
    let opened = false;
    let settled = false;
    const offs: (() => void)[] = [];
    const settle = (outcome: FullscreenOutcome) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      offs.forEach((off) => off());
      resolve(outcome);
    };
    const timer = setTimeout(() => settle(opened ? 'closed' : 'timeout'), openTimeoutMs);

    offs.push(
      a.addAdEventListener(l.AdEventType.OPENED, () => {
        opened = true;
        clearTimeout(timer); // once it is open the player is watching; no more timeout
      }),
      a.addAdEventListener(l.RewardedAdEventType.EARNED_REWARD, () => {
        earned = true; // the ONLY place a reward is ever recorded
      }),
      a.addAdEventListener(l.AdEventType.CLOSED, () => settle(earned ? 'earned' : 'closed')),
      a.addAdEventListener(l.AdEventType.ERROR, () => settle('failed')),
    );
    ad.show().catch(() => settle('failed'));
  });
}

/** Show the loaded rewarded ad. Callers must go through requestRewardedAd (single-flight). */
export async function showRewardedAd(openTimeoutMs: number): Promise<FullscreenOutcome | 'unavailable'> {
  if (!rewarded || !rewardedLoaded) return 'unavailable';
  return showFullscreen(rewarded, openTimeoutMs);
}

/** Show the loaded interstitial. Callers must go through maybeShowInterstitial (single-flight). */
export async function showInterstitialAd(openTimeoutMs: number): Promise<FullscreenOutcome | 'unavailable'> {
  if (!interstitial || !interstitialLoaded) return 'unavailable';
  return showFullscreen(interstitial, openTimeoutMs);
}
