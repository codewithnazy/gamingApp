import type { AdKind, UnitIds } from './config.ts';
import { ADS_CONFIG } from './config.ts';

/** AdMob ad unit IDs look like ca-app-pub-1234567890123456/1234567890. */
export const UNIT_ID_PATTERN = /^ca-app-pub-\d{16}\/\d{10}$/;
export const isValidUnitId = (id: string | null | undefined): id is string =>
  typeof id === 'string' && UNIT_ID_PATTERN.test(id);

export interface ResolvedUnit {
  id: string;
  /** True when this is Google's test ad (earns nothing, always safe). */
  isTest: boolean;
}

/**
 * Pick the ad unit to request. Test ads are used whenever the app is running in development, or
 * when no valid real ID has been configured - so a missing/mistyped ID can never be mistaken for a
 * live ad, and development builds can never generate invalid traffic on your real units.
 */
export function resolveUnit(
  configured: UnitIds,
  platform: 'android' | 'ios',
  testId: string,
  isDev: boolean,
): ResolvedUnit {
  const real = configured[platform];
  if (isDev || !isValidUnitId(real)) return { id: testId, isTest: true };
  return { id: real, isTest: false };
}

export const configuredUnits = (kind: AdKind): UnitIds => ADS_CONFIG.units[kind];
