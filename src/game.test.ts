// Run with: npm test  (Node's built-in runner, no extra dependencies)
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EMPTY_STATS,
  MAX_GUESSES,
  applyGuess,
  applySteal,
  canSteal,
  computeScore,
  dailyAnswer,
  dateKey,
  evaluateGuess,
  isValidGuess,
  letterStates,
  newGame,
  pickStealPosition,
  previousDateKey,
  recordResult,
  shareText,
} from './game.ts';
import { ANSWERS, EXTRA_GUESSES, VALID_GUESSES } from './words.ts';

test('word lists are clean 5-letter uppercase words with no duplicates', () => {
  for (const w of [...ANSWERS, ...EXTRA_GUESSES]) {
    assert.match(w, /^[A-Z]{5}$/, `bad word: ${w}`);
  }
  assert.equal(new Set(ANSWERS).size, ANSWERS.length, 'duplicate answers');
  assert.equal(new Set(EXTRA_GUESSES).size, EXTRA_GUESSES.length, 'duplicate extras');
  assert.equal(
    VALID_GUESSES.size,
    ANSWERS.length + EXTRA_GUESSES.length,
    'a word is in both lists',
  );
});

test('daily answer is deterministic and always valid', () => {
  assert.equal(dailyAnswer('2026-11-22'), dailyAnswer('2026-11-22'));
  for (let d = 1; d <= 28; d++) {
    const key = `2026-02-${String(d).padStart(2, '0')}`;
    assert.ok(isValidGuess(dailyAnswer(key)));
  }
});

test('evaluateGuess marks correct / present / absent', () => {
  assert.deepEqual(evaluateGuess('CRANE', 'CRANE'), Array(5).fill('correct'));
  assert.deepEqual(evaluateGuess('ABOUT', 'CRANE'), ['present', 'absent', 'absent', 'absent', 'absent']);
});

test('evaluateGuess handles repeated letters', () => {
  // Only one E in the answer: first E is green, the other must be gray.
  assert.deepEqual(evaluateGuess('EERIE', 'CRANE'), ['absent', 'absent', 'present', 'absent', 'correct']);
  // Two Ls in the answer, guess has three: two colored, one gray.
  assert.deepEqual(evaluateGuess('LLAMA', 'HELLO'), ['present', 'present', 'absent', 'absent', 'absent']);
});

test('isValidGuess rejects unknown words and wrong lengths', () => {
  assert.ok(isValidGuess('crane'));
  assert.ok(!isValidGuess('zzzzz'));
  assert.ok(!isValidGuess('cat'));
});

test('winning and losing', () => {
  let s = newGame('2026-11-22');
  s = applyGuess(s, 'ABOUT', 'CRANE');
  assert.equal(s.status, 'playing');
  s = applyGuess(s, 'CRANE', 'CRANE');
  assert.equal(s.status, 'won');
  assert.equal(applyGuess(s, 'ABOUT', 'CRANE'), s, 'no guesses after the game ends');

  let l = newGame('2026-11-22');
  for (let i = 0; i < MAX_GUESSES; i++) l = applyGuess(l, 'ABOUT', 'CRANE');
  assert.equal(l.status, 'lost');
});

test('steal reveals an unsolved position, once per game', () => {
  const answer = 'CRANE';
  let s = newGame('2026-11-22');
  s = applyGuess(s, 'CRATE', answer); // C, R, A, E are green; only N (index 3) is open
  assert.equal(pickStealPosition(s.date, answer, s.guesses, s.steals), 3);
  assert.ok(canSteal(s, answer));
  s = applySteal(s, answer);
  assert.deepEqual(s.steals, [3]);
  assert.ok(!canSteal(s, answer), 'second steal is blocked');
  assert.equal(applySteal(s, answer), s);
});

test('stolen letters color the keyboard green', () => {
  const states = letterStates([], 'CRANE', [3]);
  assert.equal(states['N'], 'correct');
});

test('scoring', () => {
  assert.equal(computeScore('won', 1, 0), 600);
  assert.equal(computeScore('won', 6, 0), 100);
  assert.equal(computeScore('won', 3, 1), 400 - 150);
  assert.equal(computeScore('won', 6, 1), 50, 'floored at 50');
  assert.equal(computeScore('lost', 6, 0), 0);
});

test('streaks continue on consecutive days and reset on a gap or loss', () => {
  const win = (date: string, guesses = ['CRANE']) => ({
    ...newGame(date),
    guesses,
    status: 'won' as const,
  });
  let stats = recordResult(EMPTY_STATS, win('2026-11-20'));
  stats = recordResult(stats, win('2026-11-21'));
  assert.equal(stats.currentStreak, 2);
  stats = recordResult(stats, win('2026-11-23')); // skipped the 22nd
  assert.equal(stats.currentStreak, 1);
  assert.equal(stats.maxStreak, 2);
  stats = recordResult(stats, { ...newGame('2026-11-24'), guesses: Array(6).fill('ABOUT'), status: 'lost' });
  assert.equal(stats.currentStreak, 0);
  assert.equal(stats.played, 4);
  assert.equal(stats.wins, 3);
  assert.equal(stats.distribution[0], 3);
});

test('previousDateKey crosses month and year boundaries', () => {
  assert.equal(previousDateKey('2026-03-01'), '2026-02-28');
  assert.equal(previousDateKey('2026-01-01'), '2025-12-31');
  assert.equal(dateKey(new Date(2026, 10, 22)), '2026-11-22');
});

test('shareText has a result line and one emoji row per guess', () => {
  const s = applySteal(applyGuess(newGame('2026-11-22'), 'CRANE', 'CRANE'), 'CRANE');
  const text = shareText({ ...s, steals: [0] }, 'CRANE');
  assert.match(text, /^Word Heist 2026-11-22 1\/6 🕶️×1 · 450 pts/);
  assert.match(text, /🟩🟩🟩🟩🟩$/);
});
