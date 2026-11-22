// The daily play streak: PURE rules over dates ("YYYY-MM-DD"), no clock access inside.
import type { DateKey, StreakState } from '../economy/ledger.ts';

/** Streak lengths that get a small celebration. */
export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 365] as const;

const pad = (n: number) => String(n).padStart(2, '0');

/** The calendar day before `key` (handles month and year boundaries). */
export function previousDay(key: DateKey): DateKey {
  const [y, m, d] = key.split('-').map(Number);
  const t = new Date(y, m - 1, d - 1);
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
}

export interface StreakUpdate {
  state: StreakState;
  /** The streak changed (false when today was already counted). */
  changed: boolean;
  /** Set when this update reached a milestone length. */
  milestone: number | null;
}

/**
 * Record that the player finished a puzzle on `today`. Rules:
 *  - already counted today            -> nothing changes (safe to call on every completion)
 *  - last counted day was yesterday   -> streak + 1
 *  - first time, or a day (or more) was missed -> streak restarts at 1
 *  - `today` is BEFORE the last counted day (device clock moved back) -> ignored, never resets
 * The best-ever streak is tracked separately.
 */
export function recordPlay(streak: StreakState, today: DateKey): StreakUpdate {
  if (streak.lastDate !== null) {
    if (today === streak.lastDate) return { state: streak, changed: false, milestone: null };
    if (today < streak.lastDate) return { state: streak, changed: false, milestone: null };
  }
  const continues = streak.lastDate !== null && streak.lastDate === previousDay(today);
  const current = continues ? streak.current + 1 : 1;
  const state: StreakState = { current, best: Math.max(streak.best, current), lastDate: today };
  const milestone = (STREAK_MILESTONES as readonly number[]).includes(current) ? current : null;
  return { state, changed: true, milestone };
}

/**
 * The streak to DISPLAY on `today`: still alive if the last counted day was today or yesterday,
 * otherwise 0 (it has lapsed; the next completed puzzle starts a new one).
 */
export function displayStreak(streak: StreakState, today: DateKey): number {
  if (streak.lastDate === null) return 0;
  return streak.lastDate === today || streak.lastDate === previousDay(today) ? streak.current : 0;
}

/** True when the streak is alive but today's puzzle hasn't been finished yet ("keep it going!"). */
export const streakAtRisk = (streak: StreakState, today: DateKey): boolean =>
  streak.current > 0 && streak.lastDate === previousDay(today);
