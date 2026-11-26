import test from 'node:test';
import assert from 'node:assert/strict';
import { EMPTY_ECONOMY, EMPTY_PASS, sanitizeEconomy, type EconomyState } from '../economy/ledger.ts';
import { createEconomyStore, type EconomyStorage } from '../economy/store.ts';
import {
  MAX_KEYS,
  PASS,
  activatePremium,
  claimAllRewards,
  claimReward,
  claimStatus,
  claimableCount,
  earnKey,
  effectivePass,
  hasPremium,
  isChest,
  rewardAmount,
  tierProgress,
  tierReached,
} from './pass.ts';
import { formatRemaining, msRemaining, seasonEnd, seasonIndex, seasonName } from './season.ts';

const rich = (coins: number): EconomyState => ({ ...EMPTY_ECONOMY, coins });
/** Earn `n` distinct keys in `season`. */
const withKeys = (s: EconomyState, season: number, n: number): EconomyState => {
  for (let i = 0; i < n; i++) s = earnKey(s, season, `level:${i + 1}`).state;
  return s;
};

// ---- season calendar ------------------------------------------------------------------------------

test('seasons run Monday to Monday and are the same for everyone on a date', () => {
  assert.equal(seasonIndex(new Date(2026, 0, 5)), 0, 'Mon 5 Jan 2026 starts season 0');
  assert.equal(seasonIndex(new Date(2026, 0, 11, 23, 59)), 0, 'Sunday night is still season 0');
  assert.equal(seasonIndex(new Date(2026, 0, 12)), 1, 'the next Monday starts season 1');
  assert.equal(seasonIndex(new Date(2026, 10, 22, 12)), 45, 'Sunday 22 Nov');
  assert.equal(seasonIndex(new Date(2026, 10, 23, 0, 0)), 46, 'Monday 23 Nov');
  assert.equal(seasonIndex(new Date(2026, 10, 26, 10)), 46, 'Thursday 26 Nov');
});

test('seasons continue across the new year; dates before the epoch clamp to season 0', () => {
  assert.equal(seasonIndex(new Date(2026, 11, 28)), 51);
  assert.equal(seasonIndex(new Date(2027, 0, 3)), 51, 'Sunday 3 Jan 2027');
  assert.equal(seasonIndex(new Date(2027, 0, 4)), 52, 'Monday 4 Jan 2027');
  assert.equal(seasonIndex(new Date(2025, 5, 1)), 0);
});

test('a season ends at local midnight on a Monday', () => {
  const end = seasonEnd(46);
  assert.equal(end.getDay(), 1, 'Monday');
  assert.deepEqual([end.getFullYear(), end.getMonth(), end.getDate(), end.getHours()], [2026, 10, 30, 0]);
  assert.equal(seasonIndex(end), 47, 'the end of a season is the start of the next');
});

test('the countdown reads like "3D 14H" and counts down', () => {
  assert.equal(formatRemaining(msRemaining(new Date(2026, 10, 26, 10, 0))), '3D 14H');
  assert.equal(formatRemaining(msRemaining(new Date(2026, 10, 29, 20, 0))), '4H 0M');
  assert.equal(formatRemaining(msRemaining(new Date(2026, 10, 29, 23, 30))), '30M');
  assert.equal(formatRemaining(msRemaining(new Date(2026, 10, 29, 23, 59, 30))), '<1M');
  assert.equal(formatRemaining(msRemaining(new Date(2026, 10, 30, 0, 0))), '7D 0H', 'a brand-new season');
});

test('season names rotate and are never empty', () => {
  const names = new Set(Array.from({ length: 16 }, (_, i) => seasonName(i)));
  assert.equal(names.size, 8);
  assert.ok([...names].every(Boolean));
  assert.ok(seasonName(-3).length > 0);
});

// ---- reward table ---------------------------------------------------------------------------------

test('reward table: 10 tiers, growing, premium always richer, premium worth its price', () => {
  assert.equal(PASS.tiers, 10);
  assert.equal(PASS.keysPerTier, 3);
  assert.equal(PASS.free.length, PASS.tiers);
  assert.equal(PASS.premium.length, PASS.tiers);
  for (let i = 1; i < PASS.tiers; i++) {
    assert.ok(PASS.free[i] >= PASS.free[i - 1], `free grows at tier ${i + 1}`);
    assert.ok(PASS.premium[i] >= PASS.premium[i - 1], `premium grows at tier ${i + 1}`);
  }
  for (let i = 0; i < PASS.tiers; i++) assert.ok(PASS.premium[i] > PASS.free[i], `premium > free at tier ${i + 1}`);
  const total = PASS.premium.reduce((a, b) => a + b, 0);
  assert.ok(total > PASS.premiumCost, 'finishing the premium track returns more than it costs');
  assert.equal(rewardAmount(1, 'free'), 10);
  assert.equal(rewardAmount(10, 'premium'), 300);
  assert.equal(rewardAmount(11, 'free'), 0, 'out of range is worth nothing');
  assert.ok(isChest(10, 'premium') && !isChest(1, 'free'));
});

// ---- keys and tiers -----------------------------------------------------------------------------------

test('tier progress reads like the "1/3" bar', () => {
  assert.deepEqual(tierProgress(0), { tier: 1, have: 0, need: 3, complete: false });
  assert.deepEqual(tierProgress(1), { tier: 1, have: 1, need: 3, complete: false });
  assert.deepEqual(tierProgress(3), { tier: 2, have: 0, need: 3, complete: false });
  assert.deepEqual(tierProgress(7), { tier: 3, have: 1, need: 3, complete: false });
  assert.deepEqual(tierProgress(MAX_KEYS), { tier: 10, have: 3, need: 3, complete: true });
  assert.equal(tierReached(2), 0);
  assert.equal(tierReached(3), 1);
  assert.equal(tierReached(999), 10);
});

test('a key is earned once per distinct puzzle per season', () => {
  const a = earnKey(EMPTY_ECONOMY, 46, 'level:1');
  assert.equal(a.earned, true);
  assert.equal(a.keys, 1);
  const again = earnKey(a.state, 46, 'level:1'); // replay of the same level
  assert.equal(again.earned, false);
  assert.equal(again.keys, 1, 'replaying cannot farm the pass');
  const b = earnKey(a.state, 46, 'daily:2026-11-26');
  assert.equal(b.keys, 2);
  assert.equal(earnKey(b.state, 46, '').earned, false, 'an empty id never counts');
});

test('crossing a tier is reported', () => {
  let s = withKeys(EMPTY_ECONOMY, 46, 2);
  const r = earnKey(s, 46, 'level:99');
  assert.equal(r.tierBefore, 0);
  assert.equal(r.tierAfter, 1);
});

test('the pass fills up at 30 keys and takes no more', () => {
  const s = withKeys(EMPTY_ECONOMY, 46, MAX_KEYS);
  assert.equal(s.pass.keys, MAX_KEYS);
  assert.equal(earnKey(s, 46, 'level:500').earned, false);
});

test('a new season starts from zero keys, and the same puzzles count again', () => {
  const s = withKeys(EMPTY_ECONOMY, 46, 5);
  assert.equal(effectivePass(s, 47).keys, 0);
  const r = earnKey(s, 47, 'level:1');
  assert.equal(r.earned, true, 'level 1 gives a key again in the new season');
  assert.equal(r.state.pass.season, 47);
  assert.equal(r.state.pass.keys, 1);
});

// ---- claiming ---------------------------------------------------------------------------------------

test('free rewards need the tier; premium also needs activation', () => {
  let s = withKeys(rich(0), 46, 2);
  assert.equal(claimStatus(s, 46, 1, 'free'), 'locked', 'tier 1 needs 3 keys');
  s = withKeys(rich(0), 46, 3);
  assert.equal(claimStatus(s, 46, 1, 'free'), 'claimable');
  assert.equal(claimStatus(s, 46, 1, 'premium'), 'premium-locked');
  assert.equal(claimStatus(s, 46, 2, 'free'), 'locked');
  assert.equal(claimStatus(s, 46, 0, 'free'), 'locked');
  assert.equal(claimStatus(s, 46, 11, 'free'), 'locked');
});

test('a reward pays once: claiming again (or after a restart) pays nothing', () => {
  const s = withKeys(rich(0), 46, 3);
  const a = claimReward(s, 46, 1, 'free');
  assert.deepEqual([a.claimed, a.amount, a.state.coins], [true, 10, 10]);
  assert.equal(claimStatus(a.state, 46, 1, 'free'), 'claimed');
  const b = claimReward(a.state, 46, 1, 'free');
  assert.deepEqual([b.claimed, b.state.coins], [false, 10]);
  // even from the OLD state (e.g. a stale double tap) the ledger refuses a second payout
  assert.equal(claimReward(a.state, 46, 1, 'free').state.coins, 10);
});

test('premium: activation costs 500 once, then earlier tiers can be claimed retroactively', () => {
  let s = withKeys(rich(600), 46, 9); // tiers 1-3 reached
  const act = activatePremium(s, 46);
  assert.equal(act.status, 'activated');
  assert.equal(act.state.coins, 100);
  assert.equal(hasPremium(act.state, 46), true);
  const again = activatePremium(act.state, 46);
  assert.equal(again.status, 'already');
  assert.equal(again.state.coins, 100, 'never charged twice');
  s = act.state;
  assert.equal(claimStatus(s, 46, 1, 'premium'), 'claimable');
  assert.equal(claimStatus(s, 46, 3, 'premium'), 'claimable');
  assert.equal(claimStatus(s, 46, 4, 'premium'), 'locked');
  const r = claimReward(s, 46, 2, 'premium');
  assert.deepEqual([r.claimed, r.amount], [true, 40]);
});

test('premium activation is refused when too poor, with nothing deducted', () => {
  const s = rich(499);
  const r = activatePremium(s, 46);
  assert.equal(r.status, 'insufficient');
  assert.equal(r.state.coins, 499);
  assert.equal(hasPremium(r.state, 46), false);
  assert.equal(activatePremium(rich(500), 46).state.coins, 0, 'exactly enough works');
});

test('claim all pays every claimable reward and nothing twice', () => {
  let s = withKeys(rich(1000), 46, 9);
  s = activatePremium(s, 46).state; // 500 left
  assert.equal(claimableCount(s, 46), 6);
  const r = claimAllRewards(s, 46);
  assert.equal(r.count, 6);
  assert.equal(r.amount, 10 + 15 + 20 + 25 + 40 + 50);
  assert.equal(r.state.coins, 500 + r.amount);
  assert.deepEqual(
    r.claims.map((c) => `${c.tier}:${c.track}:${c.amount}`),
    ['1:free:10', '1:premium:25', '2:free:15', '2:premium:40', '3:free:20', '3:premium:50'],
    'every paid reward is listed so each can be reported',
  );
  assert.equal(claimableCount(r.state, 46), 0);
  assert.equal(claimAllRewards(r.state, 46).count, 0);
});

test('unclaimed rewards expire with the season; the new season has fresh rewards', () => {
  const s = withKeys(rich(0), 46, 3);
  assert.equal(claimStatus(s, 46, 1, 'free'), 'claimable');
  assert.equal(claimStatus(s, 47, 1, 'free'), 'locked', 'next season: no keys yet');
  assert.equal(claimReward(s, 47, 1, 'free').claimed, false);
  // premium is per season too
  const p = activatePremium(withKeys(rich(600), 46, 3), 46).state;
  assert.equal(hasPremium(p, 47), false, 'last season\'s premium does not carry over');
  // ...but last season's CLAIMED rewards stay claimed, and the new season pays again
  const claimed = claimReward(p, 46, 1, 'free').state;
  const next = withKeys(claimed, 47, 3);
  assert.equal(claimStatus(next, 47, 1, 'free'), 'claimable');
  assert.equal(claimReward(next, 47, 1, 'free').claimed, true);
});

// ---- persistence ---------------------------------------------------------------------------------------

test('pass state is repaired on load; old saves without it get a clean pass', () => {
  assert.deepEqual(sanitizeEconomy({ coins: 5 }).pass, EMPTY_PASS);
  assert.deepEqual(sanitizeEconomy({ pass: 'x' }).pass, EMPTY_PASS);
  assert.deepEqual(sanitizeEconomy({ pass: { season: -4, keys: 9 } }).pass, EMPTY_PASS);
  const ok = sanitizeEconomy({ pass: { season: 46, keys: 7.9, seen: { 'level:1': true, bad: 'no', '': true } } }).pass;
  assert.deepEqual(ok, { season: 46, keys: 7, seen: { 'level:1': true } });
  assert.equal(sanitizeEconomy({ pass: { season: 3, keys: 99999 } }).pass.keys, 1000, 'bounded');
});

function memoryStorage() {
  const writes: EconomyState[] = [];
  let disk: unknown = null;
  const storage: EconomyStorage = {
    load: async () => disk,
    save: async (s) => {
      writes.push(s);
      disk = JSON.parse(JSON.stringify(s));
    },
  };
  return { storage, writes };
}

test('keys, claims and premium survive an app restart; activation is ONE atomic write', async () => {
  const mem = memoryStorage();
  const a = createEconomyStore(mem.storage);
  await a.init();
  a.grant({ id: 'seed', amount: 700, kind: 'event' }, 'test');
  for (let i = 1; i <= 6; i++) a.transact((s) => ({ state: earnKey(s, 46, `level:${i}`).state, result: 0 }));
  await a.flush(); // let the earlier writes land first
  const before = mem.writes.length;
  const status = a.transact((s) => {
    const r = activatePremium(s, 46);
    return { state: r.state, result: r.status };
  });
  await a.flush();
  assert.equal(status, 'activated');
  assert.equal(mem.writes.length - before, 1, 'coins deducted and premium marked in a single snapshot');
  a.transact((s) => ({ state: claimReward(s, 46, 1, 'premium').state, result: 0 }));
  await a.flush();

  const b = createEconomyStore(mem.storage); // restart
  await b.init();
  const s = b.getState();
  assert.equal(s.pass.keys, 6);
  assert.equal(hasPremium(s, 46), true);
  assert.equal(claimStatus(s, 46, 1, 'premium'), 'claimed');
  assert.equal(s.coins, 700 - 500 + 25);
  assert.equal(claimReward(s, 46, 1, 'premium').claimed, false, 'still claimed after the restart');
});
