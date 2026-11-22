// Word-search engine: pure functions, no React / Expo imports, so it is easy to test.

export interface Cell {
  row: number;
  col: number;
}

/** [dRow, dCol] */
export type Dir = readonly [number, number];

export const ALL_DIRS: Dir[] = [
  [0, 1], // →
  [1, 0], // ↓
  [1, 1], // ↘
  [-1, 1], // ↗
  [0, -1], // ←
  [-1, 0], // ↑
  [-1, -1], // ↖
  [1, -1], // ↙
];

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface DifficultyConfig {
  label: string;
  size: number;
  wordCount: number;
  dirs: Dir[];
  minLen: number;
  maxLen: number;
  blurb: string;
}

export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  easy: {
    label: 'Easy',
    size: 8,
    wordCount: 6,
    dirs: [
      [0, 1],
      [1, 0],
    ],
    minLen: 4,
    maxLen: 7,
    blurb: 'Across and down',
  },
  medium: {
    label: 'Medium',
    size: 10,
    wordCount: 8,
    dirs: [
      [0, 1],
      [1, 0],
      [1, 1],
      [-1, 1],
    ],
    minLen: 4,
    maxLen: 8,
    blurb: 'Adds diagonals',
  },
  hard: {
    label: 'Hard',
    size: 12,
    wordCount: 10,
    dirs: ALL_DIRS,
    minLen: 5,
    maxLen: 8,
    blurb: 'Every direction, even backwards',
  },
};

export interface Placement {
  word: string;
  row: number;
  col: number;
  dr: number;
  dc: number;
}

export interface Puzzle {
  size: number;
  grid: string[][];
  placements: Placement[];
}

/** Small deterministic PRNG so puzzles (and tests) are reproducible from a seed. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const reverse = (s: string) => s.split('').reverse().join('');

/**
 * Pick `count` words within the length range. Skips a word if it contains (or is
 * contained in) one already chosen, so a found word can never be ambiguous.
 */
export function pickWords(
  pool: readonly string[],
  count: number,
  minLen: number,
  maxLen: number,
  rng: () => number,
): string[] {
  const candidates = shuffle(
    [...new Set(pool)].filter((w) => w.length >= minLen && w.length <= maxLen),
    rng,
  );
  const chosen: string[] = [];
  for (const w of candidates) {
    if (chosen.length >= count) break;
    const clash = chosen.some((c) => {
      const rc = reverse(c);
      return w.includes(c) || c.includes(w) || w.includes(rc) || rc.includes(w);
    });
    if (!clash) chosen.push(w);
  }
  return chosen;
}

function tryPlace(
  grid: (string | null)[][],
  word: string,
  dirs: readonly Dir[],
  rng: () => number,
): Placement | null {
  const size = grid.length;
  const len = word.length;
  const range = (d: number): [number, number] =>
    d === 1 ? [0, size - len] : d === -1 ? [len - 1, size - 1] : [0, size - 1];

  for (let attempt = 0; attempt < 300; attempt++) {
    const [dr, dc] = dirs[Math.floor(rng() * dirs.length)];
    const [r0, r1] = range(dr);
    const [c0, c1] = range(dc);
    const row = r0 + Math.floor(rng() * (r1 - r0 + 1));
    const col = c0 + Math.floor(rng() * (c1 - c0 + 1));

    let fits = true;
    for (let i = 0; i < len; i++) {
      const cur = grid[row + dr * i][col + dc * i];
      if (cur !== null && cur !== word[i]) {
        fits = false;
        break;
      }
    }
    if (!fits) continue;
    for (let i = 0; i < len; i++) grid[row + dr * i][col + dc * i] = word[i];
    return { word, row, col, dr, dc };
  }
  return null;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function generatePuzzle(opts: {
  pool: readonly string[];
  difficulty: Difficulty;
  seed: number;
}): Puzzle {
  const cfg = DIFFICULTIES[opts.difficulty];
  let best: { grid: (string | null)[][]; placements: Placement[] } | null = null;

  for (let attempt = 0; attempt < 50; attempt++) {
    const rng = mulberry32(opts.seed + attempt * 7919);
    const words = pickWords(opts.pool, cfg.wordCount, cfg.minLen, cfg.maxLen, rng).sort(
      (a, b) => b.length - a.length,
    );
    const grid: (string | null)[][] = Array.from({ length: cfg.size }, () =>
      Array(cfg.size).fill(null),
    );
    const placements: Placement[] = [];
    for (const w of words) {
      const p = tryPlace(grid, w, cfg.dirs, rng);
      if (p) placements.push(p);
    }
    if (!best || placements.length > best.placements.length) best = { grid, placements };
    if (placements.length === words.length && words.length === cfg.wordCount) break;
  }

  const { grid, placements } = best!;
  const fillRng = mulberry32(opts.seed ^ 0x9e3779b9);
  const filled = grid.map((row) =>
    row.map((c) => c ?? ALPHABET[Math.floor(fillRng() * ALPHABET.length)]),
  );
  return { size: cfg.size, grid: filled, placements };
}

export function cellsOf(p: Placement): Cell[] {
  return Array.from({ length: p.word.length }, (_, i) => ({
    row: p.row + p.dr * i,
    col: p.col + p.dc * i,
  }));
}

// Index by round(angle / 45°); angle measured with y pointing down.
const ANGLE_DIRS: Record<number, Dir> = {
  0: [0, 1],
  1: [1, 1],
  2: [1, 0],
  3: [1, -1],
  4: [0, -1],
  [-4]: [0, -1],
  [-3]: [-1, -1],
  [-2]: [-1, 0],
  [-1]: [-1, 1],
};

/**
 * Snap a drag from `start` to the pointer cell `cur` onto the nearest straight
 * line (8 directions), clipped to the grid. Always returns at least [start].
 */
export function snapLine(start: Cell, cur: Cell, size: number): Cell[] {
  const dx = cur.col - start.col;
  const dy = cur.row - start.row;
  if (dx === 0 && dy === 0) return [start];

  const [dr, dc] = ANGLE_DIRS[Math.round(Math.atan2(dy, dx) / (Math.PI / 4))];
  let steps = Math.round((dx * dc + dy * dr) / (dc * dc + dr * dr));
  steps = Math.max(0, steps);
  while (steps > 0) {
    const r = start.row + dr * steps;
    const c = start.col + dc * steps;
    if (r >= 0 && r < size && c >= 0 && c < size) break;
    steps--;
  }
  return Array.from({ length: steps + 1 }, (_, i) => ({
    row: start.row + dr * i,
    col: start.col + dc * i,
  }));
}

export function wordFromCells(grid: string[][], cells: Cell[]): string {
  return cells.map((c) => grid[c.row][c.col]).join('');
}

/** Returns the remaining word matched by the selection (either direction), or null. */
export function matchWord(grid: string[][], cells: Cell[], remaining: readonly string[]): string | null {
  if (cells.length < 2) return null;
  const s = wordFromCells(grid, cells);
  const r = reverse(s);
  return remaining.find((w) => w === s || w === r) ?? null;
}

/** 3 stars with no hints, 2 with up to two, otherwise 1. */
export function starsFor(hintsUsed: number): 1 | 2 | 3 {
  return hintsUsed === 0 ? 3 : hintsUsed <= 2 ? 2 : 1;
}

export function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
