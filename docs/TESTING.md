# Testing

## Automated
```bash
npm test            # unit tests (Node's built-in runner): ledger, rewards, flows, ads policy,
                    # daily reward/challenge/streak, analytics, billing, search engine, levels
npm run typecheck   # tsc --noEmit
```
Build validation used while developing (all must pass):
```bash
npx tsc --noEmit
npm test
npx expo export --platform web --output-dir /tmp/web
npx expo export --platform android --output-dir /tmp/android   # Metro + Hermes bundle
npx expo prebuild --platform android --no-install              # in a scratch copy: native project generation
```
A full APK/AAB can only be built with the Android SDK (or EAS): `npx eas-cli@latest build --platform android --profile preview`.

## Browser preview (simulated ads)
`npx expo start --web`. Ads are simulated on web so every flow and failure mode can be exercised
through URL flags:

| URL flag | Effect |
|---|---|
| `?ads=ok` (default) | ads work and rewards are earned |
| `?ads=early` | the player closes the rewarded ad early (no reward) |
| `?ads=fail` | the ad SDK reports an error |
| `?ads=none` | no ad available (offline / no fill) |
| `?ads=slow` | the rewarded ad takes ~2.5 s to load (loading state) |
| `?adtest=1` | skip the 60 s start-up grace so interstitial rules can be tried quickly |

In the browser console, `__analyticsEvents()` lists the events that would be sent.

## Manual checklist (on a real phone, with a development/preview build and TEST ads)
- [ ] Complete a level: +10 coins (+5 with 3 stars); replaying pays nothing; reward summary shown.
- [ ] Hint with 50+ coins: coins drop by 50 and a word start is ringed. With fewer coins the option is disabled.
- [ ] Hint -> watch ad: hint appears only after the reward; close the ad early: no hint.
- [ ] Free Coins: +30 only after finishing the video; airplane mode shows a friendly message.
- [ ] Interstitial: appears only after tapping Continue, every ~3-4 finished levels, never in the first minute, never on Restart/Replay.
- [ ] Daily Reward: claim once; reopen the app: still claimed; next calendar day: claimable again.
- [ ] Daily Challenge: same puzzle on two phones on the same date; +25 once; "Completed Today".
- [ ] Streak: play on consecutive days; skip a day and it restarts.
- [ ] Kill the app during an ad / right after finishing a level: coins and progress are consistent on relaunch.
- [ ] Background the app while an ad is playing and come back: the game is not stuck.
- [ ] Settings -> Usage stats off: no analytics events.
