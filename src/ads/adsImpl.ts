// Real ads via Google AdMob (react-native-google-mobile-ads). Native builds only.
//
// This file is deliberately defensive: Expo Go does not include the AdMob native module, so the
// package is loaded inside try/catch and everything quietly turns into "no ads" if it is missing,
// if consent does not allow ads, or if anything fails. The game never depends on an ad.
import { Platform } from 'react-native';
import { ADS_CONFIG } from './config';
import { setAdsState } from './store';
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

// Retry failed loads with a growing delay (15s, 30s, ... capped at 5 min) so a dead network or an
// empty ad inventory never spams requests.
const retryDelay = (fails: number) => Math.min(300_000, 15_000 * 2 ** Math.max(0, fails - 1));

function loadRewarded() {
  if (!lib) return;
  const unit = getUnit('rewarded');
  if (!unit) return;
  const ad = lib.RewardedAd.createForAdRequest(unit.id);
  rewarded = ad;
  rewardedLoaded = false;
  setAdsState({ rewardedReady: false });

  ad.addAdEventListener(lib.RewardedAdEventType.LOADED, () => {
    rewardedFails = 0;
    rewardedLoaded = true;
    setAdsState({ rewardedReady: true });
  });
  ad.addAdEventListener(lib.AdEventType.ERROR, () => {
    rewardedLoaded = false;
    setAdsState({ rewardedReady: false });
    rewardedFails++;
    setTimeout(loadRewarded, retryDelay(rewardedFails));
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
    setTimeout(loadInterstitial, retryDelay(interstitialFails));
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

/** Wait for a loaded full-screen ad to be shown and closed. Resolves with whether it appeared. */
function showFullscreen(ad: Fullscreen, onShown?: () => void): Promise<{ shown: boolean; earned: boolean }> {
  const l = lib;
  if (!l) return Promise.resolve({ shown: false, earned: false });
  return new Promise((resolve) => {
    let earned = false;
    let shown = false;
    const offs: (() => void)[] = [];
    const done = () => {
      offs.forEach((off) => off());
      resolve({ shown, earned });
    };
    offs.push(
      (ad as RewardedAdInstance).addAdEventListener(l.AdEventType.OPENED, () => {
        shown = true;
        onShown?.();
      }),
      (ad as RewardedAdInstance).addAdEventListener(l.AdEventType.CLOSED, done),
      (ad as RewardedAdInstance).addAdEventListener(l.RewardedAdEventType.EARNED_REWARD, () => {
        earned = true;
      }),
    );
    ad.show().catch(done);
  });
}

/** Show the rewarded video. Resolves true only if the player watched enough to earn the reward. */
export async function showRewardedAd(): Promise<boolean> {
  if (!rewarded || !rewardedLoaded) return false;
  const { earned } = await showFullscreen(rewarded);
  return earned;
}

/** Show an interstitial if one is ready. Resolves true if it was actually shown. */
export async function showInterstitialAd(): Promise<boolean> {
  if (!interstitial || !interstitialLoaded) return false;
  const { shown } = await showFullscreen(interstitial);
  return shown;
}
