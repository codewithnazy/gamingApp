// The Daily Challenge puzzle: the SAME puzzle for everyone on the same calendar date.
// Uses the existing word-search generator; only the seed and the spec come from the date.
import { ALL_DIRS, generatePuzzleFromSpec, type Puzzle } from '../search/engine.ts';
import { ALL_WORDS } from '../search/themes.ts';
import type { DateKey } from '../economy/ledger.ts';

/** FNV-1a: tiny deterministic string hash (same one the Heist daily word uses). */
export function hashString(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export const dailySeed = (date: DateKey): number => hashString(`daily-challenge:${date}`);

const isWeekend = (date: DateKey): boolean => {
  const [y, m, d] = date.split('-').map(Number);
  const day = new Date(y, m - 1, d).getDay();
  return day === 0 || day === 6;
};

export interface DailySpec {
  size: number;
  wordCount: number;
  label: string;
}

/** Weekdays: 10x10 with 9 words. Weekends: a bigger 12x12 with 12 words. */
export function dailySpec(date: DateKey): DailySpec {
  return isWeekend(date)
    ? { size: 12, wordCount: 12, label: 'Weekend challenge' }
    : { size: 10, wordCount: 9, label: 'Daily challenge' };
}

export function generateDailyPuzzle(date: DateKey): Puzzle {
  const spec = dailySpec(date);
  return generatePuzzleFromSpec({
    pool: ALL_WORDS,
    size: spec.size,
    wordCount: spec.wordCount,
    dirs: ALL_DIRS,
    minLen: 5,
    maxLen: spec.size === 12 ? 10 : 8,
    seed: dailySeed(date),
    decoy: isWeekend(date) ? 0.3 : 0.15,
  });
}
