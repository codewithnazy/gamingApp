import { ANSWERS, VALID_GUESSES } from './words.ts';

export const WORD_LENGTH = 5;
export const MAX_GUESSES = 6;
/** Points lost each time you steal a letter from the rival's board. */
export const STEAL_PENALTY = 150;
/** One steal per day keeps the heist a risk/reward choice, not a cheat code. */
export const MAX_STEALS = 1;

export type TileState = 'correct' | 'present' | 'absent';
export type GameStatus = 'playing' | 'won' | 'lost';

export interface GameState {
  /** Local date key (YYYY-MM-DD) this game belongs to. */
  date: string;
  guesses: string[];
  /** Positions (0-based) of letters stolen from the rival's board. */
  steals: number[];
  status: GameStatus;
}

export interface Stats {
  played: number;
  wins: number;
  currentStreak: number;
  maxStreak: number;
  /** distribution[i] = wins in i+1 guesses */
  distribution: number[];
  bestScore: number;
  /** Date key of the last finished game, used to continue streaks. */
  lastPlayed: string | null;
}

export const EMPTY_STATS: Stats = {
  played: 0,
  wins: 0,
  currentStreak: 0,
  maxStreak: 0,
  distribution: Array(MAX_GUESSES).fill(0),
  bestScore: 0,
  lastPlayed: null,
};

export const RIVALS = [
  'Vex',
  'Mags the Mole',
  'Dr. Cipher',
  'Silk',
  'Big Tuna',
  'Nyx',
  'Lockpick Lou',
  'The Duchess',
];

const pad = (n: number) => String(n).padStart(2, '0');

/** Local-calendar date key, e.g. "2026-11-22". */
export function dateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Day before a date key (used for streak continuity). */
export function previousDateKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return dateKey(new Date(y, m - 1, d - 1));
}

/** FNV-1a: tiny deterministic string hash so everyone gets the same daily word. */
export function hash(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function dailyAnswer(key: string): string {
  return ANSWERS[hash(`answer:${key}`) % ANSWERS.length];
}

export function dailyRival(key: string): string {
  return RIVALS[hash(`rival:${key}`) % RIVALS.length];
}

export function isValidGuess(word: string): boolean {
  return word.length === WORD_LENGTH && VALID_GUESSES.has(word.toUpperCase());
}

/** Standard two-pass evaluation so repeated letters are scored correctly. */
export function evaluateGuess(guess: string, answer: string): TileState[] {
  const result: TileState[] = Array(guess.length).fill('absent');
  const remaining: Record<string, number> = {};

  for (let i = 0; i < answer.length; i++) {
    if (guess[i] === answer[i]) {
      result[i] = 'correct';
    } else {
      remaining[answer[i]] = (remaining[answer[i]] ?? 0) + 1;
    }
  }
  for (let i = 0; i < guess.length; i++) {
    if (result[i] === 'correct') continue;
    if ((remaining[guess[i]] ?? 0) > 0) {
      result[i] = 'present';
      remaining[guess[i]]--;
    }
  }
  return result;
}

/** Best known state per letter, for coloring the on-screen keyboard. */
export function letterStates(
  guesses: string[],
  answer: string,
  steals: number[] = [],
): Record<string, TileState> {
  const rank: Record<TileState, number> = { absent: 0, present: 1, correct: 2 };
  const out: Record<string, TileState> = {};
  const bump = (letter: string, state: TileState) => {
    if (!out[letter] || rank[state] > rank[out[letter]]) out[letter] = state;
  };
  for (const g of guesses) {
    evaluateGuess(g, answer).forEach((s, i) => bump(g[i], s));
  }
  for (const pos of steals) bump(answer[pos], 'correct');
  return out;
}

/**
 * Pick which position the rival "gives up". Skips positions you've already
 * solved (green) or stolen, and is seeded by the date so it's deterministic.
 * Returns null if there is nothing left to steal.
 */
export function pickStealPosition(
  key: string,
  answer: string,
  guesses: string[],
  steals: number[],
): number | null {
  const solved = new Set<number>(steals);
  for (const g of guesses) {
    evaluateGuess(g, answer).forEach((s, i) => {
      if (s === 'correct') solved.add(i);
    });
  }
  const open: number[] = [];
  for (let i = 0; i < answer.length; i++) if (!solved.has(i)) open.push(i);
  if (open.length === 0) return null;
  return open[hash(`steal:${key}:${guesses.length}:${steals.length}`) % open.length];
}

export function canSteal(state: GameState, answer: string): boolean {
  return (
    state.status === 'playing' &&
    state.steals.length < MAX_STEALS &&
    pickStealPosition(state.date, answer, state.guesses, state.steals) !== null
  );
}

/** 100-600 for a win (fewer guesses = more), minus a penalty per steal. 0 for a loss. */
export function computeScore(status: GameStatus, guessCount: number, stealCount: number): number {
  if (status !== 'won') return 0;
  const base = 100 + (MAX_GUESSES - guessCount) * 100;
  return Math.max(50, base - stealCount * STEAL_PENALTY);
}

export function newGame(key: string): GameState {
  return { date: key, guesses: [], steals: [], status: 'playing' };
}

/** Apply a (valid) guess and return the next state. */
export function applyGuess(state: GameState, guess: string, answer: string): GameState {
  if (state.status !== 'playing') return state;
  const guesses = [...state.guesses, guess];
  let status: GameStatus = 'playing';
  if (guess === answer) status = 'won';
  else if (guesses.length >= MAX_GUESSES) status = 'lost';
  return { ...state, guesses, status };
}

export function applySteal(state: GameState, answer: string): GameState {
  if (!canSteal(state, answer)) return state;
  const pos = pickStealPosition(state.date, answer, state.guesses, state.steals);
  if (pos === null) return state;
  return { ...state, steals: [...state.steals, pos] };
}

/** Fold a finished game into the running stats (call once per finished game). */
export function recordResult(stats: Stats, state: GameState): Stats {
  if (state.status === 'playing') return stats;
  const won = state.status === 'won';
  const continues = stats.lastPlayed !== null && stats.lastPlayed === previousDateKey(state.date);
  const currentStreak = won ? (continues || stats.currentStreak === 0 ? stats.currentStreak + 1 : 1) : 0;
  const distribution = [...stats.distribution];
  if (won) distribution[state.guesses.length - 1]++;
  const score = computeScore(state.status, state.guesses.length, state.steals.length);
  return {
    played: stats.played + 1,
    wins: stats.wins + (won ? 1 : 0),
    currentStreak,
    maxStreak: Math.max(stats.maxStreak, currentStreak),
    distribution,
    bestScore: Math.max(stats.bestScore, score),
    lastPlayed: state.date,
  };
}

const EMOJI: Record<TileState, string> = { correct: '🟩', present: '🟨', absent: '⬛' };

export function shareText(state: GameState, answer: string): string {
  const score = computeScore(state.status, state.guesses.length, state.steals.length);
  const result = state.status === 'won' ? `${state.guesses.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`;
  const heist = state.steals.length > 0 ? ` 🕶️×${state.steals.length}` : '';
  const grid = state.guesses
    .map((g) =>
      evaluateGuess(g, answer)
        .map((s) => EMOJI[s])
        .join(''),
    )
    .join('\n');
  return `Word Heist ${state.date} ${result}${heist} · ${score} pts\n\n${grid}`;
}
