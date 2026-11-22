import test from 'node:test';
import assert from 'node:assert/strict';
import { cellsOf, wordFromCells } from './engine.ts';
import {
  EMPTY_PROGRESS,
  MAX_LEVELS,
  generateLevelPuzzle,
  levelConfig,
  recordLevelResult,
  sanitizeProgress,
  totalStars,
} from './levels.ts';

const levels = Array.from({ length: MAX_LEVELS }, (_, i) => i + 1);

test('difficulty never decreases from one level to the next', () => {
  for (const lv of levels.slice(1)) {
    const a = levelConfig(lv - 1);
    const b = levelConfig(lv);
    assert.ok(b.size >= a.size, `size dropped at level ${lv}`);
    assert.ok(b.wordCount >= a.wordCount, `word count dropped at level ${lv}`);
    assert.ok(b.dirs.length >= a.dirs.length, `directions dropped at level ${lv}`);
    assert.ok(b.minLen >= a.minLen, `min word length dropped at level ${lv}`);
  }
  assert.equal(levelConfig(1).size, 6);
  assert.equal(levelConfig(1).wordCount, 4);
  assert.equal(levelConfig(MAX_LEVELS).size, 12);
  assert.equal(levelConfig(MAX_LEVELS).wordCount, 12);
});

test('out-of-range level numbers are clamped', () => {
  assert.equal(levelConfig(0).level, 1);
  assert.equal(levelConfig(-5).level, 1);
  assert.equal(levelConfig(999).level, MAX_LEVELS);
  assert.equal(levelConfig(NaN).level, 1);
});

test('every level generates a complete, valid puzzle', () => {
  for (const lv of levels) {
    const c = levelConfig(lv);
    const p = generateLevelPuzzle(lv);
    const tag = `level ${lv} (${c.theme.id}, ${c.size}x${c.size})`;
    assert.equal(p.size, c.size, tag);
    assert.equal(p.placements.length, c.wordCount, `${tag}: not all words placed`);
    for (const pl of p.placements) {
      assert.ok(pl.word.length >= c.minLen && pl.word.length <= c.maxLen, `${tag}: ${pl.word} length out of range`);
      assert.ok(c.dirs.some(([r, col]) => r === pl.dr && col === pl.dc), `${tag}: direction not allowed`);
      const cells = cellsOf(pl);
      for (const cell of cells) assert.ok(cell.row >= 0 && cell.row < c.size && cell.col >= 0 && cell.col < c.size, tag);
      assert.equal(wordFromCells(p.grid, cells), pl.word, tag);
    }
  }
});

test('a level is the same puzzle every time (so replays and progress are fair)', () => {
  for (const lv of [1, 7, 15, 30]) assert.deepEqual(generateLevelPuzzle(lv), generateLevelPuzzle(lv));
  assert.notDeepEqual(generateLevelPuzzle(1).grid, generateLevelPuzzle(2).grid);
});

test('themes rotate so neighbouring levels feel different', () => {
  for (const lv of levels.slice(1)) assert.notEqual(levelConfig(lv).theme.id, levelConfig(lv - 1).theme.id);
});

test('completing the highest unlocked level unlocks the next one', () => {
  const r = recordLevelResult(EMPTY_PROGRESS, 1, 3, 42);
  assert.equal(r.progress.unlocked, 2);
  assert.equal(r.newlyUnlocked, true);
  assert.equal(r.newBest, true);
  assert.equal(r.newStars, true);
  assert.deepEqual(r.progress.stars, { '1': 3 });
  assert.deepEqual(r.progress.best, { '1': 42 });
});

test('replaying keeps the best stars and time and does not re-unlock', () => {
  let p = recordLevelResult(EMPTY_PROGRESS, 1, 3, 40).progress;
  const worse = recordLevelResult(p, 1, 1, 90);
  assert.equal(worse.newlyUnlocked, false);
  assert.equal(worse.newBest, false);
  assert.equal(worse.newStars, false);
  assert.equal(worse.progress.stars['1'], 3);
  assert.equal(worse.progress.best['1'], 40);
  assert.equal(worse.progress.unlocked, 2);
  const better = recordLevelResult(worse.progress, 1, 3, 25);
  assert.equal(better.progress.best['1'], 25);
});

test('replaying an old level never locks later ones', () => {
  let p = EMPTY_PROGRESS;
  for (let lv = 1; lv <= 5; lv++) p = recordLevelResult(p, lv, 2, null).progress;
  assert.equal(p.unlocked, 6);
  p = recordLevelResult(p, 2, 3, null).progress;
  assert.equal(p.unlocked, 6);
});

test('locked levels cannot be completed, and the last level caps unlocking', () => {
  const locked = recordLevelResult(EMPTY_PROGRESS, 5, 3, 10);
  assert.equal(locked.progress, EMPTY_PROGRESS);
  assert.equal(recordLevelResult(EMPTY_PROGRESS, 0, 3, 10).progress, EMPTY_PROGRESS);

  const allOpen = { ...EMPTY_PROGRESS, unlocked: MAX_LEVELS };
  const last = recordLevelResult(allOpen, MAX_LEVELS, 2, null);
  assert.equal(last.progress.unlocked, MAX_LEVELS);
  assert.equal(last.newlyUnlocked, false);
});

test('a null time (timer off) records stars but no best time', () => {
  const r = recordLevelResult(EMPTY_PROGRESS, 1, 2, null);
  assert.equal(r.newBest, false);
  assert.deepEqual(r.progress.best, {});
  assert.equal(r.progress.stars['1'], 2);
});

test('sanitizeProgress rejects junk and clamps', () => {
  assert.deepEqual(sanitizeProgress(null), EMPTY_PROGRESS);
  assert.deepEqual(sanitizeProgress('nope'), EMPTY_PROGRESS);
  assert.equal(sanitizeProgress({ unlocked: 9999 }).unlocked, MAX_LEVELS);
  assert.equal(sanitizeProgress({ unlocked: -3 }).unlocked, 1);
  assert.equal(sanitizeProgress({ unlocked: 'x' }).unlocked, 1);
  const p = sanitizeProgress({ unlocked: 4, stars: { '1': 3, '2': 7, abc: 2, '99': 1 }, best: { '1': 30, '2': -1, '3': 'x' } });
  assert.deepEqual(p.stars, { '1': 3 });
  assert.deepEqual(p.best, { '1': 30 });
});

test('totalStars adds up', () => {
  assert.equal(totalStars({ unlocked: 4, stars: { '1': 3, '2': 2, '3': 1 }, best: {} }), 6);
  assert.equal(totalStars(EMPTY_PROGRESS), 0);
});
