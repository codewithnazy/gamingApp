// Player-facing wording for ad outcomes, kept in one place (and tested) so every screen is consistent.
import type { RewardedStatus } from './types.ts';

export function rewardedFailureMessage(reason: Exclude<RewardedStatus, 'earned'> | 'duplicate' | 'nothing-to-hint'): string | null {
  switch (reason) {
    case 'unavailable':
      return 'No ad is available right now. Please try again in a moment.';
    case 'timeout':
      return 'The ad took too long to load. Please try again later.';
    case 'failed':
      return 'Something went wrong with the ad. Nothing was lost - please try again.';
    case 'closed':
      return 'The ad was closed early, so there is no reward this time.';
    case 'duplicate':
      return 'That reward was already collected.';
    case 'nothing-to-hint':
      return 'There is nothing left to reveal.';
    case 'busy':
      return null; // another request is already running; stay silent
  }
}
