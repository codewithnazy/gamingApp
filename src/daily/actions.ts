// The daily features as app-level ACTIONS: each runs a pure transition (rewards.ts / streak.ts) as
// ONE atomic economy commit, then reports it to analytics. Nothing here can double-pay: the pure
// rules refuse repeats, so calling an action twice (double tap, re-render, restart) is harmless.
import { track } from '../analytics';
import { economy } from '../economy';
import { claimDailyReward, completeDailyChallenge, recordPuzzlePlayed } from './rewards';
import { dateKey } from './dates';

// ---- streak milestone events (the celebration overlay listens to these) -----------------------

const milestoneListeners = new Set<(streak: number) => void>();
export const onStreakMilestone = (l: (streak: number) => void) => {
  milestoneListeners.add(l);
  return () => {
    milestoneListeners.delete(l);
  };
};

/** Claim today's login reward (20 coins). Safe to call repeatedly: only the first call pays. */
export function claimDaily(today: string = dateKey()): { claimed: boolean; amount: number } {
  const res = economy.transact((s) => {
    const r = claimDailyReward(s, today);
    return {
      state: r.state,
      result: { claimed: r.claimed, amount: r.amount },
      gain: r.claimed ? { amount: r.amount, reason: 'daily-login' } : undefined,
    };
  });
  if (res.claimed) track('daily_reward_claimed', { amount: res.amount, streak: economy.getState().streak.current });
  return res;
}

/** Complete today's daily challenge (25 coins, once per day; replays pay nothing). */
export function finishDailyChallenge(today: string = dateKey()): { rewarded: boolean; amount: number } {
  return economy.transact((s) => {
    const r = completeDailyChallenge(s, today);
    return {
      state: r.state,
      result: { rewarded: r.rewarded, amount: r.amount },
      gain: r.rewarded ? { amount: r.amount, reason: 'daily-challenge' } : undefined,
    };
  });
}

/** A puzzle (of any kind) was finished: count it toward today's streak - once per day. */
export function notePuzzlePlayed(today: string = dateKey()): void {
  const u = economy.transact((s) => {
    const r = recordPuzzlePlayed(s, today);
    return { state: r.economy, result: r };
  });
  if (!u.changed) return;
  track('streak_updated', { streak: u.state.current, best: u.state.best });
  if (u.milestone !== null) milestoneListeners.forEach((l) => l(u.milestone as number));
}
