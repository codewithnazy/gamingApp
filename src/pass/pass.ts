// The Season Pass rules: PURE transitions over the economy state (no React, storage or clock).
//
//  - Keys: earned once per DISTINCT puzzle per season (replaying a level can't farm the pass).
//  - 10 tiers, 3 keys per tier. Every tier has a FREE reward and a PREMIUM reward.
//  - Premium is activated with coins; premium tiers already reached then become claimable.
//  - Each reward is a permanent once-only ledger transaction, so it can never pay twice.
//  - Rewards that are not claimed when the season ends expire with it.
import { applyGrant, applySpend, EMPTY_PASS, type EconomyState, type PassState } from '../economy/ledger.ts';

export const PASS = {
  tiers: 10,
  keysPerTier: 3,
  /** Coins to activate the premium track for a season. */
  premiumCost: 500,
  /** The pass appears once the player has reached this level (until then: "Unlocks at Level N!"). */
  unlockLevel: 3,
  /** Coins per tier. Index 0 = tier 1. */
  free: [10, 15, 20, 25, 30, 40, 50, 60, 75, 100],
  premium: [25, 40, 50, 60, 75, 100, 125, 150, 200, 300],
} as const;

export type Track = 'free' | 'premium';
export const TRACKS: Track[] = ['free', 'premium'];
export const MAX_KEYS = PASS.tiers * PASS.keysPerTier;

export const rewardAmount = (tier: number, track: Track): number => PASS[track][tier - 1] ?? 0;
/** Big rewards are drawn as a treasure chest instead of a coin stack. */
export const isChest = (tier: number, track: Track): boolean => rewardAmount(tier, track) >= 100;

const rewardId = (season: number, tier: number, track: Track) => `pass:${season}:t${tier}:${track}`;
const premiumId = (season: number) => `pass:${season}:premium`;
const validTier = (tier: number) => Number.isInteger(tier) && tier >= 1 && tier <= PASS.tiers;

/** The pass for `season`: if the saved keys belong to an OLDER season they no longer count. */
export const effectivePass = (s: EconomyState, season: number): PassState =>
  s.pass.season === season ? s.pass : { ...EMPTY_PASS, season };

/** Number of tiers unlocked by `keys` (0..10). */
export const tierReached = (keys: number): number => Math.min(PASS.tiers, Math.floor(keys / PASS.keysPerTier));

export interface TierProgress {
  /** The tier being worked towards (1..10), or 10 once finished. */
  tier: number;
  have: number;
  need: number;
  /** All 10 tiers are unlocked. */
  complete: boolean;
}

/** The "1/3" bar: keys collected toward the next tier. */
export function tierProgress(keys: number): TierProgress {
  if (keys >= MAX_KEYS) return { tier: PASS.tiers, have: PASS.keysPerTier, need: PASS.keysPerTier, complete: true };
  return { tier: tierReached(keys) + 1, have: keys % PASS.keysPerTier, need: PASS.keysPerTier, complete: false };
}

export const hasPremium = (s: EconomyState, season: number): boolean => s.granted[premiumId(season)] === true;

export type ClaimStatus = 'locked' | 'premium-locked' | 'claimable' | 'claimed';

export function claimStatus(s: EconomyState, season: number, tier: number, track: Track): ClaimStatus {
  if (!validTier(tier)) return 'locked';
  if (s.granted[rewardId(season, tier, track)]) return 'claimed';
  if (tierReached(effectivePass(s, season).keys) < tier) return 'locked';
  if (track === 'premium' && !hasPremium(s, season)) return 'premium-locked';
  return 'claimable';
}

export function claimableCount(s: EconomyState, season: number): number {
  let n = 0;
  for (let t = 1; t <= PASS.tiers; t++) for (const tr of TRACKS) if (claimStatus(s, season, t, tr) === 'claimable') n++;
  return n;
}

// ---- keys -------------------------------------------------------------------------------------

export interface KeyResult {
  state: EconomyState;
  /** A key was added (false for a puzzle that already gave one this season, or a full pass). */
  earned: boolean;
  keys: number;
  tierBefore: number;
  tierAfter: number;
}

/** Add a key for finishing `puzzleId` (e.g. "level:12", "daily:2026-11-26") - once per season. */
export function earnKey(s: EconomyState, season: number, puzzleId: string): KeyResult {
  const pass = effectivePass(s, season);
  const tierBefore = tierReached(pass.keys);
  const synced = s.pass.season === season ? s : { ...s, pass };
  if (pass.seen[puzzleId] || pass.keys >= MAX_KEYS || !puzzleId) {
    return { state: synced, earned: false, keys: pass.keys, tierBefore, tierAfter: tierBefore };
  }
  const keys = pass.keys + 1;
  return {
    state: { ...s, pass: { season, keys, seen: { ...pass.seen, [puzzleId]: true } } },
    earned: true,
    keys,
    tierBefore,
    tierAfter: tierReached(keys),
  };
}

// ---- claiming ---------------------------------------------------------------------------------

export interface ClaimResult {
  state: EconomyState;
  claimed: boolean;
  amount: number;
}

export function claimReward(s: EconomyState, season: number, tier: number, track: Track): ClaimResult {
  if (claimStatus(s, season, tier, track) !== 'claimable') return { state: s, claimed: false, amount: 0 };
  const amount = rewardAmount(tier, track);
  const grant = applyGrant(s, { id: rewardId(season, tier, track), amount, kind: 'once' });
  if (!grant.applied) return { state: s, claimed: false, amount: 0 };
  return { state: { ...grant.state, pass: effectivePass(grant.state, season) }, claimed: true, amount };
}

export interface ClaimAllResult {
  state: EconomyState;
  count: number;
  amount: number;
  /** Every reward that was paid, so each one can be reported individually. */
  claims: { tier: number; track: Track; amount: number }[];
}

export function claimAllRewards(s: EconomyState, season: number): ClaimAllResult {
  let state = s;
  let amount = 0;
  const claims: ClaimAllResult['claims'] = [];
  for (let t = 1; t <= PASS.tiers; t++) {
    for (const tr of TRACKS) {
      const r = claimReward(state, season, t, tr);
      if (r.claimed) {
        state = r.state;
        amount += r.amount;
        claims.push({ tier: t, track: tr, amount: r.amount });
      }
    }
  }
  return { state, count: claims.length, amount, claims };
}

// ---- premium ----------------------------------------------------------------------------------

export type ActivateStatus = 'activated' | 'already' | 'insufficient';

/** Spend coins to activate the premium track for this season (once; refused if too poor). */
export function activatePremium(s: EconomyState, season: number): { state: EconomyState; status: ActivateStatus } {
  if (hasPremium(s, season)) return { state: s, status: 'already' };
  const spend = applySpend(s, { id: premiumId(season), amount: PASS.premiumCost, kind: 'once' });
  if (!spend.applied) return { state: s, status: 'insufficient' };
  return { state: { ...spend.state, pass: effectivePass(spend.state, season) }, status: 'activated' };
}
