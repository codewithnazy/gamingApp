# Word Arcade 🎯

A colourful word-game collection for mobile (React Native + Expo, TypeScript).

## Games

### 🔎 Word Search
Drag across the letters to find every hidden word, forwards or backwards.

**🏆 Levels** — 30 levels that get steadily harder. Finish a level to unlock the next one
and earn up to ⭐⭐⭐ (3 stars with no hints, 2 with up to two hints, otherwise 1).

| Levels | Tier | What changes |
|---|---|---|
| 1–4 | Warm-up | 6×6 grids, words run across and down |
| 5–9 | Diagonals | + diagonal words |
| 10–19 | Backwards | every direction, even backwards; longer words |
| 20–30 | Expert | 6–8 letter words only, up to 12×12 with 12 words |

The grid grows every 3 levels (6×6 → 12×12), the word count every 2 levels (4 → 12), and the
theme changes each level. A level is always the same puzzle, so replays are fair; progress,
stars and best times are saved on the device.

**🎲 Quick play** — pick your own theme and difficulty for a fresh random puzzle.

**Options** (saved between sessions):

| Option | Choices |
|---|---|
| Theme (Quick play) | Animals, Food, Space, Ocean, Sports, Countries, Gaming |
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

## Layout

- `App.tsx` — screen navigation, settings and best-times state, Android back button
- `src/search/engine.ts` — pure word-search logic: puzzle generation, drag snapping, matching
- `src/search/levels.ts` — level configs, level puzzles, progress and unlocking
- `src/search/themes.ts` — word lists, background palettes, found-word colours
- `src/screens/` — `HomeScreen`, `SearchSetupScreen`, `SearchPlayScreen`, `HeistScreen`
- `src/components/` — `GradientBackground`, and the Word Heist `Board`/`Keyboard`/modals
- `src/game.ts` — pure Word Heist logic
- `src/*.test.ts`, `src/search/*.test.ts` — tests (including word-list validation)
- `src/storage.ts`, `src/settings.ts` — AsyncStorage persistence

## Notes and next steps

- Word lists are small (about 30 words per theme). Add more to `src/search/themes.ts`;
  the tests validate every list against all three difficulties.
- Ideas: a daily seeded puzzle, more than 30 levels, custom word lists, more themes, sound effects.
- Word Heist's daily word uses the device's local date, and its rival is flavour text
  (no backend).
- `bundleIdentifier` / `package` in `app.json` are placeholders
  (`com.example.wordheist`) — change them before building for the stores.
