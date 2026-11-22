// Every coin amount in the game, in ONE place. Change a number here and it changes everywhere.
export const REWARDS = {
  /** Completing a campaign level for the first time. */
  levelComplete: 10,
  /** Extra, once per level, the first time that level is finished with 3 stars. */
  levelThreeStars: 5,
  /** Daily login reward (Phase 6). */
  dailyLogin: 20,
  /** Watching a rewarded ad from the Free Coins button. */
  rewardedAd: 30,
  /** Daily challenge completion (Phase 7). */
  dailyChallenge: 25,
} as const;

export const COSTS = {
  /** Buying a hint with coins. */
  hint: 50,
} as const;

export type RewardGrant = { id: string; amount: number; label: string };

/**
 * Coins for finishing a campaign level. Each id is a permanent, once-only transaction: finishing
 * the same level again (or the same win being processed twice) can never pay out twice, and the
 * 3-star bonus can still be earned later if the first completion had fewer stars.
 */
export function levelRewardGrants(level: number, stars: 1 | 2 | 3): RewardGrant[] {
  const grants: RewardGrant[] = [
    { id: `level:${level}:complete`, amount: REWARDS.levelComplete, label: 'Level complete' },
  ];
  if (stars === 3) {
    grants.push({ id: `level:${level}:stars3`, amount: REWARDS.levelThreeStars, label: '3-star bonus' });
  }
  return grants;
}

/**
 * Hint rules. A hint bought with coins counts as a "used hint" for the star rating (the same rule
 * the game always had); a hint earned by watching an ad does not. Flip this one flag to make
 * coin-bought hints star-free as well.
 */
export const HINT_RULES = { coinHintCountsForStars: true } as const;
