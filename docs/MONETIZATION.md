# Earning money with ads

Word Arcade ships with Google AdMob ads wired in, using **test ads only** until you add your own
ad unit IDs. Nothing here can earn money (or get your AdMob account flagged) until you follow the
steps below.

> **Read this first.** I could not check Google's or Expo's current documentation while building
> this (the docs sites were unreachable from my environment), so the steps below come from the
> library's own bundled docs and my general knowledge. AdMob and Play Console change their screens
> often - if a step looks different, follow what you see on screen. The real-ads code path has **not**
> been run on a device or in a store build; it was type-checked against the library and the config
> plugin was verified with `expo prebuild`. Do the "test first" step before releasing.

## What the app does

| Placement | Where | Rules |
|---|---|---|
| **Rewarded video** | "📺 Free hint" button on the puzzle screen | The player chooses to watch it. The hint it gives does **not** cost a star. |
| **Interstitial** (full screen) | Between puzzles, after you tap *Next level / Play again* | At most one per 3 finished puzzles, never within 2 minutes of the last one, never before level 5. |
| **Banner** | Home and level-select screens only | Never on the puzzle screen, so nobody taps one by accident. |

All of this is tuned in **`src/ads/config.ts`**. Set `enabled: false` there to ship with no ads.
The game never waits on an ad: if one fails to load, nothing happens.

In **Expo Go** ads are simply off (Expo Go doesn't contain the AdMob native code). In the browser
preview they are *simulated*. Real ads need a native build (below).

## Setting it up

### 1. Create your AdMob account
1. Go to <https://admob.google.com> and sign in with a Google account.
2. Accept the terms, set your country and payment details (you can finish payments later).

### 2. Register the app and create three ad units
1. In AdMob: **Apps → Add app → Android**. Say the app isn't published yet if asked.
2. Name it, and note the **App ID**: `ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY` (with a `~`).
3. Open the app → **Ad units → Add ad unit** three times: **Banner**, **Interstitial**, **Rewarded**.
   For Rewarded, set the reward to something like "1 hint". Note each **Ad unit ID**
   (`ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ`, with a `/`).

### 3. Put your IDs in the project
- **App ID** → `app.json` → `plugins` → `react-native-google-mobile-ads` → `androidAppId`
  (replace the Google sample ID). **This is required** - the Android SDK crashes on launch without
  a valid app ID.
- **Ad unit IDs** → `src/ads/config.ts` → `units.banner.android`, `units.interstitial.android`,
  `units.rewarded.android`. Anything left as `null` (or mistyped) automatically falls back to test ads.
- Run `npm test` - it checks your IDs have the right format.

### 4. Register your own phone as a test device (important)
Real ads on **your own phone** must never be tapped: Google treats it as invalid traffic and can
disable your account. Add your phone under AdMob → **Settings → Test devices** *and* put its ID in
`testDeviceIds` in `src/ads/config.ts` (the ID is printed in `adb logcat` the first time real ads
load). Registered devices get test ads.

### 5. Build and test with test ads first
Ads need a native build. With an Expo account:
```bash
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile preview     # installable APK
```
Install the APK from the link EAS gives you. In this build, until you add real IDs, you'll see
Google's labelled **"Test Ad"** banners, interstitials and rewarded videos. Check:
- the banner shows on Home and level select, but not on the puzzle screen;
- "📺 Free hint" appears and the hint doesn't cost a star;
- a full-screen ad appears before level 5, then not again straight away.

(`--profile development` builds a *development client* instead, which can load your JS live from
`npm start` - handy if you keep changing code.)

### 6. Privacy and consent (required)
- **EU/UK consent form.** AdMob → **Privacy & messaging** → create a *European regulations* (GDPR)
  message and publish it. The app already calls Google's consent flow at startup; without a
  published message no form appears. Users who decline simply see no ads.
- **Privacy policy.** Google Play requires a public URL. Start from
  [`docs/PRIVACY_POLICY_TEMPLATE.md`](PRIVACY_POLICY_TEMPLATE.md), fill in the blanks, and host it
  anywhere public (a GitHub Pages page works).
- **Child-directed setting.** `tagForChildDirectedTreatment` in `src/ads/config.ts` is `false`
  (general audience). If your game is aimed at children under 13, set it to `true` **and** read
  Google's Families policies first - many ad features are restricted. It's your legal declaration.
- **app-ads.txt** (recommended by AdMob): host a file on your developer website listing your
  AdMob publisher ID; AdMob's app settings show the exact line.

### 7. Play Console
When you publish (see the Play Store steps we went over earlier):
- App content → **Ads**: declare that the app **contains ads**.
- **Data safety** form: declare that the app collects/shares the **Advertising ID** for advertising
  (the AdMob SDK does this). Word Arcade itself stores progress only on the device.
- Add your privacy-policy URL.
- Build for the store with `npx eas-cli@latest build --platform android --profile production`
  (an `.aab`), with your **real** ad unit IDs configured.

### 8. Go live carefully
Before going live, run the production build on a registered test device and confirm real-looking
ads appear (they'll be test ads on registered devices). New AdMob apps can take a while to start
serving real ads, and early on you may see blank ad slots - that's normal.

## Expectations
Ad revenue is small unless many people play regularly: it depends on daily active players, their
country (US/UK/EU players are worth far more per ad than some other regions), and how often they
see ads. AdMob only pays once your balance passes its payment threshold (check AdMob for the
current amount). Treat this as a long game: improving the game and getting installs matters more
than ad settings.

## Rules to stay on the right side of AdMob
- **Never tap your own ads**, and never ask or incentivise others to tap them.
- The rewarded video is **opt-in** and rewards *watching*, not tapping - that's what's allowed.
- Don't place ads where they cover buttons or get tapped by accident (that's why the puzzle
  screen has none).
- Don't show an ad on app launch or when leaving the game.

## Not done yet
- **Remove-ads purchase.** A one-time "no ads" in-app purchase is a common extra revenue stream and
  friendlier to players; it needs an IAP library (e.g. RevenueCat) and Play Console setup.
- **iOS.** The ad code and config plugin are set up for iOS, but iOS needs the App Tracking
  Transparency prompt (`expo-tracking-transparency`) and a Mac/Apple account to test, which I
  haven't done. Treat iOS as untested.
- **Word Heist** has no ads except the home-screen banner.
