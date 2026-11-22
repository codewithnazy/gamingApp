# Word Heist 🕶️

A daily word-puzzle mobile game (React Native + Expo, TypeScript).

Everyone gets the same 5-letter word each day and has 6 guesses. The twist:
each day a rival "mark" holds a letter of the answer. **Once per day you can
steal one letter** from their board — it's revealed in position and turns the
keyboard key green — but it costs you **150 points**.

## Scoring

| Win in | Points |
|---|---|
| 1 guess | 600 |
| 2 | 500 |
| 3 | 400 |
| 4 | 300 |
| 5 | 200 |
| 6 | 100 |

Each steal subtracts 150 (minimum 50 for a win). A loss scores 0.

## Run it

```bash
npm install
npm start          # then scan the QR code with Expo Go, or press i / a / w
npm test           # game-logic tests (Node's built-in runner)
npm run typecheck
```

## Layout

- `App.tsx` — main screen, game flow, persistence wiring
- `src/game.ts` — pure game logic (evaluation, daily word, steals, scoring, streaks, sharing)
- `src/game.test.ts` — tests, including word-list validation
- `src/words.ts` — answer list and extra accepted guesses
- `src/storage.ts` — AsyncStorage save/load (today's game + stats)
- `src/components/` — `Board`, `Keyboard`, `ResultModal`

## Notes and next steps

- The daily word is derived from the **device's local date**, so the word rolls
  over at each player's local midnight. This is offline-only for now: there is
  no backend, so the rival is flavor text, not a real player.
- The built-in word list is small (~700 answers, ~375 extra guesses). Expand
  `src/words.ts` before shipping; the tests validate any additions.
- Ideas: real asynchronous rivals (a backend with daily boards and a
  leaderboard), push-notification reminders, hard mode, colorblind palette.
- `bundleIdentifier` / `package` in `app.json` are placeholders
  (`com.example.wordheist`) — change them before building for the stores.
