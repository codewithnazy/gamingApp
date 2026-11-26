import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { msRemaining, seasonIndex } from './season';

/** The current season number and time left, refreshed every minute and when the app returns. */
export function usePassClock(): { season: number; remainingMs: number } {
  const read = () => {
    const now = new Date();
    return { season: seasonIndex(now), remainingMs: msRemaining(now) };
  };
  const [clock, setClock] = useState(read);
  useEffect(() => {
    const tick = () => setClock(read());
    const sub = AppState.addEventListener('change', (s) => s === 'active' && tick());
    const id = setInterval(tick, 30_000);
    return () => {
      sub.remove();
      clearInterval(id);
    };
  }, []);
  return clock;
}
