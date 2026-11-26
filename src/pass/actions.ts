// The Season Pass as app-level ACTIONS: each runs a pure transition (pass.ts) as ONE atomic economy
// commit, then reports it to analytics. Repeated calls (double taps, restarts) are harmless: the
// pure rules refuse anything already done.
import { track } from '../analytics';
import { economy } from '../economy';
import {
  activatePremium,
  claimAllRewards,
  claimReward,
  earnKey,
  PASS,
  type ActivateStatus,
  type Track,
} from './pass';
import { seasonIndex } from './season';

const currentSeason = () => seasonIndex(new Date());

/** The player finished `puzzleId` ("level:12", "daily:2026-11-26"): add a pass key, once per season. */
export function earnPassKey(puzzleId: string): { earned: boolean; keys: number; tierUp: number | null } {
  const r = economy.transact((s) => {
    const k = earnKey(s, currentSeason(), puzzleId);
    return { state: k.state, result: k };
  });
  if (r.earned) track('pass_key_earned', { keys: r.keys, tier: r.tierAfter });
  return { earned: r.earned, keys: r.keys, tierUp: r.tierAfter > r.tierBefore ? r.tierAfter : null };
}

/** Claim one reward. Pays only if it is really claimable (tier reached, premium active, not yet claimed). */
export function claimPassReward(tier: number, trackName: Track): { claimed: boolean; amount: number } {
  const res = economy.transact((s) => {
    const r = claimReward(s, currentSeason(), tier, trackName);
    return {
      state: r.state,
      result: { claimed: r.claimed, amount: r.amount },
      gain: r.claimed ? { amount: r.amount, reason: `pass-${trackName}` } : undefined,
    };
  });
  if (res.claimed) track('pass_reward_claimed', { tier, track: trackName, amount: res.amount });
  return res;
}

/** Claim everything that is claimable right now, as a single commit. */
export function claimAllPassRewards(): { count: number; amount: number } {
  const r = economy.transact((s) => {
    const all = claimAllRewards(s, currentSeason());
    return {
      state: all.state,
      result: all,
      gain: all.count > 0 ? { amount: all.amount, reason: 'pass' } : undefined,
    };
  });
  // Report every reward individually, exactly as if each had been tapped.
  for (const c of r.claims) track('pass_reward_claimed', { tier: c.tier, track: c.track, amount: c.amount });
  return { count: r.count, amount: r.amount };
}

/** Spend coins to activate this season's premium track (once; refused if the player is too poor). */
export function activatePassPremium(): ActivateStatus {
  const season = currentSeason();
  const status = economy.transact((s) => {
    const r = activatePremium(s, season);
    return {
      state: r.state,
      result: r.status,
      spend: r.status === 'activated' ? { amount: PASS.premiumCost, reason: 'pass-premium' } : undefined,
    };
  });
  if (status === 'activated') track('pass_premium_activated', { season });
  return status;
}
