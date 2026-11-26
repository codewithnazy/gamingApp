// The season calendar: PURE and clock-free (the caller passes `now`). Seasons are 7 days long,
// start on a Monday at local midnight, and are computed from the calendar alone - so they work
// offline and every player on the same date is in the same season.

export const SEASON_DAYS = 7;
const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const MIN_MS = 60_000;

/** Monday, 5 January 2026 - season 0 begins here. */
const EPOCH = { y: 2026, m: 0, d: 5 };
const EPOCH_UTC = Date.UTC(EPOCH.y, EPOCH.m, EPOCH.d);

/** Which season `now` falls in (counted in whole days, so daylight-saving shifts can't move it). */
export function seasonIndex(now: Date): number {
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.floor((today - EPOCH_UTC) / DAY_MS / SEASON_DAYS));
}

/** Local midnight at which `season` ends (= the next season begins). */
export const seasonEnd = (season: number): Date => new Date(EPOCH.y, EPOCH.m, EPOCH.d + (season + 1) * SEASON_DAYS);

export const msRemaining = (now: Date): number => Math.max(0, seasonEnd(seasonIndex(now)).getTime() - now.getTime());

/** "3D 14H", "5H 12M", "42M" or "<1M" - the countdown shown on the pass. */
export function formatRemaining(ms: number): string {
  const d = Math.floor(ms / DAY_MS);
  const h = Math.floor((ms % DAY_MS) / HOUR_MS);
  const m = Math.floor((ms % HOUR_MS) / MIN_MS);
  if (d > 0) return `${d}D ${h}H`;
  if (h > 0) return `${h}H ${m}M`;
  return m > 0 ? `${m}M` : '<1M';
}

const NAMES = ['Camp Out', 'Ocean Rush', 'Space Race', 'Garden Party', 'Snow Day', 'Jungle Trek', 'Pirate Cove', 'Candy Land'];
export const seasonName = (season: number): string => NAMES[((season % NAMES.length) + NAMES.length) % NAMES.length];
