import test from 'node:test';
import assert from 'node:assert/strict';
import { EMPTY_ECONOMY, EMPTY_STREAK, isDateKey, sanitizeEconomy, type EconomyState } from '../economy/ledger.ts';
import { REWARDS } from '../economy/rewards.ts';
import { createEconomyStore, type EconomyStorage } from '../economy/store.ts';
import { cellsOf, wordFromCells } from '../search/engine.ts';
import { dailySeed, dailySpec, generateDailyPuzzle } from './challenge.ts';
import {
  canClaimDaily,
  claimDailyReward,
  completeDailyChallenge,
  dailyChallengeDone,
  recordPuzzlePlayed,
} from './rewards.ts';
import { STREAK_MILESTONES, displayStreak, previousDay, recordPlay, streakAtRisk } from './streak.ts';

// ---- dates ---------------------------------------------------------------------------------------

test('previousDay handles month, year and leap-year boundaries', () => {
  assert.equal(previousDay('2026-03-01'), '2026-02-28');
  assert.equal(previousDay('2028-03-01'), '2028-02-29');
  assert.equal(previousDay('2026-01-01'), '2025-12-31');
  assert.equal(previousDay('2026-11-22'), '2026-11-21');
});

test('isDateKey accepts real dates only', () => {
  assert.ok(isDateKey('2026-11-22'));
  assert.ok(!isDateKey('2026-02-30'));
  assert.ok(!isDateKey('2026-13-01'));
  assert.ok(!isDateKey('22-11-2026'));
  assert.ok(!isDateKey(20261122));
  assert.ok(!isDateKey(null));
});

// ---- streak --------------------------------------------------------------------------------------

test('streak: first puzzle starts it at 1; a second puzzle the same day changes nothing', () => {
  const a = recordPlay(EMPTY_STREAK, '2026-11-22');
  assert.equal(a.state.current, 1);
  assert.equal(a.changed, true);
  const b = recordPlay(a.state, '2026-11-22');
  assert.equal(b.changed, false);
  assert.equal(b.state, a.state, 'same object: no spurious update');
  assert.equal(b.milestone, null);
});

test('streak: consecutive days add up, across month and year boundaries', () => {
  let s = EMPTY_STREAK;
  for (const d of ['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02']) s = recordPlay(s, d).state;
  assert.equal(s.current, 4);
  assert.equal(s.best, 4);
  assert.equal(s.lastDate, '2027-01-02');
});

test('streak: missing a day restarts at 1 but keeps the best', () => {
  let s = EMPTY_STREAK;
  for (const d of ['2026-11-01', '2026-11-02', '2026-11-03']) s = recordPlay(s, d).state;
  assert.equal(s.current, 3);
  const after = recordPlay(s, '2026-11-05').state; // skipped the 4th
  assert.equal(after.current, 1);
  assert.equal(after.best, 3);
});

test('streak: a clock moved BACKWARDS never resets or double-counts', () => {
  let s = recordPlay(recordPlay(EMPTY_STREAK, '2026-11-10').state, '2026-11-11').state;
  const back = recordPlay(s, '2026-11-05');
  assert.equal(back.changed, false);
  assert.equal(back.state.current, 2);
});

test('streak: milestones fire exactly at 3, 7, 14, 30 and only then', () => {
  let s = EMPTY_STREAK;
  const hits: number[] = [];
  for (let i = 0; i < 31; i++) {
    const day = new Date(2026, 11, 1 + i); // 31 consecutive days from 1 Dec 2026
    const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    const u = recordPlay(s, key);
    s = u.state;
    if (u.milestone) hits.push(u.milestone);
  }
  assert.equal(s.current, 31);
  assert.deepEqual(hits, [3, 7, 14, 30]);
  assert.deepEqual([...STREAK_MILESTONES].slice(0, 4), [3, 7, 14, 30]);
});

test('displayStreak: alive today or yesterday, 0 once lapsed; atRisk only the morning after', () => {
  const s = { current: 5, best: 9, lastDate: '2026-11-21' };
  assert.equal(displayStreak(s, '2026-11-21'), 5, 'played today');
  assert.equal(displayStreak(s, '2026-11-22'), 5, 'played yesterday: still alive');
  assert.equal(displayStreak(s, '2026-11-23'), 0, 'a full day missed');
  assert.equal(displayStreak(EMPTY_STREAK, '2026-11-22'), 0);
  assert.equal(streakAtRisk(s, '2026-11-22'), true);
  assert.equal(streakAtRisk(s, '2026-11-21'), false);
  assert.equal(streakAtRisk(s, '2026-11-23'), false);
});

test('recordPuzzlePlayed folds the streak into the economy state (once a day)', () => {
  const a = recordPuzzlePlayed(EMPTY_ECONOMY, '2026-11-22');
  assert.equal(a.economy.streak.current, 1);
  const b = recordPuzzlePlayed(a.economy, '2026-11-22');
  assert.equal(b.economy, a.economy, 'unchanged object when already counted');
});

// ---- daily login reward ----------------------------------------------------------------------------

test('daily reward: 20 coins, once per calendar day', () => {
  assert.equal(REWARDS.dailyLogin, 20);
  const a = claimDailyReward(EMPTY_ECONOMY, '2026-11-22');
  assert.equal(a.claimed, true);
  assert.equal(a.state.coins, 20);
  assert.equal(a.state.daily.lastClaim, '2026-11-22');
  const again = claimDailyReward(a.state, '2026-11-22');
  assert.equal(again.claimed, false);
  assert.equal(again.state.coins, 20, 'no second payout the same day');
  const tomorrow = claimDailyReward(a.state, '2026-11-23');
  assert.equal(tomorrow.claimed, true);
  assert.equal(tomorrow.state.coins, 40);
});

test('daily reward: moving the clock back cannot re-open a claimed day', () => {
  const a = claimDailyReward(EMPTY_ECONOMY, '2026-11-22').state;
  assert.equal(canClaimDaily(a, '2026-11-21'), false);
  assert.equal(claimDailyReward(a, '2026-11-21').claimed, false);
  assert.equal(claimDailyReward(a, '2026-11-21').state.coins, 20);
});

test('daily reward: if coins were saved but the "claimed" marker was not, it just marks the day (no second payout)', () => {
  const crashed: EconomyState = { ...EMPTY_ECONOMY, coins: 20, granted: { 'daily:login:2026-11-22': true } };
  const r = claimDailyReward(crashed, '2026-11-22');
  assert.equal(r.claimed, false);
  assert.equal(r.state.coins, 20);
  assert.equal(r.state.daily.lastClaim, '2026-11-22');
});

// ---- daily challenge -------------------------------------------------------------------------------

test('daily challenge: the same date gives the same puzzle for everyone', () => {
  assert.deepEqual(generateDailyPuzzle('2026-11-22'), generateDailyPuzzle('2026-11-22'));
  assert.equal(dailySeed('2026-11-22'), dailySeed('2026-11-22'));
});

test('daily challenge: every day is different', () => {
  const seen = new Set<string>();
  for (let d = 1; d <= 28; d++) seen.add(generateDailyPuzzle(`2026-02-${String(d).padStart(2, '0')}`).grid.flat().join(''));
  assert.equal(seen.size, 28, '28 distinct puzzles in February');
});

test('daily challenge: a whole leap year generates complete, valid puzzles (weekends are bigger)', () => {
  let weekends = 0;
  for (let i = 0; i < 366; i++) {
    const t = new Date(2028, 0, 1 + i);
    const key = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
    const spec = dailySpec(key);
    const p = generateDailyPuzzle(key);
    assert.equal(p.size, spec.size, key);
    assert.equal(p.placements.length, spec.wordCount, `${key}: not all words placed`);
    for (const pl of p.placements) assert.equal(wordFromCells(p.grid, cellsOf(pl)), pl.word, `${key}: ${pl.word}`);
    if (spec.size === 12) weekends++;
  }
  assert.ok(weekends >= 104 && weekends <= 106, `~104-105 weekend days in a year, got ${weekends}`);
});

test('daily challenge: pays once per day, never on replays; completion is remembered', () => {
  assert.equal(REWARDS.dailyChallenge, 25);
  assert.equal(dailyChallengeDone(EMPTY_ECONOMY, '2026-11-22'), false);
  const a = completeDailyChallenge(EMPTY_ECONOMY, '2026-11-22');
  assert.equal(a.rewarded, true);
  assert.equal(a.state.coins, 25);
  assert.equal(dailyChallengeDone(a.state, '2026-11-22'), true);
  const replay = completeDailyChallenge(a.state, '2026-11-22');
  assert.equal(replay.rewarded, false);
  assert.equal(replay.state.coins, 25);
  assert.equal(dailyChallengeDone(a.state, '2026-11-23'), false, 'tomorrow is a new challenge');
  const next = completeDailyChallenge(a.state, '2026-11-23');
  assert.equal(next.state.coins, 50);
});

test('daily challenge: completion saved but coins missing is repaired without double pay', () => {
  const s: EconomyState = { ...EMPTY_ECONOMY, coins: 25, granted: { 'daily:challenge:2026-11-22': true } };
  const r = completeDailyChallenge(s, '2026-11-22');
  assert.equal(r.rewarded, false);
  assert.equal(r.state.coins, 25);
  assert.equal(dailyChallengeDone(r.state, '2026-11-22'), true);
});

// ---- persistence of the new fields -------------------------------------------------------------------

test('old saved data (coins only) loads with safe defaults for the new fields', () => {
  const s = sanitizeEconomy({ version: 1, coins: 40, granted: { 'level:1:complete': true }, recent: [] });
  assert.equal(s.coins, 40);
  assert.deepEqual(s.daily, { lastClaim: null });
  assert.deepEqual(s.challenge, { lastCompleted: null });
  assert.deepEqual(s.streak, EMPTY_STREAK);
  assert.equal(s.adsRemoved, false);
});

test('junk in the new fields is repaired', () => {
  const s = sanitizeEconomy({
    coins: 5,
    daily: { lastClaim: 'yesterday' },
    challenge: { lastCompleted: '2026-02-31' },
    streak: { current: -4, best: 'many', lastDate: 7 },
    adsRemoved: 'yes',
  });
  assert.equal(s.daily.lastClaim, null);
  assert.equal(s.challenge.lastCompleted, null);
  assert.deepEqual(s.streak, EMPTY_STREAK);
  assert.equal(s.adsRemoved, false, 'only a real boolean true grants the entitlement');
  const ok = sanitizeEconomy({ streak: { current: 5, best: 3, lastDate: '2026-11-22' }, adsRemoved: true });
  assert.deepEqual(ok.streak, { current: 5, best: 5, lastDate: '2026-11-22' }, 'best is never below current');
  assert.equal(ok.adsRemoved, true);
});

function memoryStorage(initial: unknown = null) {
  const writes: EconomyState[] = [];
  let disk: unknown = initial;
  const storage: EconomyStorage = {
    load: async () => disk,
    save: async (s) => {
      writes.push(s);
      disk = JSON.parse(JSON.stringify(s));
    },
  };
  return { storage, writes };
}

test('store.transact: coins and the claimed marker are saved in ONE write', async () => {
  const mem = memoryStorage();
  const store = createEconomyStore(mem.storage);
  await store.init();
  const claimed = store.transact((s) => {
    const r = claimDailyReward(s, '2026-11-22');
    return { state: r.state, result: r.claimed, gain: r.claimed ? { amount: r.amount, reason: 'daily-login' } : undefined };
  });
  await store.flush();
  assert.equal(claimed, true);
  assert.equal(mem.writes.length, 1, 'one atomic snapshot, never a half-claimed state');
  assert.equal(mem.writes[0].coins, 20);
  assert.equal(mem.writes[0].daily.lastClaim, '2026-11-22');
});

test('store.transact: a no-op transition writes nothing and announces nothing', async () => {
  const mem = memoryStorage();
  const store = createEconomyStore(mem.storage);
  await store.init();
  const gains: number[] = [];
  store.onGain((g) => gains.push(g.amount));
  const run = () =>
    store.transact((s) => {
      const r = claimDailyReward(s, '2026-11-22');
      return { state: r.state, result: r.claimed, gain: r.claimed ? { amount: r.amount, reason: 'daily-login' } : undefined };
    });
  assert.equal(run(), true);
  assert.equal(run(), false); // double tap / re-open
  await store.flush();
  assert.equal(mem.writes.length, 1);
  assert.deepEqual(gains, [20]);
});

test('streak + daily + challenge all survive an app restart', async () => {
  const mem = memoryStorage();
  const a = createEconomyStore(mem.storage);
  await a.init();
  a.transact((s) => ({ state: claimDailyReward(s, '2026-11-22').state, result: 0 }));
  a.transact((s) => ({ state: completeDailyChallenge(s, '2026-11-22').state, result: 0 }));
  a.transact((s) => ({ state: recordPuzzlePlayed(s, '2026-11-22').economy, result: 0 }));
  await a.flush();

  const b = createEconomyStore(mem.storage); // restart
  await b.init();
  const s = b.getState();
  assert.equal(s.coins, 45);
  assert.equal(canClaimDaily(s, '2026-11-22'), false, 'still claimed after restart');
  assert.equal(dailyChallengeDone(s, '2026-11-22'), true);
  assert.equal(s.streak.current, 1);
  assert.equal(completeDailyChallenge(s, '2026-11-22').rewarded, false);
});
