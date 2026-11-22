import { Platform } from 'react-native';
import { ANALYTICS_CONFIG } from './config';
import { createAnalytics, type AnalyticsProvider } from './core';
import type { AnalyticsEvents, EventName } from './events';
import { createFirebaseProvider } from './firebase';

export type { AnalyticsEvents, EventName } from './events';

const providers: AnalyticsProvider[] = [];

if (ANALYTICS_CONFIG.enabled) {
  if (__DEV__) {
    providers.push({
      name: 'console',
      log: (name, params) => console.debug('[analytics]', name, params),
      setEnabled: () => {},
    });
  }
  if (ANALYTICS_CONFIG.firebase) {
    const fb = createFirebaseProvider();
    if (fb) providers.push(fb);
  }
}

const analytics = createAnalytics({
  providers,
  // The browser preview has no consent flow and sends nothing anywhere; on phones the consent
  // result arrives from the ad consent form (see src/ads/adsImpl.ts).
  initialConsent: Platform.OS === 'web' ? 'granted' : 'unknown',
});

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  // Web preview only: lets tests (and you, in the browser console) inspect what would be sent.
  (window as unknown as { __analyticsEvents: () => unknown }).__analyticsEvents = () => analytics.getRecent();
}

/**
 * Record an analytics event. Fully safe: never throws, never blocks, and sends nothing unless the
 * player has not opted out and consent is granted. Event names and params are type-checked against
 * the catalogue in events.ts.
 */
export function track<E extends EventName>(name: E, params: AnalyticsEvents[E]): void {
  if (!ANALYTICS_CONFIG.enabled) return;
  analytics.track(name, params);
}

/** The player's "share anonymous usage stats" switch (Settings). */
export const setAnalyticsOptIn = (optIn: boolean) => analytics.setUserOptIn(optIn);

/** The result of the consent flow. Events are held until this is known, then sent or discarded. */
export const setAnalyticsConsent = (granted: boolean) => analytics.setConsent(granted);

export const getRecentAnalyticsEvents = () => analytics.getRecent();
