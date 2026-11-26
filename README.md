# Word Arcade 🎯

A colourful word-game collection for mobile (React Native + Expo, TypeScript).

## Games

### 🔎 Word Search
Drag across the letters to find every hidden word, forwards or backwards.

**🏆 Levels** — **500 levels** in 25 themed worlds of 20 (Meadow Start → Grand Summit). Finish a
level to unlock the next one and earn up to ⭐⭐⭐ (3 stars with no hints, 2 with up to two hints,
otherwise 1). Pick a world with the ‹ › arrows, or tap the summary card to jump to your level.

| Levels | Tier | What makes it harder |
|---|---|---|
| 1–4 | Warm-up | 6×6 grids, words across and down |
| 5–9 | Diagonals | adds diagonal words |
| 10–19 | Backwards | every direction, even backwards; grids grow to 12×12 |
| 20–59 | Expert | full 12×12 grids, up to 15 words |
| 60–199 | Master | **decoy letters** (filler borrowed from the hidden words) and words up to 10 letters |
| 200–500 | Legend | maximum decoys, 16 words |

Every 10th level from level 30 is a **❓ Mystery level**: the word list is hidden (you only see each
word's first letter and length) and hints say how long the word is, not what it is.

Words in every level are **jumbled from all themes together** (e.g. `NOODLE BOLTS IVORY MYTH`),
from a pool of about 1,700 words across 31 themes. A level is always the same puzzle, so replays are
fair; progress, stars and best times are saved on the device.

**🎲 Quick play** — a fresh random puzzle with your own difficulty. Words are **Mixed** (every theme
jumbled together) by default, or pick a single theme.

**Options** (saved between sessions):

| Option | Choices |
|---|---|
| Words (Quick play) | 🎲 Mixed (default), or one of 31 themes: Animals, Food, Space, Ocean, Sports, Countries, Gaming, Weather, Music, Jobs, Nature, Transport, Science, School, Home, Cities, Fantasy, Insects, Clothes, Kitchen, Colors, Birds, Fruits, Vegetables, Body, Emotions, Tools, Flowers, Toys, Dinosaurs, Festivals |
| Difficulty (Quick play) | **Easy** 8×8, 6 words, across/down · **Medium** 10×10, 8 words, + diagonals · **Hard** 12×12, 10 words, all 8 directions |
| Timer | On (records your best time per theme + difficulty) or off for a relaxed game |
| Haptics | On / off |
| Background | 6 gradient palettes: Sunset, Candy, Aurora, Ocean, Forest, Galaxy |

Each puzzle is freshly generated. 💡 Hints ring the first letter of a hidden word; finish
with no hints for ⭐⭐⭐.

### 🕶️ Word Heist
A daily 5-letter word puzzle (6 guesses). Once per day you can steal one letter from the
rival's board for −150 points.

## Run it

```bash
npm install
npm start          # then scan the QR code with Expo Go, or press i / a / w
npm test           # game-logic tests (Node's built-in runner)
npm run typecheck
```

## 🪙 Coins, daily rewards, streaks and ads

- **Coins:** +10 for a finished campaign level, +5 more for 3 stars (each paid once per level), +20 daily
  login, +25 daily challenge, +30 for watching a reward video. A hint costs **50 coins**.
- **Hint dialog:** *Need a hint?* - use 50 coins, watch an ad for a free hint, or cancel.
- **Free Coins:** a clearly labelled button on Home and level select (watch an ad -> +30).
- **Daily reward** (once a day), **Daily Challenge** (a new puzzle each day, the same for everyone) and a
  🔥 **streak** (finish a puzzle each day) - all on the Home screen.
- **Ads (Google AdMob)** - always test ads until you add your IDs: opt-in reward videos, a gentle
  between-levels ad (about every 3-4 puzzles, 2 min apart, never in the first minute, never on
  Restart/Replay) and banners on the menus only. **Expo Go shows no ads**; the browser preview
  simulates them. Real ads need a native build: `npx eas-cli@latest build --platform android --profile preview`.
- **Season Pass:** a 7-day pass with a free and a premium reward track (premium unlocked with coins),
  key progress, a live countdown, and a "Season Pass unlocks at Level 3!" locked banner. Plus a
  **No Ads** shortcut on Home.
- **Analytics** (typed, anonymous, consent-aware, with a "Usage stats" switch) and a prepared
  **Remove Ads** purchase.

Docs: [`ARCHITECTURE`](docs/ARCHITECTURE.md) · [`MONETIZATION` (AdMob setup)](docs/MONETIZATION.md) ·
[`SEASON_PASS`](docs/SEASON_PASS.md) · [`ANALYTICS` (Firebase)](docs/ANALYTICS.md) · [`BILLING` (Remove Ads)](docs/BILLING.md) ·
[`TESTING`](docs/TESTING.md) · [`PRIVACY_POLICY_TEMPLATE`](docs/PRIVACY_POLICY_TEMPLATE.md)

## Layout

- `App.tsx` — screen navigation, settings and best-times state, Android back button
- `src/search/engine.ts` — pure word-search logic: puzzle generation, drag snapping, matching
- `src/search/levels.ts` — 500 level configs, worlds, level puzzles, progress and unlocking
- `src/search/themes.ts` — themes, the mixed word pool, background palettes, found-word colours
- `src/search/moreWords.ts` — the extra words and new themes merged into the base lists
- `src/screens/` — `HomeScreen`, `SearchSetupScreen`, `SearchPlayScreen`, `HeistScreen`
- `src/components/` — `GradientBackground`, and the Word Heist `Board`/`Keyboard`/modals
- `src/game.ts` — pure Word Heist logic
- `src/*.test.ts`, `src/search/*.test.ts` — tests (including word-list validation)
- `src/economy/` — coin ledger, rewards, flows · `src/daily/` — daily reward, challenge, streak
- `src/ads/` — ad service: config, policy, AdMob layer (`adsImpl.ts`) and a web simulation
- `src/pass/` — Season Pass: calendar, rules, actions
- `src/analytics/` · `src/billing/` — analytics engine and Remove-Ads architecture
- `src/storage.ts`, `src/settings.ts` — AsyncStorage persistence

## Notes and next steps

- About 1,700 words. Across the 500 levels, roughly 88% of them appear and the typical word turns up
  about 5 times. Add more to `src/search/moreWords.ts` (A–Z only, 4–10 letters); the tests validate
  every word and check each theme is big enough for all three difficulties.
- Ideas: a daily seeded puzzle, custom word lists, more themes, sound effects.
- Word Heist's daily word uses the device's local date, and its rival is flavour text
  (no backend).
- `bundleIdentifier` / `package` in `app.json` are placeholders
  (`com.example.wordheist`) — change them before building for the stores.
