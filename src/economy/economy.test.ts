import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EMPTY_ECONOMY,
  MAX_COINS,
  RECENT_LIMIT,
  applyGrant,
  applySpend,
  sanitizeEconomy,
  type EconomyState,
} from './ledger.ts';
import { COSTS, REWARDS, levelRewardGrants } from './rewards.ts';
import { createEconomyStore, type EconomyStorage } from './store.ts';

const once = (id: string, amount: number) => ({ id, amount, kind: 'once' as const });
const event = (id: string, amount: number) => ({ id, amount, kind: 'event' as const });

// ---- spec numbers ----------------------------------------------------------------------------

test('reward and cost amounts match the design', () => {
  assert.equal(REWARDS.levelComplete, 10);
  assert.equal(REWARDS.levelThreeStars, 5);
  assert.equal(REWARDS.dailyLogin, 20);
  assert.equal(REWARDS.rewardedAd, 30);
  assert.equal(COSTS.hint, 50);
});

test('level rewards: 10 coins, +5 only for 3 stars', () => {
  assert.deepEqual(levelRewardGrants(7, 1).map((g) => g.amount), [10]);
  assert.deepEqual(levelRewardGrants(7, 2).map((g) => g.amount), [10]);
  assert.deepEqual(levelRewardGrants(7, 3).map((g) => g.amount), [10, 5]);
  assert.notEqual(levelRewardGrants(7, 3)[0].id, levelRewardGrants(8, 3)[0].id, 'ids are per level');
});

// ---- ledger ----------------------------------------------------------------------------------

test('grants add coins; a repeated once-id never pays twice', () => {
  let s: EconomyState = EMPTY_ECONOMY;
  let r = applyGrant(s, once('level:1:complete', 10));
  assert.equal(r.applied, true);
  s = r.state;
  assert.equal(s.coins, 10);
  r = applyGrant(s, once('level:1:complete', 10));
  assert.equal(r.applied, false);
  assert.equal(r.reason, 'duplicate');
  assert.equal(r.state.coins, 10, 'no second payout');
});

test('the 3-star bonus can still be earned later, once', () => {
  let s = applyGrant(EMPTY_ECONOMY, once('level:3:complete', 10)).state; // finished with 1 star
  s = applyGrant(s, once('level:3:stars3', 5)).state; // replayed with 3 stars
  s = applyGrant(s, once('level:3:stars3', 5)).state; // and again
  assert.equal(s.coins, 15);
});

test('spending needs enough coins and never goes negative', () => {
  const s = applyGrant(EMPTY_ECONOMY, event('ad1', 30)).state;
  const r = applySpend(s, event('hint1', 50));
  assert.equal(r.applied, false);
  assert.equal(r.reason, 'insufficient');
  assert.equal(r.state.coins, 30, 'balance untouched when refused');
  assert.equal(applySpend(s, event('hint2', 30)).state.coins, 0);
});

test('a spend id submitted twice (double tap) only deducts once', () => {
  let s = applyGrant(EMPTY_ECONOMY, event('ad1', 120)).state;
  s = applySpend(s, event('hint:A', 50)).state;
  const again = applySpend(s, event('hint:A', 50));
  assert.equal(again.applied, false);
  assert.equal(again.reason, 'duplicate');
  assert.equal(again.state.coins, 70);
});

test('invalid transactions are rejected', () => {
  for (const bad of [0, -5, 2.5, NaN, Infinity]) {
    assert.equal(applyGrant(EMPTY_ECONOMY, once('x', bad)).reason, 'invalid', `amount ${bad}`);
    assert.equal(applySpend(EMPTY_ECONOMY, once('x', bad)).reason, 'invalid', `amount ${bad}`);
  }
  assert.equal(applyGrant(EMPTY_ECONOMY, once('', 5)).reason, 'invalid');
});

test('balance is capped, and recent ids are bounded', () => {
  const rich = { ...EMPTY_ECONOMY, coins: MAX_COINS - 1 };
  assert.equal(applyGrant(rich, event('a', 100)).state.coins, MAX_COINS);
  let s: EconomyState = EMPTY_ECONOMY;
  for (let i = 0; i < RECENT_LIMIT + 40; i++) s = applyGrant(s, event(`e${i}`, 1)).state;
  assert.equal(s.recent.length, RECENT_LIMIT);
  assert.ok(s.recent.includes(`e${RECENT_LIMIT + 39}`), 'newest ids are kept');
});

test('the ledger never mutates the state it was given', () => {
  const frozen = Object.freeze({ ...EMPTY_ECONOMY, granted: Object.freeze({}), recent: Object.freeze([]) }) as unknown as EconomyState;
  assert.doesNotThrow(() => applyGrant(frozen, once('a', 5)));
  assert.doesNotThrow(() => applySpend(applyGrant(frozen, event('b', 5)).state, event('c', 5)));
});

test('sanitizeEconomy repairs junk and keeps good data', () => {
  assert.deepEqual(sanitizeEconomy(null), EMPTY_ECONOMY);
  assert.deepEqual(sanitizeEconomy('hacked'), EMPTY_ECONOMY);
  assert.equal(sanitizeEconomy({ coins: -50 }).coins, 0);
  assert.equal(sanitizeEconomy({ coins: 12.9 }).coins, 12);
  assert.equal(sanitizeEconomy({ coins: 'lots' }).coins, 0);
  assert.equal(sanitizeEconomy({ coins: 1e15 }).coins, MAX_COINS);
  const ok = sanitizeEconomy({ coins: 40, granted: { 'level:1:complete': true, bad: 'yes', '': true }, recent: ['a', 5, 'b'] });
  assert.equal(ok.coins, 40);
  assert.deepEqual(ok.granted, { 'level:1:complete': true });
  assert.deepEqual(ok.recent, ['a', 'b']);
});

// ---- store: persistence & reliability -------------------------------------------------------

function memoryStorage(initial: unknown = null, opts: { failSaves?: boolean; delayMs?: number } = {}) {
  const writes: EconomyState[] = [];
  let disk: unknown = initial;
  const storage: EconomyStorage = {
    load: async () => disk,
    save: async (s) => {
      if (opts.delayMs) await new Promise((r) => setTimeout(r, opts.delayMs));
      if (opts.failSaves) throw new Error('disk full');
      writes.push(s);
      disk = JSON.parse(JSON.stringify(s));
    },
  };
  return { storage, writes, disk: () => disk };
}

test('store: balance survives a restart (save -> new store -> load)', async () => {
  const mem = memoryStorage();
  const a = createEconomyStore(mem.storage);
  await a.init();
  a.grant(once('level:1:complete', 10), 'level');
  a.grant(once('level:1:stars3', 5), 'level');
  await a.flush();

  const b = createEconomyStore(mem.storage); // "app restart"
  await b.init();
  assert.equal(b.getState().coins, 15);
  assert.equal(b.grant(once('level:1:complete', 10), 'level').applied, false, 'rewards stay claimed after restart');
  assert.equal(b.getState().coins, 15);
});

test('store: writes happen in order and the final write is the final state', async () => {
  const mem = memoryStorage(null, { delayMs: 5 });
  const s = createEconomyStore(mem.storage);
  await s.init();
  for (let i = 1; i <= 6; i++) s.grant(event(`e${i}`, 10), 'test');
  await s.flush();
  assert.deepEqual(mem.writes.map((w) => w.coins), [10, 20, 30, 40, 50, 60], 'no reordering, no lost update');
  assert.equal((mem.disk() as EconomyState).coins, 60);
});

test('store: a failing disk never throws and memory stays correct', async () => {
  const errors: unknown[] = [];
  const mem = memoryStorage(null, { failSaves: true });
  const s = createEconomyStore(mem.storage, (e) => errors.push(e));
  await s.init();
  assert.doesNotThrow(() => s.grant(event('x', 30), 'ad'));
  await s.flush();
  assert.equal(s.getState().coins, 30);
  assert.equal(errors.length, 1);
});

test('store: corrupt saved data falls back to a clean state', async () => {
  const s = createEconomyStore(memoryStorage({ coins: 'NaN', granted: 7 }).storage);
  await s.init();
  assert.equal(s.getState().coins, 0);
});

test('store: events fire only for transactions that actually applied', async () => {
  const s = createEconomyStore(memoryStorage().storage);
  await s.init();
  const gains: number[] = [];
  const spends: number[] = [];
  s.onGain((e) => gains.push(e.amount));
  s.onSpend((e) => spends.push(e.amount));
  s.grant(once('a', 10), 'x');
  s.grant(once('a', 10), 'x'); // duplicate
  s.spend(event('h1', 50), 'hint'); // insufficient
  s.spend(event('h2', 10), 'hint');
  assert.deepEqual(gains, [10]);
  assert.deepEqual(spends, [10]);
  assert.equal(s.getState().coins, 0);
});

test('store: subscribers are notified on change and can unsubscribe', async () => {
  const s = createEconomyStore(memoryStorage().storage);
  await s.init();
  let n = 0;
  const off = s.subscribe(() => n++);
  s.grant(event('a', 5), 'x');
  off();
  s.grant(event('b', 5), 'x');
  assert.equal(n, 1);
});
