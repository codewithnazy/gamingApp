import { useSyncExternalStore } from 'react';

export interface AdsState {
  /** The ad SDK started successfully and the user's consent allows requesting ads. */
  enabled: boolean;
  /** A rewarded video is loaded and can be shown right now. */
  rewardedReady: boolean;
  /** Web preview only: which simulated ad is "playing". */
  simulating: 'rewarded' | 'interstitial' | null;
}

let state: AdsState = { enabled: false, rewardedReady: false, simulating: null };
const listeners = new Set<() => void>();

export const getAdsState = () => state;

export function setAdsState(patch: Partial<AdsState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function subscribeAds(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** React hook: re-renders when ad availability changes. */
export const useAdsState = () => useSyncExternalStore(subscribeAds, getAdsState, getAdsState);
