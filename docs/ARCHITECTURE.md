# Architecture

## Stack
Expo SDK 58 · React Native 0.88 · TypeScript. Ads: `react-native-google-mobile-ads` (a wrapper over
Google's official Mobile Ads SDK). Persistence: AsyncStorage (JSON blobs). The `android/` project is
generated at build time (Continuous Native Generation) and never hand-edited.

## Principle: pure rules, thin shells
Every rule that can lose a player's coins or double-pay a reward is a **pure function over immutable
state** (no React, no storage, no clock) and unit-tested under Node. The app code is a thin shell that
calls those functions and persists the result.

```
UI screens/dialogs  ->  actions & flows  ->  pure rules  ->  store (memory + serialised writes)  ->  AsyncStorage
(src/screens,           (src/daily/actions,   (ledger, daily rewards,    (src/economy/store.ts)
 src/components)         src/economy/flows,    streak, ad policy,
                         src/ads/index)        analytics core, billing)
```

## Modules

| Module | Responsibility | Key files |
|---|---|---|
| `src/economy/` | coins & reward ledger. Idempotent transactions (`once` ids are permanent, `event` ids are remembered recently), refused overspend, one serialised persistence queue, atomic multi-field `transact`. | `ledger.ts`, `rewards.ts`, `store.ts`, `flows.ts`, `index.ts` |
| `src/ads/` | the ad service: single-flight, typed results, timeouts, frequency policy, consent, preloading; web simulation. | `index.ts`, `policy.ts`, `units.ts`, `config.ts`, `adsImpl(.web).ts` |
| `src/daily/` | daily reward, daily challenge (date-seeded puzzle), streak. Pure transitions + app actions + `useToday`. | `rewards.ts`, `challenge.ts`, `streak.ts`, `actions.ts` |
| `src/analytics/` | typed event catalogue, consent-aware engine, optional Firebase adapter. | `events.ts`, `core.ts`, `firebase.ts`, `index.ts` |
| `src/pass/` | Season Pass: 7-day calendar, keys (once per distinct puzzle per season), free/premium tiers, atomic claims and premium activation. See `docs/SEASON_PASS.md`. | `season.ts`, `pass.ts`, `actions.ts` |
| `src/billing/` | Remove Ads entitlement + billing interface (not wired to a store yet). | `types.ts`, `entitlements.ts`, `noop.ts`, `index.ts` |
| `src/search/` | (existing) puzzle engine, 500 levels, worlds, themes. | unchanged API |

## Reliability decisions
- **Coins before progress.** Completing a level grants coins (permanent per-level ids) *then* saves
  level progress, so a crash can never lose a reward; the worst case is replaying a level, which pays
  nothing a second time.
- **Atomic related changes.** "Grant the daily coins" and "remember today as claimed" are one commit
  (one persisted snapshot) via `store.transact`; same for the daily challenge.
- **Ordered writes.** Changes apply to memory instantly; writes to storage are queued strictly in
  order, so an older snapshot can never overwrite a newer one. Storage failures are contained.
- **Repair, don't trust.** Saved data is sanitised on load (bad numbers, dates, unknown fields).
  Old saves without the newer fields load with safe defaults.
- **Clock safety.** Daily claims use `today > lastClaim`, so moving the device clock *back* can't
  re-open a claimed day; the streak ignores dates before its last counted day.
- **Rewards only for confirmed results.** Ad rewards require the SDK's reward callback (`earned`);
  closing early, errors, timeouts and "busy" never pay. Hints are applied only when valid and are
  refunded if applying fails after charging.
- **Ads never block play.** Every ad path has a timeout and a fallback; failures are messages, not
  crashes.

## Game-design decisions (change in one place)
- **Quick play pays no coins** (random puzzles could be farmed); campaign levels, the daily reward and
  the daily challenge do.
- **Hint star rule preserved:** a coin-bought hint counts as a used hint for the star rating (as the
  old free hint did); an ad-earned hint does not. Flip `HINT_RULES.coinHintCountsForStars` in
  `src/economy/rewards.ts` to change it.
- **Season Pass keys come only from campaign levels and the daily challenge** (first completion per season), so the pass can't be farmed; premium is bought with coins.
- **Streak counts any finished puzzle** (level, quick play or daily challenge), once per calendar day.
- **Daily challenge date** is the device's *local* calendar day (same as the streak and daily reward),
  so everyone sharing a date and app version gets the same puzzle; a word-list change in an app
  update changes future daily puzzles.
