# Architecture: monetization & retention upgrade

## Stack
Expo SDK 58 · React Native 0.88 · TypeScript. Ads: `react-native-google-mobile-ads` (a wrapper over
Google's official Mobile Ads SDK). Persistence: AsyncStorage (JSON blobs). The `android/` project is
generated at build time (Continuous Native Generation), never hand-edited.

## Layers (each pure where possible, so it can be unit-tested without a device)

```
UI screens ──► feature hooks/stores ──► pure rules ──► persistence
 (src/screens)   (src/economy/store,     (src/economy/ledger,   (AsyncStorage via
                  src/ads/index)           src/ads/policy, ...)   src/storage.ts)
```

### Economy (`src/economy/`)
- `ledger.ts` (pure): state `{ coins, granted }`. `applyGrant` / `applySpend` are **idempotent per
  transaction id** (`granted[id]`), so a reward can never be paid twice (double taps, re-renders,
  restarts) and a spend can never be deducted twice. Spending more than the balance is refused,
  never clamped.
- `rewards.ts`: every amount in one place (level 10, 3-star bonus +5, daily login 20, rewarded ad
  30, hint 50, ...).
- `store.ts`: in-memory store (`useEconomy`) + a **serialised write queue**: updates apply to
  memory immediately, and each is persisted in order, so writes never interleave.
- Level completion commits **economy first, then level progress**. If the app dies between the two,
  the worst case is "coins kept, level must be replayed (no second reward)" - never lost coins.

### Ads (`src/ads/`)
```
screens ──► ads/index.ts  (facade: results + policy)
              ├─ policy.ts      pure frequency rules (every 3-4 puzzles, cooldown, grace, min level)
              ├─ units.ts       test-vs-real ad unit resolution (test ads in dev / when unset)
              ├─ config.ts      the single file to tune ads
              ├─ store.ts       observable ad availability
              └─ adsImpl.ts     AdMob SDK: consent -> init -> preload -> show (native)
                 adsImpl.web.ts simulated ads for browser preview / tests
```
Every ad request resolves to a typed result (`earned`, `closed`, `unavailable`, `timeout`, `failed`,
`busy`); a rewarded ad grants only on `earned`, which is set solely by the SDK's reward callback.
At most one ad request is in flight at a time. Loading and showing have timeouts, and nothing in the
game ever waits on an ad.

## Stages
1. **Phases 1-5**: coins, ad-service hardening, hint dialog, Free Coins, interstitial flow.
2. **Phases 6-11**: daily reward, daily challenge, streak, analytics, home upgrade, Remove-Ads prep.
