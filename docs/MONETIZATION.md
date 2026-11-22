# Earning money with ads (AdMob)

Word Arcade ships with Google AdMob wired in, using **test ads only** until you add your own ad unit
IDs. Nothing here can earn money (or get your AdMob account flagged) until you follow the steps below.

> **Read this first.** I could not check Google's or Expo's current documentation while building this
> (the docs sites were unreachable) and could not run a native Android build (the Android SDK host was
> unreachable). The steps below come from the library's own bundled docs and general knowledge, and
> the code was verified by type-checking, unit tests, the JS bundle, `expo prebuild` and browser tests
> with *simulated* ads. **The real-ads path has not been run on a device.** Do the "test first" step
> before releasing, and follow what AdMob/Play Console show on screen if a step looks different.

## What the app does

| Ad | Where | Rules |
|---|---|---|
| **Rewarded video** | *Hint -> "Watch an ad"* and *Free Coins* (+30) | Always the player's choice. Reward only after the SDK confirms it. |
| **Interstitial** (full screen) | After a finished puzzle, when the player taps **Continue** | About every **3-4** finished puzzles (random in that range), at least **2 minutes** apart, never in the first **minute** after launch, never before **level 5**, never on Restart/Replay, never during play. |
| **Banner** | Home and level-select screens only | Never on the puzzle screen. |

Everything is tuned in **`src/ads/config.ts`** (including an `enabled: false` master switch). The game
never waits on an ad: a failed or slow ad just means the player carries on.

In **Expo Go** ads are off (it has no AdMob native code). In the **browser preview** they are
*simulated* (see `docs/TESTING.md`). Real ads need a native build.

## Architecture of the ad integration

```
screens (HintDialog, FreeCoinsDialog, level-complete dialog, banners)
   |  requestRewardedAd()  /  maybeShowInterstitial(nextLevel)  /  <BannerSlot/>
   v
src/ads/index.ts  - the ad SERVICE: single-flight, typed results, frequency policy
   |-- policy.ts   pure rules: 3-4 level range, cooldown, start-up grace, min level, Remove Ads
   |-- units.ts    test-vs-real unit IDs (test ads in dev, when unset, or when an ID is malformed)
   |-- config.ts   the one file you edit
   |-- store.ts    observable state (enabled, rewardedReady, busy, adsRemoved)
   '-- adsImpl.ts  AdMob (react-native-google-mobile-ads): consent -> init -> preload -> show
       adsImpl.web.ts  simulated ads for the browser preview and tests
```
- **Typed results**: `earned | closed | unavailable | timeout | failed | busy` (rewarded) and
  `shown | unavailable | timeout | failed | busy` (interstitial). Only `earned` - set solely by the
  SDK's reward callback - can ever pay a reward (`src/economy/flows.ts`).
- **Single flight**: one ad request at a time; extra taps are ignored, never queued.
- **Timeouts**: waiting for a rewarded ad to load (8 s) and for a loaded ad to open (10 s) are both
  bounded. If the SDK reports a load failure (offline / no fill) the player is told immediately.
- **Preloading**: the next rewarded and interstitial ad load right after the previous one closes,
  with growing retry delays (15 s up to 5 min) so a dead network never spams requests.
- **Consent**: Google's UMP form runs first (only where required); no consent -> no ads, and the
  analytics layer is told the same.

## Setting it up

### 1. Create your AdMob account
<https://admob.google.com> -> sign in -> accept terms -> set country and payment details.

### 2. Register the app and create three ad units
1. **Apps -> Add app -> Android** (say it isn't published yet if asked). Note the **App ID**
   (`ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY`, with a `~`).
2. In that app: **Ad units -> Add ad unit** three times: **Banner**, **Interstitial**, **Rewarded**
   (reward: "1 hint" / "30 coins"). Note each **Ad unit ID** (`.../ZZZZZZZZZZ`, with a `/`).

### 3. Put your IDs in the project
- **App ID** -> `app.json` -> `plugins` -> `react-native-google-mobile-ads` -> `androidAppId`
  (replace Google's sample ID). **Required** - the Android SDK crashes at launch without a valid one.
- **Ad unit IDs** -> `src/ads/config.ts` -> `units.banner.android`, `units.interstitial.android`,
  `units.rewarded.android`. Anything left `null` (or mistyped) falls back to test ads.
- `npm test` checks the format of your IDs.

### 2b. AdMob account configuration checklist
- [ ] Payments profile and tax info completed (needed before payouts).
- [ ] App added with the **same package name** as `android.package` in `app.json` (change the
      `com.example.wordheist` placeholder first - it cannot be changed after publishing).
- [ ] **Privacy & messaging**: create and *publish* a European regulations (GDPR) message, so the
      consent form appears for EU/UK users.
- [ ] **Test devices** registered (Settings -> Test devices) and their IDs added to `testDeviceIds`
      in `src/ads/config.ts`.
- [ ] `app-ads.txt` hosted on your developer website (AdMob shows the exact line).
- [ ] App linked to its Play Store listing once published.

### 4. Register your phone as a test device (important)
Clicking real ads on your own phone is invalid traffic and can disable your account. Register every
phone you test on (AdMob -> Settings -> Test devices **and** `testDeviceIds` in the config; the ID is
printed in `adb logcat` the first time real ads load).

### 5. Build and test with test ads first
```bash
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile preview   # installable APK
```
You should see Google's labelled **"Test Ad"** banners / interstitials / videos. Run the checklist in
`docs/TESTING.md`.

### 6. Privacy, Play Console
- Public **privacy policy** URL (start from `docs/PRIVACY_POLICY_TEMPLATE.md`).
- Play Console -> App content -> **Ads**: "contains ads". **Data safety**: Advertising ID collected
  for advertising (+ analytics if enabled).
- `tagForChildDirectedTreatment` in `src/ads/config.ts` is `false` (general audience). If your game is
  aimed at children under 13 set it to `true` **and** read Google's Families policies first.
- Release build: `npx eas-cli@latest build --platform android --profile production` (an `.aab`) with
  your **real** unit IDs configured.

## Configuration reference (`src/ads/config.ts`)
| Setting | Default | Meaning |
|---|---|---|
| `enabled` | `true` | master switch for all ads |
| `units.*.android/ios` | `null` | real ad unit IDs (null = test ads) |
| `interstitial.minLevels / maxLevels` | 3 / 4 | finished puzzles between ads (random in range) |
| `interstitial.minGapMs` | 120000 | minimum time between interstitials |
| `interstitial.firstEligibleLevel` | 5 | no interstitial before this level |
| `interstitial.appStartGraceMs` | 60000 | no interstitial this soon after launch |
| `interstitial.showTimeoutMs` | 8000 | give up if a loaded interstitial doesn't open |
| `rewarded.loadTimeoutMs` / `showTimeoutMs` | 8000 / 10000 | rewarded-ad waiting limits |
| `maxAdContentRating` | `PG` | highest ad content rating |
| `tagForChildDirectedTreatment` | `false` | your legal declaration to Google |
| `testDeviceIds` | `[]` | your own phones (get test ads) |

Coin amounts live in `src/economy/rewards.ts` (level 10, 3-star +5, daily 20, ad 30, daily challenge
25, hint cost 50).

## Expectations and rules
- Revenue is small unless many people play regularly; AdMob pays once your balance passes its payment
  threshold (check AdMob for the current amount).
- **Never tap your own ads**, never ask or incentivise others to. Rewarded video is **opt-in** and
  rewards *watching* - that is what's allowed.
- Don't place ads where they cover controls or get tapped by accident; don't show ads at launch or exit.
- A one-time **Remove Ads** purchase is prepared but not wired: see `docs/BILLING.md`.
