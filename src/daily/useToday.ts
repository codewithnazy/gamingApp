import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { dateKey } from './dates';

/**
 * Today's local calendar date, kept fresh: it re-checks whenever the app returns to the foreground
 * and once a minute, so a screen left open across midnight rolls over to the new day by itself.
 */
export function useToday(): string {
  const [today, setToday] = useState(() => dateKey());
  useEffect(() => {
    const refresh = () => setToday((cur) => {
      const now = dateKey();
      return now === cur ? cur : now;
    });
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    const id = setInterval(refresh, 60_000);
    return () => {
      sub.remove();
      clearInterval(id);
    };
  }, []);
  return today;
}
