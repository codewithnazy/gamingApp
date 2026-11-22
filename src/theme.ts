import type { TileState } from './game.ts';

export const colors = {
  bg: '#0f1115',
  panel: '#1a1d24',
  border: '#343944',
  text: '#f3f4f6',
  muted: '#9aa1ad',
  accent: '#f5b942',
  danger: '#ef4444',
  correct: '#2f9e5b',
  present: '#c9a227',
  absent: '#3a3f4a',
  key: '#565c69',
} as const;

export function tileColor(state: TileState | undefined): string | undefined {
  return state ? colors[state] : undefined;
}
