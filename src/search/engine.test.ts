import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_DIRS,
  DIFFICULTIES,
  cellsOf,
  formatTime,
  generatePuzzle,
  matchWord,
  mulberry32,
  pickWords,
  snapLine,
  starsFor,
  wordFromCells,
  type Difficulty,
} from './engine.ts';
import { FOUND_COLORS, PALETTES, THEMES } from './themes.ts';

const DIFFS: Difficulty[] = ['easy', 'medium', 'hard'];

test('theme word lists are clean and big enough for every difficulty', () => {
  for (const t of THEMES) {
    assert.equal(new Set(t.words).size, t.words.length, `${t.id}: duplicate words`);
    for (const w of t.words) assert.match(w, /^[A-Z]{4,8}$/, `${t.id}: bad word ${w}`);
    for (const d of DIFFS) {
      const cfg = DIFFICULTIES[d];
      const usable = t.words.filter((w) => w.length >= cfg.minLen && w.length <= cfg.maxLen);
      assert.ok(usable.length >= cfg.wordCount + 8, `${t.id}/${d}: only ${usable.length} usable words`);
    }
  }
});

test('palettes and found colors are well-formed', () => {
  assert.equal(new Set(PALETTES.map((p) => p.id)).size, PALETTES.length);
  for (const p of PALETTES) for (const c of [...p.colors, p.bubble]) assert.match(c, /^#[0-9a-f]{6}$/i);
  for (const c of FOUND_COLORS) assert.match(c, /^#[0-9a-f]{6}$/i);
  assert.ok(FOUND_COLORS.length >= DIFFICULTIES.hard.wordCount, 'need a color per word');
});

test('every theme x difficulty generates a valid, complete puzzle for many seeds', () => {
  for (const t of THEMES) {
    for (const d of DIFFS) {
      for (let seed = 1; seed <= 25; seed++) {
        const cfg = DIFFICULTIES[d];
        const p = generatePuzzle({ pool: t.words, difficulty: d, seed });
        const tag = `${t.id}/${d}/seed ${seed}`;

        assert.equal(p.size, cfg.size, tag);
        assert.equal(p.grid.length, cfg.size, tag);
        for (const row of p.grid) {
          assert.equal(row.length, cfg.size, tag);
          for (const ch of row) assert.match(ch, /^[A-Z]$/, tag);
        }
        assert.equal(p.placements.length, cfg.wordCount, `${tag}: not all words placed`);

        for (const pl of p.placements) {
          assert.ok(t.words.includes(pl.word), tag);
          const cells = cellsOf(pl);
          for (const c of cells) {
            assert.ok(c.row >= 0 && c.row < cfg.size && c.col >= 0 && c.col < cfg.size, `${tag}: out of bounds`);
          }
          assert.equal(wordFromCells(p.grid, cells), pl.word, `${tag}: grid does not spell ${pl.word}`);
          assert.ok(
            cfg.dirs.some(([r, c]) => r === pl.dr && c === pl.dc),
            `${tag}: direction not allowed for ${d}`,
          );
        }
      }
    }
  }
});

test('puzzles are reproducible from a seed and differ across seeds', () => {
  const animals = THEMES[0].words;
  const a = generatePuzzle({ pool: animals, difficulty: 'medium', seed: 42 });
  const b = generatePuzzle({ pool: animals, difficulty: 'medium', seed: 42 });
  const c = generatePuzzle({ pool: animals, difficulty: 'medium', seed: 43 });
  assert.deepEqual(a, b);
  assert.notDeepEqual(a.grid, c.grid);
});

test('easy puzzles only run across and down; hard uses backwards directions somewhere', () => {
  const easyDirs = new Set<string>();
  const hardDirs = new Set<string>();
  for (let seed = 1; seed <= 20; seed++) {
    for (const p of generatePuzzle({ pool: THEMES[1].words, difficulty: 'easy', seed }).placements)
      easyDirs.add(`${p.dr},${p.dc}`);
    for (const p of generatePuzzle({ pool: THEMES[1].words, difficulty: 'hard', seed }).placements)
      hardDirs.add(`${p.dr},${p.dc}`);
  }
  assert.deepEqual([...easyDirs].sort(), ['0,1', '1,0']);
  assert.equal(hardDirs.size, ALL_DIRS.length, 'hard should use all 8 directions over 20 puzzles');
});

test('pickWords never picks a word that contains or reverses into another', () => {
  const rng = mulberry32(1);
  const picked = pickWords(['STAR', 'STARFISH', 'RATS', 'MOON', 'MOONS'], 5, 4, 8, rng);
  for (const a of picked)
    for (const b of picked) {
      if (a === b) continue;
      assert.ok(!a.includes(b) && !a.includes(b.split('').reverse().join('')), `${a} vs ${b}`);
    }
});

test('snapLine snaps drags to the 8 directions and clips to the grid', () => {
  const at = (row: number, col: number) => ({ row, col });
  const end = (cells: { row: number; col: number }[]) => cells[cells.length - 1];

  assert.deepEqual(snapLine(at(2, 2), at(2, 2), 8), [at(2, 2)]);
  assert.deepEqual(end(snapLine(at(2, 2), at(2, 6), 8)), at(2, 6)); // →
  assert.deepEqual(end(snapLine(at(2, 6), at(2, 2), 8)), at(2, 2)); // ←
  assert.deepEqual(end(snapLine(at(1, 1), at(5, 1), 8)), at(5, 1)); // ↓
  assert.deepEqual(end(snapLine(at(5, 1), at(1, 1), 8)), at(1, 1)); // ↑
  assert.deepEqual(end(snapLine(at(1, 1), at(4, 4), 8)), at(4, 4)); // ↘
  assert.deepEqual(end(snapLine(at(4, 1), at(1, 4), 8)), at(1, 4)); // ↗
  assert.deepEqual(end(snapLine(at(4, 4), at(1, 1), 8)), at(1, 1)); // ↖
  assert.deepEqual(end(snapLine(at(1, 4), at(4, 1), 8)), at(4, 1)); // ↙

  // A slightly off-axis drag snaps to the nearest line, not a crooked one.
  const nearlyHorizontal = snapLine(at(3, 0), at(4, 5), 8);
  assert.equal(nearlyHorizontal.length, 6);
  assert.ok(nearlyHorizontal.every((c) => c.row === 3));

  // Dragging past the edge is clipped to the last in-bounds cell.
  const clipped = snapLine(at(0, 5), at(0, 20), 8);
  assert.deepEqual(end(clipped), at(0, 7));
});

test('matchWord accepts a word forwards or backwards, and only unfound words', () => {
  const grid = [['C', 'A', 'T', 'X']];
  const cells = [0, 1, 2].map((col) => ({ row: 0, col }));
  assert.equal(matchWord(grid, cells, ['CAT', 'DOG']), 'CAT');
  assert.equal(matchWord(grid, [...cells].reverse(), ['CAT']), 'CAT'); // TAC reversed
  assert.equal(matchWord(grid, cells, ['DOG']), null);
  assert.equal(matchWord(grid, cells, []), null, 'already-found words are not in `remaining`');
  assert.equal(matchWord(grid, [cells[0]], ['CAT']), null, 'single cell never matches');
});

test('stars and time formatting', () => {
  assert.equal(starsFor(0), 3);
  assert.equal(starsFor(2), 2);
  assert.equal(starsFor(3), 1);
  assert.equal(formatTime(0), '0:00');
  assert.equal(formatTime(75), '1:15');
  assert.equal(formatTime(3601), '60:01');
});
