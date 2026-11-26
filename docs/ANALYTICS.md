# Analytics (Firebase)

## What is built
`src/analytics/` is a complete, typed analytics layer. **It works today without Firebase**: events
are checked, filtered by consent, and kept in a small in-memory buffer. Sending them to Firebase
Analytics only needs the steps below (your Firebase project and `google-services.json` are the part
I can't create for you).

```
track('level_completed', {...})   <- typed against src/analytics/events.ts
   |
   core.ts   consent + opt-out gate, pre-consent queue, parameter sanitising, provider isolation
   |
   +-- console provider   (development only)
   +-- firebase provider  (only if the Firebase packages are installed - firebase.ts)
```

### Events (src/analytics/events.ts)
`app_opened`, `level_started`, `level_completed`, `level_restarted` (the game has no fail state, so a
restart is the closest thing to "failed"), `hint_requested`, `hint_used`, `coins_earned`,
`coins_spent`, `rewarded_ad_requested`, `rewarded_ad_completed`, `rewarded_ad_failed`,
`interstitial_shown`, `daily_challenge_started`, `daily_challenge_completed`,
`daily_reward_claimed`, `streak_updated`, `pass_key_earned`, `pass_reward_claimed`,
`pass_premium_activated`.

### Privacy by construction
- **No personal data.** Parameters are only game numbers and fixed labels (level number, stars,
  coin amount, ad placement...). `sanitizeParams` additionally drops non-primitive values and any
  string containing `@`, and truncates long strings. There is no user ID, name, e-mail or location.
- **Consent.** Events are held until the consent flow (Google's UMP form, shown at startup where the
  law requires it) has decided. Granted -> sent. Denied -> thrown away, nothing leaves the device.
- **Player control.** Level select -> Options -> **Usage stats** switch turns collection off
  completely (and tells Firebase to stop collecting).
- **Never affects gameplay.** `track()` never throws or blocks; a failing backend is isolated.

## Turning Firebase on
> I could not verify these steps in a build here (the Android build tools were unreachable), and
> I did not install the Firebase packages in the repo: they need *your* `google-services.json`, and
> adding them without it would break the native build. Follow the official React Native Firebase docs
> if anything differs.

1. **Firebase console** -> create a project -> *Add app* -> Android. Use your real package name
   (the `android.package` in `app.json`; change the `com.example.wordheist` placeholder first).
   Download `google-services.json` into the project root.
2. Install (needs a native build, so not Expo Go):
   ```bash
   npx expo install @react-native-firebase/app @react-native-firebase/analytics
   ```
3. `app.json`:
   ```json
   "android": { "package": "com.yourname.wordarcade", "googleServicesFile": "./google-services.json" },
   "plugins": [ "@react-native-firebase/app", ...existing plugins... ]
   ```
4. Build: `npx eas-cli@latest build --platform android --profile preview`.
5. Check it works: install the build, then enable DebugView:
   `adb shell setprop debug.firebase.analytics.app <your.package.name>` and open
   Firebase -> Analytics -> DebugView. Play a level; you should see `level_started` / `level_completed`.
6. **Google Play Data safety form**: declare *App activity / App interactions* collected for
   *Analytics* (anonymous). Update your privacy policy (the template already mentions analytics).
7. Don't commit `google-services.json` if your repository is public (it isn't secret, but it ties
   the build to your project).

## Adding an event
Add a line to `AnalyticsEvents` in `src/analytics/events.ts`, then call `track('name', {...})`.
The compiler rejects wrong names and wrong parameters.
