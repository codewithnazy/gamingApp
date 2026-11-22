// The reward FLOWS: how an ad result or a purchase turns into coins / hints. Written against small
// injected interfaces (no React, no SDK) so every guarantee below is unit-tested without a device:
//   - a reward is paid ONLY for an 'earned' ad result, and only once per attempt;
//   - a hint bought with coins is paid for only if it can really be applied, and never twice;
//   - re-entrant taps are ignored.
import { COSTS, REWARDS } from './rewards.ts';
import type { EconomyStore } from './store.ts';
import type { RewardedStatus } from '../ads/types.ts';

export interface FlowDeps {
  economy: Pick<EconomyStore, 'grant' | 'spend'>;
  requestRewardedAd: () => Promise<RewardedStatus>;
  /** Unique id per attempt. Injectable for tests. */
  newId?: () => string;
}

const defaultId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

// ---- Free Coins -------------------------------------------------------------------------------

export type FreeCoinsResult =
  | { ok: true; amount: number }
  | { ok: false; reason: Exclude<RewardedStatus, 'earned'> | 'duplicate' };

let claiming = false;

/** Watch a rewarded ad for coins. Coins are paid only after the SDK confirms the reward. */
export async function claimFreeCoins(deps: FlowDeps): Promise<FreeCoinsResult> {
  if (claiming) return { ok: false, reason: 'busy' };
  claiming = true;
  try {
    const status = await deps.requestRewardedAd();
    if (status !== 'earned') return { ok: false, reason: status };
    // One id per attempt: this very reward can be applied exactly once, even if called again.
    const id = `ad:coins:${(deps.newId ?? defaultId)()}`;
    const tx = deps.economy.grant({ id, amount: REWARDS.rewardedAd, kind: 'event' }, 'rewarded-ad');
    return tx.applied ? { ok: true, amount: REWARDS.rewardedAd } : { ok: false, reason: 'duplicate' };
  } finally {
    claiming = false;
  }
}

// ---- Hints ------------------------------------------------------------------------------------

export interface HintDeps {
  /** Is there something to reveal right now? (An unfinished puzzle with an unfound word.) */
  canApplyHint: () => boolean;
  /** Reveal the hint in the active game. */
  applyHint: () => void;
}

export type BuyHintResult = 'applied' | 'insufficient' | 'nothing-to-hint' | 'duplicate';

/** Buy a hint with coins. Coins are deducted only when the hint is actually applied. */
export function buyHintWithCoins(deps: HintDeps & Pick<FlowDeps, 'economy' | 'newId'>): BuyHintResult {
  if (!deps.canApplyHint()) return 'nothing-to-hint'; // never charge for a hint that can't be shown
  const id = (deps.newId ?? defaultId)();
  const spent = deps.economy.spend({ id: `hint:${id}`, amount: COSTS.hint, kind: 'event' }, 'hint');
  if (!spent.applied) return spent.reason === 'insufficient' ? 'insufficient' : 'duplicate';
  try {
    deps.applyHint();
  } catch (e) {
    // Applying failed after charging: give the coins back and surface nothing to the player.
    deps.economy.grant({ id: `refund:${id}`, amount: COSTS.hint, kind: 'event' }, 'hint-refund');
    throw e;
  }
  return 'applied';
}

export type AdHintResult = { ok: true } | { ok: false; reason: Exclude<RewardedStatus, 'earned'> | 'nothing-to-hint' };

let hintAdInFlight = false;

/** Watch a rewarded ad for a free hint. The hint is applied only when the ad reward is confirmed. */
export async function getHintFromAd(deps: HintDeps & Pick<FlowDeps, 'requestRewardedAd'>): Promise<AdHintResult> {
  if (hintAdInFlight) return { ok: false, reason: 'busy' };
  if (!deps.canApplyHint()) return { ok: false, reason: 'nothing-to-hint' };
  hintAdInFlight = true;
  try {
    const status = await deps.requestRewardedAd();
    if (status !== 'earned') return { ok: false, reason: status };
    // The puzzle may have been finished while the ad played; don't apply a hint to a finished game.
    if (!deps.canApplyHint()) return { ok: false, reason: 'nothing-to-hint' };
    deps.applyHint();
    return { ok: true };
  } finally {
    hintAdInFlight = false;
  }
}
