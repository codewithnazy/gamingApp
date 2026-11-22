import type { AnalyticsProvider } from './core';

type FirebaseAnalytics = () => {
  logEvent(name: string, params?: Record<string, unknown>): Promise<void>;
  setAnalyticsCollectionEnabled(enabled: boolean): Promise<void>;
};

/**
 * Firebase Analytics adapter. The Firebase packages are OPTIONAL: they are loaded defensively, so
 * the app builds and runs without them (events then simply don't leave the device). To switch it
 * on, follow docs/ANALYTICS.md (install @react-native-firebase/app + /analytics, add your
 * google-services.json, rebuild with EAS). Returns null when Firebase isn't available.
 */
export function createFirebaseProvider(): AnalyticsProvider | null {
  let analytics: FirebaseAnalytics | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@react-native-firebase/analytics');
    analytics = (mod?.default ?? mod) as FirebaseAnalytics;
    if (typeof analytics !== 'function') analytics = null;
  } catch {
    analytics = null; // not installed (e.g. Expo Go, or Firebase not set up yet)
  }
  if (!analytics) return null;
  const fb = analytics;
  return {
    name: 'firebase',
    log: (name, params) => {
      fb().logEvent(name, params).catch(() => {});
    },
    setEnabled: (enabled) => {
      fb().setAnalyticsCollectionEnabled(enabled).catch(() => {});
    },
  };
}
