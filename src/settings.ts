import type { Difficulty } from './search/engine.ts';
import type { PaletteId, ThemeId } from './search/themes.ts';

export type SearchMode = 'levels' | 'quick';

export interface Settings {
  /** 'levels' = campaign progression, 'quick' = free play with custom theme/difficulty. */
  mode: SearchMode;
  theme: ThemeId;
  difficulty: Difficulty;
  /** Show a running timer (and record best times). */
  timer: boolean;
  haptics: boolean;
  /** Share anonymous usage statistics (never any personal data). */
  analytics: boolean;
  palette: PaletteId;
}

export const DEFAULT_SETTINGS: Settings = {
  mode: 'levels',
  theme: 'mixed',
  difficulty: 'easy',
  timer: true,
  haptics: true,
  analytics: true,
  palette: 'sunset',
};

/** Merge untrusted saved data over defaults, dropping anything unrecognised. */
export function sanitizeSettings(raw: unknown, valid: {
  themes: string[];
  difficulties: string[];
  palettes: string[];
}): Settings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const pick = <T extends string>(value: unknown, allowed: string[], fallback: T): T =>
    typeof value === 'string' && allowed.includes(value) ? (value as T) : fallback;
  return {
    mode: pick(r.mode, ['levels', 'quick'], DEFAULT_SETTINGS.mode),
    theme: pick(r.theme, valid.themes, DEFAULT_SETTINGS.theme),
    difficulty: pick(r.difficulty, valid.difficulties, DEFAULT_SETTINGS.difficulty),
    palette: pick(r.palette, valid.palettes, DEFAULT_SETTINGS.palette),
    timer: typeof r.timer === 'boolean' ? r.timer : DEFAULT_SETTINGS.timer,
    haptics: typeof r.haptics === 'boolean' ? r.haptics : DEFAULT_SETTINGS.haptics,
    analytics: typeof r.analytics === 'boolean' ? r.analytics : DEFAULT_SETTINGS.analytics,
  };
}
