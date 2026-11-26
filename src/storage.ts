import AsyncStorage from '@react-native-async-storage/async-storage';
import { sanitizeProgress, type LevelProgress } from './search/levels.ts';


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

/**
 * Word Heist was removed from the app; tidy up the progress it saved. Best effort, harmless if the
 * keys don't exist.
 */
export async function clearRetiredData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove(['wordheist:game:v1', 'wordheist:stats:v1']);
  } catch {
    // not important
  }
}

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

// ---- Word Search levels ------------------------------------------------------

const LEVELS_KEY = 'wordsearch:levels:v1';

export async function loadLevelProgress(): Promise<LevelProgress> {
  return sanitizeProgress(await readJson<unknown>(LEVELS_KEY));
}

export const saveLevelProgress = (progress: LevelProgress) => writeJson(LEVELS_KEY, progress);

// ---- Economy (coins, rewards ledger) ---------------------------------------------------------

const ECONOMY_KEY = 'arcade:economy:v1';

export const loadEconomyRaw = () => readJson<unknown>(ECONOMY_KEY);

/** Unlike the fire-and-forget savers above, this reports failure so the write queue can log it. */
export async function saveEconomyState(state: unknown): Promise<void> {
  await AsyncStorage.setItem(ECONOMY_KEY, JSON.stringify(state));
}
