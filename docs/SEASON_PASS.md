# Season Pass

A 7-day pass with a **free** reward track and a **premium** track, like a battle pass. Open it from
the **Season Pass** button on Home (it shows the time left and a red badge when rewards are ready).

## How it works
- **Seasons** run Monday to Monday (local midnight), computed from the calendar alone, so they work
  offline and everyone on the same date is in the same season. The countdown reads like `3D 13H`.
- **Keys 🔑** are the progress currency. You earn **one key the first time you finish each distinct
  puzzle in a season**: a campaign level (`level:12`) or the daily challenge (`daily:2026-11-26`).
  Replaying a puzzle gives no second key, so the pass can't be farmed by repeating level 1.
  Quick play gives no keys.
- **10 tiers, 3 keys per tier** (the "1/3" bar). Every tier has a free reward (left) and a premium
  reward (right).
- **Premium** is activated with **coins** (500). Premium tiers you have *already reached* become
  claimable right away. Premium is per season.
- **Claiming** is once per reward, ever (a permanent ledger transaction), and there is a
  **Claim all** button. **Unclaimed rewards expire when the season ends.**
- The pass is **locked at first**: Home shows *"Season Pass unlocks at Level 3!"* until the player
  reaches level 3 (and no keys are earned before that).

## Tuning (src/pass/pass.ts -> `PASS`)
| Setting | Default | Meaning |
|---|---|---|
| `tiers` | 10 | number of tiers |
| `keysPerTier` | 3 | keys needed per tier |
| `premiumCost` | 500 | coins to activate premium |
| `unlockLevel` | 3 | level at which the pass opens |
| `free` / `premium` | see file | coins per tier (rewards >= 100 are drawn as a chest) |

Season length and start date are in `src/pass/season.ts` (`SEASON_DAYS`, `EPOCH`); season names
rotate through a list there. Don't change the epoch after release (it would reshuffle season numbers
and expire players' progress).

## Architecture
```
PassScreen / Home badge ──► src/pass/actions.ts ──► src/pass/pass.ts (pure rules) ──► economy store
                              (atomic commit +       season.ts (pure calendar)         (persisted)
                               analytics)
```
- `pass.ts`: pure transitions: `earnKey`, `claimReward`, `claimAllRewards`, `activatePremium`,
  `claimStatus`. No clock, no storage, fully unit-tested (`pass.test.ts`).
- Pass progress (`pass: { season, keys, seen }`) lives in the economy state; **claimed rewards live
  in the ledger (`granted`)**, so a reward can never pay twice. Premium ownership is also a ledger
  entry (`pass:<season>:premium`), so the 500-coin spend and the "owned" marker are one atomic write.
- When a new season starts the old keys simply stop counting (`effectivePass`), and the same
  puzzles earn keys again.

## Analytics
`pass_key_earned`, `pass_reward_claimed` (also once per reward when using Claim all) and
`pass_premium_activated`; coin movements appear as `coins_earned` (source `pass-free` / `pass-premium`
/ `pass`) and `coins_spent` (reason `pass-premium`).

## Not done / ideas
- Premium is unlocked with in-game coins (your choice). A real-money premium pass would reuse the
  billing interface in `src/billing` (see `docs/BILLING.md`).
- Rewards are coins only (large ones shown as chests). Item rewards (hint tokens, themes) would need
  an inventory in the economy state.
- A notification when a season is about to end.
