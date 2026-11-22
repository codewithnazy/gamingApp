import type { TileState } from './game.ts';

export const colors = {
  bg: '#0b1020',
  panel: '#151b2e',
  panelAlt: '#1d2540',
  border: '#2a3352',
  text: '#f4f6fb',
  muted: '#8f9bb8',
  accent: '#ffb020',
  accentText: '#1a1200',
  danger: '#ef4444',
  correct: '#1fa35c',
  present: '#d29a14',
  absent: '#2b3350',
  key: '#3a4566',
} as const;

export function tileColor(state: TileState | undefined): string | undefined {
  return state ? colors[state] : undefined;
}
