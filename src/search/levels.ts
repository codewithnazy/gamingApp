// Level progression for Word Search. Pure logic (no React / Expo) so it is easy to test.
import { ALL_DIRS, generatePuzzleFromSpec, type Dir, type Puzzle } from './engine.ts';
import { THEMES, type WordTheme } from './themes.ts';

export const MAX_LEVELS = 500;
export const WORLD_SIZE = 20;
export const WORLD_COUNT = MAX_LEVELS / WORLD_SIZE; // 25

export interface World {
  number: number; // 1-based
  name: string;
  emoji: string;
  firstLevel: number;
  lastLevel: number;
}

const WORLD_NAMES: [string, string][] = [
  ['Meadow Start', '🌼'],
  ['Sunny Shores', '🏖️'],
  ['Whisper Woods', '🌲'],
  ['Crystal Caves', '💎'],
  ['Cloud Kingdom', '☁️'],
  ['Desert Dunes', '🏜️'],
  ['Frosty Peaks', '🏔️'],
  ['Coral Reef', '🐠'],
  ['Jungle Run', '🦜'],
  ['Volcano Rim', '🌋'],
  ['Starlight City', '🌃'],
  ['Pirate Bay', '🏴‍☠️'],
  ['Enchanted Garden', '🧚'],
  ['Thunder Plains', '⚡'],
  ['Mystic Temple', '🛕'],
  ['Neon Streets', '🌆'],
  ['Dragon Isles', '🐉'],
  ['Sky Harbor', '⛵'],
  ['Midnight Market', '🏮'],
  ['Ancient Ruins', '🗿'],
  ['Candy Canyon', '🍭'],
  ['Moonlit Lake', '🌙'],
  ['Clockwork Town', '⚙️'],
  ['Aurora Fields', '🌌'],
  ['Grand Summit', '👑'],
];

export const worldOf = (level: number): number =>
  Math.min(WORLD_COUNT, Math.max(1, Math.ceil(level / WORLD_SIZE)));

export function getWorld(n: number): World {
  const number = Math.min(WORLD_COUNT, Math.max(1, Math.floor(n) || 1));
  const [name, emoji] = WORLD_NAMES[number - 1];
  return {
    number,
    name,
    emoji,
    firstLevel: (number - 1) * WORLD_SIZE + 1,
    lastLevel: number * WORLD_SIZE,
  };
}

export type Tier = 'Warm-up' | 'Diagonals' | 'Backwards' | 'Expert' | 'Master' | 'Legend';

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
  /** 0..1 share of filler letters borrowed from the hidden words (look-alike traps). */
  decoy: number;
  /** Mystery level: the word list is hidden (only first letters shown). */
  mystery: boolean;
  tier: Tier;
  tierBlurb: string;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/**
 * Difficulty ramps up with the level, using a different lever in each phase:
 *  - levels 1-19:   grid grows 6x6 -> 12x12, words 4 -> 12, directions widen
 *                   (across/down -> diagonals -> every direction)
 *  - levels 20-59:  full 12x12 grids; the word count keeps climbing
 *  - levels 60-199: decoy filler letters make false starts likelier; words up to 10 letters
 *  - levels 200+:   maximum decoys
 *  - from level 30, every 10th level is a Mystery level (word list hidden)
 * The word count tops out at 16.
 */
export function levelConfig(level: number): LevelConfig {
  const lv = clamp(Math.floor(level) || 1, 1, MAX_LEVELS);
  const size = Math.min(12, 6 + Math.floor((lv - 1) / 3));
  const wordCount = lv <= 17 ? 4 + Math.floor((lv - 1) / 2) : Math.min(16, 12 + Math.floor((lv - 17) / 25));
  const decoy = clamp((lv - 20) / 240, 0, 0.75);

  let tier: Tier;
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
  } else if (lv <= 59) {
    tier = 'Expert';
    tierBlurb = 'Packed grids, every direction';
    dirs = ALL_DIRS;
  } else if (lv <= 199) {
    tier = 'Master';
    tierBlurb = 'Look-alike decoy letters';
    dirs = ALL_DIRS;
  } else {
    tier = 'Legend';
    tierBlurb = 'Maximum decoys';
    dirs = ALL_DIRS;
  }

  return {
    level: lv,
    theme: THEMES[(lv - 1) % THEMES.length],
    size,
    wordCount,
    dirs,
    minLen: lv >= 10 ? 5 : 4,
    maxLen: lv >= 60 ? 10 : Math.min(8, size),
    seed: 1000 + lv * 7919,
    decoy,
    mystery: lv >= 30 && lv % 10 === 0,
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
    decoy: c.decoy,
  });
}

/** Mystery levels show only the first letter and length of each unfound word. */
export function maskWord(word: string): string {
  return word[0] + ' ' + Array(word.length - 1).fill('•').join(' ');
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
  // Progress saved by an older, shorter campaign: a completed last level now leads onward.
  let open = unlocked;
  while (open < MAX_LEVELS && stars[String(open)] !== undefined) open++;
  return { unlocked: open, stars, best };
}

export const totalStars = (p: LevelProgress) => Object.values(p.stars).reduce<number>((a, s) => a + s, 0);
