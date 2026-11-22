// Daily login reward, daily challenge and streak as PURE, ATOMIC transitions on the economy state.
// Each returns the next state in one piece, so the coins and the "already done today" marker are
// always saved together - a crash can never leave one without the other.
import { applyGrant, type DateKey, type EconomyState } from '../economy/ledger.ts';
import { REWARDS } from '../economy/rewards.ts';
import { recordPlay, type StreakUpdate } from './streak.ts';

// ---- Daily login reward -------------------------------------------------------------------------

/**
 * One claim per calendar day. `today > lastClaim` (not just "different") also means that moving the
 * device clock BACK can never re-open a claim that was already taken.
 */
export const canClaimDaily = (s: EconomyState, today: DateKey): boolean =>
  s.daily.lastClaim === null || today > s.daily.lastClaim;

export interface ClaimResult {
  state: EconomyState;
  claimed: boolean;
  amount: number;
}

export function claimDailyReward(s: EconomyState, today: DateKey): ClaimResult {
  if (!canClaimDaily(s, today)) return { state: s, claimed: false, amount: 0 };
  const grant = applyGrant(s, { id: `daily:login:${today}`, amount: REWARDS.dailyLogin, kind: 'once' });
  // If a previous attempt already paid (crash between writes in an older build), just mark it claimed.
  const base = grant.applied ? grant.state : s;
  return { state: { ...base, daily: { lastClaim: today } }, claimed: grant.applied, amount: grant.applied ? REWARDS.dailyLogin : 0 };
}

// ---- Daily challenge ----------------------------------------------------------------------------

export const dailyChallengeDone = (s: EconomyState, today: DateKey): boolean => s.challenge.lastCompleted === today;

export interface ChallengeResult {
  state: EconomyState;
  /** Coins were paid just now (false on a replay of today's challenge). */
  rewarded: boolean;
  amount: number;
}

/** Mark today's challenge complete and pay the coins - once per day, however often it is replayed. */
export function completeDailyChallenge(s: EconomyState, today: DateKey): ChallengeResult {
  const grant = applyGrant(s, { id: `daily:challenge:${today}`, amount: REWARDS.dailyChallenge, kind: 'once' });
  const base = grant.applied ? grant.state : s;
  const marked = today > (s.challenge.lastCompleted ?? '') ? { challenge: { lastCompleted: today } } : {};
  const state = grant.applied || Object.keys(marked).length ? { ...base, ...marked } : s;
  return { state, rewarded: grant.applied, amount: grant.applied ? REWARDS.dailyChallenge : 0 };
}

// ---- Streak -------------------------------------------------------------------------------------

export interface PlayResult extends StreakUpdate {
  economy: EconomyState;
}

/** Record a finished puzzle for the streak (once per day; later calls the same day are no-ops). */
export function recordPuzzlePlayed(s: EconomyState, today: DateKey): PlayResult {
  const u = recordPlay(s.streak, today);
  return { ...u, economy: u.changed ? { ...s, streak: u.state } : s };
}
