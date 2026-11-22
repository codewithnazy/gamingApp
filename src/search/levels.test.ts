import test from 'node:test';
import assert from 'node:assert/strict';
import { cellsOf, generatePuzzleFromSpec, wordFromCells } from './engine.ts';
import {
  EMPTY_PROGRESS,
  MAX_LEVELS,
  WORLD_COUNT,
  WORLD_SIZE,
  generateLevelPuzzle,
  getWorld,
  levelConfig,
  maskWord,
  recordLevelResult,
  sanitizeProgress,
  totalStars,
  worldOf,
} from './levels.ts';
import { ALL_WORDS, MIXED_THEME, THEMES, themeById } from './themes.ts';

const levels = Array.from({ length: MAX_LEVELS }, (_, i) => i + 1);

test('difficulty never decreases from one level to the next', () => {
  for (const lv of levels.slice(1)) {
    const a = levelConfig(lv - 1);
    const b = levelConfig(lv);
    assert.ok(b.size >= a.size, `size dropped at level ${lv}`);
    assert.ok(b.wordCount >= a.wordCount, `word count dropped at level ${lv}`);
    assert.ok(b.dirs.length >= a.dirs.length, `directions dropped at level ${lv}`);
    assert.ok(b.minLen >= a.minLen, `min word length dropped at level ${lv}`);
    assert.ok(b.maxLen >= a.maxLen, `max word length dropped at level ${lv}`);
    assert.ok(b.decoy >= a.decoy, `decoy level dropped at level ${lv}`);
  }
  assert.equal(levelConfig(1).size, 6);
  assert.equal(levelConfig(1).wordCount, 4);
  assert.equal(levelConfig(MAX_LEVELS).size, 12);
  assert.equal(levelConfig(MAX_LEVELS).wordCount, 16);
});

test('there are at least 500 levels, and no level asks for more than the grid can hold', () => {
  assert.ok(MAX_LEVELS >= 500);
  for (const lv of levels) {
    const c = levelConfig(lv);
    assert.ok(c.size <= 12 && c.wordCount <= 16, `level ${lv}`);
    assert.ok(c.maxLen <= c.size || c.size === 12, `level ${lv}: words longer than the grid`);
    assert.ok(c.maxLen <= 10 && c.minLen <= c.maxLen, `level ${lv}: bad length range`);
  }
});

test('worlds tile the levels exactly: 25 worlds of 20, contiguous, uniquely named', () => {
  assert.equal(WORLD_COUNT * WORLD_SIZE, MAX_LEVELS);
  const names = new Set<string>();
  let expectedFirst = 1;
  for (let w = 1; w <= WORLD_COUNT; w++) {
    const world = getWorld(w);
    assert.equal(world.firstLevel, expectedFirst);
    assert.equal(world.lastLevel - world.firstLevel + 1, WORLD_SIZE);
    assert.ok(world.name && world.emoji);
    names.add(world.name);
    expectedFirst = world.lastLevel + 1;
  }
  assert.equal(names.size, WORLD_COUNT);
  assert.equal(worldOf(1), 1);
  assert.equal(worldOf(20), 1);
  assert.equal(worldOf(21), 2);
  assert.equal(worldOf(MAX_LEVELS), WORLD_COUNT);
  assert.equal(getWorld(999).number, WORLD_COUNT, 'out-of-range worlds are clamped');
});

test('mystery levels start at 30 and come every 10th level', () => {
  const mystery = levels.filter((lv) => levelConfig(lv).mystery);
  assert.equal(mystery[0], 30);
  assert.ok(mystery.every((lv) => lv % 10 === 0 && lv >= 30));
  assert.equal(mystery.length, (MAX_LEVELS - 30) / 10 + 1);
  assert.ok(!levelConfig(10).mystery && !levelConfig(20).mystery && !levelConfig(31).mystery);
});

test('decoys ramp in from level 20 up to a cap', () => {
  assert.equal(levelConfig(19).decoy, 0);
  assert.equal(levelConfig(20).decoy, 0);
  assert.ok(levelConfig(60).decoy > 0 && levelConfig(60).decoy < levelConfig(200).decoy);
  assert.equal(levelConfig(MAX_LEVELS).decoy, 0.75);
});

test('maskWord shows only the first letter and the length', () => {
  assert.equal(maskWord('CAMEL'), 'C • • • •');
  assert.equal(maskWord('ANTLION').replace(/ /g, '').length, 7);
});

test('full decoy fills the grid only with letters from the hidden words', () => {
  const p = generatePuzzleFromSpec({
    pool: THEMES[0].words,
    size: 10,
    wordCount: 6,
    dirs: [[0, 1], [1, 0]],
    minLen: 4,
    maxLen: 8,
    seed: 5,
    decoy: 1,
  });
  const allowed = new Set(p.placements.flatMap((pl) => pl.word.split('')));
  for (const row of p.grid) for (const ch of row) assert.ok(allowed.has(ch), `${ch} is not a letter of any hidden word`);
});

test('decoy 0 leaves puzzles unchanged compared with no decoy option', () => {
  const base = { pool: THEMES[1].words, size: 8, wordCount: 5, dirs: [[0, 1], [1, 0]] as [number, number][], minLen: 4, maxLen: 7, seed: 9 };
  assert.deepEqual(generatePuzzleFromSpec(base), generatePuzzleFromSpec({ ...base, decoy: 0 }));
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
    const tag = `level ${lv} (${c.size}x${c.size})`;
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

// ---- Jumbled themes ------------------------------------------------------------

const themesOf = (word: string) => THEMES.filter((t) => t.words.includes(word)).map((t) => t.id);

test('every level jumbles words from several themes instead of sticking to one', () => {
  for (const lv of levels) {
    const words = generateLevelPuzzle(lv).placements.map((p) => p.word);
    const touched = new Set(words.flatMap(themesOf));
    // "All words in one theme" must never happen.
    const oneTheme = THEMES.some((t) => words.every((w) => t.words.includes(w)));
    assert.ok(!oneTheme, `level ${lv}: every word comes from a single theme`);
    assert.ok(touched.size >= 3, `level ${lv}: only ${touched.size} themes represented`);
    assert.equal(new Set(words).size, words.length, `level ${lv}: repeated word`);
  }
});

test('big levels mix many themes at once', () => {
  for (const lv of [60, 117, 200, 350, 500]) {
    const words = generateLevelPuzzle(lv).placements.map((p) => p.word);
    const touched = new Set(words.flatMap(themesOf));
    assert.ok(touched.size >= 8, `level ${lv}: only ${touched.size} themes among ${words.length} words`);
  }
});

test('across the campaign, players meet a large share of the whole word pool', () => {
  const seen = new Set<string>();
  for (const lv of levels) for (const p of generateLevelPuzzle(lv).placements) seen.add(p.word);
  assert.ok(ALL_WORDS.length >= 1500, `word pool shrank to ${ALL_WORDS.length}`);
  assert.ok(seen.size >= ALL_WORDS.length * 0.6, `only ${seen.size} of ${ALL_WORDS.length} words ever appear`);
});

test('the Mixed theme is every word from every theme', () => {
  assert.equal(themeById('mixed'), MIXED_THEME);
  assert.deepEqual(new Set(MIXED_THEME.words), new Set(THEMES.flatMap((t) => t.words)));
  assert.equal(new Set(MIXED_THEME.words).size, MIXED_THEME.words.length, 'no duplicates in the mixed pool');
  assert.ok(THEMES.every((t) => t.id !== 'mixed'), 'mixed is virtual, not a real theme');
});

test('level tiles get a tier icon, not a theme', () => {
  assert.ok(levels.every((lv) => levelConfig(lv).icon.length > 0));
  assert.notEqual(levelConfig(1).icon, levelConfig(MAX_LEVELS).icon);
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
  const p = sanitizeProgress({ unlocked: 4, stars: { '1': 3, '2': 7, abc: 2, '9999': 1 }, best: { '1': 30, '2': -1, '3': 'x' } });
  assert.deepEqual(p.stars, { '1': 3 });
  assert.deepEqual(p.best, { '1': 30 });
});

test('progress from the old 30-level campaign carries on to level 31', () => {
  // Finishing the old last level (30) could not unlock anything then; it should now.
  const old = sanitizeProgress({ unlocked: 30, stars: { '29': 3, '30': 2 }, best: {} });
  assert.equal(old.unlocked, 31);
  // An in-progress save is left alone.
  assert.equal(sanitizeProgress({ unlocked: 12, stars: { '11': 3 }, best: {} }).unlocked, 12);
  // Never beyond the last level.
  assert.equal(sanitizeProgress({ unlocked: MAX_LEVELS, stars: { [String(MAX_LEVELS)]: 3 }, best: {} }).unlocked, MAX_LEVELS);
});

test('totalStars adds up', () => {
  assert.equal(totalStars({ unlocked: 4, stars: { '1': 3, '2': 2, '3': 1 }, best: {} }), 6);
  assert.equal(totalStars(EMPTY_PROGRESS), 0);
});
