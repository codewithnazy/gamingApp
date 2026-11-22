import AsyncStorage from '@react-native-async-storage/async-storage';
import { EMPTY_STATS, type GameState, type Stats } from './game.ts';

const GAME_KEY = 'wordheist:game:v1';
const STATS_KEY = 'wordheist:stats:v1';

async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    // Corrupt or unavailable storage must never block play.
    return null;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Best effort: progress just won't persist this time.
  }
}

/** Returns the saved game only if it belongs to `date`; otherwise null (new day). */
export async function loadGame(date: string): Promise<GameState | null> {
  const saved = await readJson<GameState>(GAME_KEY);
  return saved && saved.date === date ? saved : null;
}

export const saveGame = (state: GameState) => writeJson(GAME_KEY, state);

export async function loadStats(): Promise<Stats> {
  const saved = await readJson<Stats>(STATS_KEY);
  return saved ? { ...EMPTY_STATS, ...saved } : EMPTY_STATS;
}

export const saveStats = (stats: Stats) => writeJson(STATS_KEY, stats);

// ---- Word Search -----------------------------------------------------------

const SETTINGS_KEY = 'arcade:settings:v1';
const BEST_KEY = 'wordsearch:best:v1';

/** Returns raw saved settings (validate with sanitizeSettings) or null. */
export const loadRawSettings = () => readJson<unknown>(SETTINGS_KEY);
export const saveSettings = (settings: unknown) => writeJson(SETTINGS_KEY, settings);

/** Best (lowest) completion time in seconds, keyed by "theme:difficulty". */
export type BestTimes = Record<string, number>;

export async function loadBestTimes(): Promise<BestTimes> {
  return (await readJson<BestTimes>(BEST_KEY)) ?? {};
}

export const saveBestTimes = (best: BestTimes) => writeJson(BEST_KEY, best);
