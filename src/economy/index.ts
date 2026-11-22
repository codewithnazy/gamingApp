import { useSyncExternalStore } from 'react';
import { loadEconomyRaw, saveEconomyState } from '../storage';
import { createEconomyStore } from './store';

export { REWARDS, COSTS, HINT_RULES, levelRewardGrants } from './rewards';
export type { EconomyState } from './ledger';

/** The one app-wide economy store, persisted in AsyncStorage. */
export const economy = createEconomyStore(
  { load: loadEconomyRaw, save: saveEconomyState },
  () => {
    // Storage hiccups are non-fatal: memory stays correct and the next write retries.
  },
);

/** React hook: re-renders when the balance (or any economy field) changes. */
export const useEconomy = () => useSyncExternalStore(economy.subscribe, economy.getState, economy.getState);
export const useCoins = () => useEconomy().coins;
