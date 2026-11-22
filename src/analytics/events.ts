// The complete, typed catalogue of analytics events. Adding an event = adding a line here, so every
// call site is checked by the compiler. Names are snake_case and short (Firebase limits event names
// to 40 characters). NO personal data is ever included: only game-state numbers and fixed labels.

export type CoinSource = 'level' | 'rewarded-ad' | 'daily-login' | 'daily-challenge' | 'refund';
export type AdPlacement = 'free_coins' | 'hint' | 'interstitial';

export interface AnalyticsEvents {
  app_opened: Record<string, never>;
  level_started: { level: number; mode: 'campaign' | 'quick' | 'daily' };
  level_completed: { level: number; mode: 'campaign' | 'quick' | 'daily'; stars: number; hints: number; seconds: number };
  /** The game has no fail state; restarting a puzzle is the closest thing. */
  level_restarted: { level: number; mode: 'campaign' | 'quick' | 'daily' };
  hint_requested: { level: number; mode: 'campaign' | 'quick' | 'daily' };
  hint_used: { level: number; method: 'coins' | 'ad' };
  coins_earned: { amount: number; source: string };
  coins_spent: { amount: number; reason: string };
  rewarded_ad_requested: { placement: AdPlacement };
  rewarded_ad_completed: { placement: AdPlacement };
  rewarded_ad_failed: { placement: AdPlacement; reason: string };
  interstitial_shown: { next_level: number };
  daily_challenge_started: { date: string };
  daily_challenge_completed: { date: string; seconds: number; stars: number };
  daily_reward_claimed: { amount: number; streak?: number };
  streak_updated: { streak: number; best: number };
}

export type EventName = keyof AnalyticsEvents;
