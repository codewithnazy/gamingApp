// Level progression for Word Search. Pure logic (no React / Expo) so it is easy to test.
import { ALL_DIRS, generatePuzzleFromSpec, type Dir, type Puzzle } from './engine.ts';
import { THEMES, type WordTheme } from './themes.ts';

export const MAX_LEVELS = 30;

export interface LevelConfig {
  level: number;
  theme: WordTheme;
  size: number;
  wordCount: number;
  dirs: Dir[];
  minLen: number;
  maxLen: number;
  /** Fixed per level, so a level is the same puzzle every time you play it. */
  seed: number;
  tier: 'Warm-up' | 'Diagonals' | 'Backwards' | 'Expert';
  tierBlurb: string;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/**
 * Difficulty ramps up with the level:
 *  - grid grows 6x6 -> 12x12 (a size step every 3 levels)
 *  - words grow 4 -> 12 (one more every 2 levels)
 *  - directions: across/down -> diagonals -> every direction (backwards)
 *  - expert levels (20+) only use longer words
 */
export function levelConfig(level: number): LevelConfig {
  const lv = clamp(Math.floor(level) || 1, 1, MAX_LEVELS);
  const size = Math.min(12, 6 + Math.floor((lv - 1) / 3));
  const wordCount = Math.min(12, 4 + Math.floor((lv - 1) / 2));

  let tier: LevelConfig['tier'];
  let tierBlurb: string;
  let dirs: Dir[];
  if (lv <= 4) {
    tier = 'Warm-up';
    tierBlurb = 'Across and down';
    dirs = [
      [0, 1],
      [1, 0],
    ];
  } else if (lv <= 9) {
    tier = 'Diagonals';
    tierBlurb = 'Words can run diagonally';
    dirs = [
      [0, 1],
      [1, 0],
      [1, 1],
      [-1, 1],
    ];
  } else if (lv <= 19) {
    tier = 'Backwards';
    tierBlurb = 'Every direction, even backwards';
    dirs = ALL_DIRS;
  } else {
    tier = 'Expert';
    tierBlurb = 'Long words, every direction';
    dirs = ALL_DIRS;
  }

  return {
    level: lv,
    theme: THEMES[(lv - 1) % THEMES.length],
    size,
    wordCount,
    dirs,
    minLen: lv >= 20 ? 6 : lv >= 10 ? 5 : 4,
    maxLen: Math.min(8, size),
    seed: 1000 + lv * 7919,
    tier,
    tierBlurb,
  };
}

export function generateLevelPuzzle(level: number): Puzzle {
  const c = levelConfig(level);
  return generatePuzzleFromSpec({
    pool: c.theme.words,
    size: c.size,
    wordCount: c.wordCount,
    dirs: c.dirs,
    minLen: c.minLen,
    maxLen: c.maxLen,
    seed: c.seed,
  });
}

// ---- Progress ---------------------------------------------------------------

export interface LevelProgress {
  /** Highest level the player may play (1-based). */
  unlocked: number;
  /** Best star rating per level (keys are level numbers as strings, as JSON requires). */
  stars: Record<string, 1 | 2 | 3>;
  /** Best time in seconds per level. */
  best: Record<string, number>;
}

export const EMPTY_PROGRESS: LevelProgress = { unlocked: 1, stars: {}, best: {} };

export interface LevelResult {
  progress: LevelProgress;
  /** The next level was locked before and is open now. */
  newlyUnlocked: boolean;
  newBest: boolean;
  newStars: boolean;
}

/** Fold a completed level into the progress. Ignores levels that are still locked. */
export function recordLevelResult(
  progress: LevelProgress,
  level: number,
  stars: 1 | 2 | 3,
  seconds: number | null,
): LevelResult {
  if (level < 1 || level > MAX_LEVELS || level > progress.unlocked) {
    return { progress, newlyUnlocked: false, newBest: false, newStars: false };
  }
  const key = String(level);
  const prevStars = progress.stars[key] ?? 0;
  const prevBest = progress.best[key];
  const unlocked = Math.min(MAX_LEVELS, Math.max(progress.unlocked, level + 1));

  const newStars = stars > prevStars;
  const newBest = seconds !== null && (prevBest === undefined || seconds < prevBest);
  return {
    progress: {
      unlocked,
      stars: { ...progress.stars, [key]: newStars ? stars : (prevStars as 1 | 2 | 3) },
      best: newBest ? { ...progress.best, [key]: seconds } : progress.best,
    },
    newlyUnlocked: unlocked > progress.unlocked,
    newBest,
    newStars,
  };
}

/** Validate saved data; never trust storage. */
export function sanitizeProgress(raw: unknown): LevelProgress {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const unlocked =
    typeof r.unlocked === 'number' && Number.isFinite(r.unlocked)
      ? clamp(Math.floor(r.unlocked), 1, MAX_LEVELS)
      : 1;
  const stars: LevelProgress['stars'] = {};
  const best: LevelProgress['best'] = {};
  if (r.stars && typeof r.stars === 'object') {
    for (const [k, v] of Object.entries(r.stars as Record<string, unknown>)) {
      const lv = Number(k);
      if (Number.isInteger(lv) && lv >= 1 && lv <= MAX_LEVELS && (v === 1 || v === 2 || v === 3)) stars[k] = v;
    }
  }
  if (r.best && typeof r.best === 'object') {
    for (const [k, v] of Object.entries(r.best as Record<string, unknown>)) {
      const lv = Number(k);
      if (Number.isInteger(lv) && lv >= 1 && lv <= MAX_LEVELS && typeof v === 'number' && v >= 0) best[k] = v;
    }
  }
  return { unlocked, stars, best };
}

export const totalStars = (p: LevelProgress) => Object.values(p.stars).reduce<number>((a, s) => a + s, 0);
