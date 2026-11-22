import test from 'node:test';
import assert from 'node:assert/strict';
import { buyHintWithCoins, claimFreeCoins, getHintFromAd } from './flows.ts';
import { createEconomyStore } from './store.ts';
import type { RewardedStatus } from '../ads/types.ts';

async function freshEconomy(startCoins = 0) {
  const store = createEconomyStore({ load: async () => null, save: async () => {} });
  await store.init();
  if (startCoins > 0) store.grant({ id: 'seed', amount: startCoins, kind: 'event' }, 'test');
  return store;
}
const ad = (status: RewardedStatus) => async () => status;
const ids = (...v: string[]) => {
  let i = 0;
  return () => v[Math.min(i++, v.length - 1)];
};

// ---- Free Coins ---------------------------------------------------------------------------------

test('free coins: +30 only after the ad confirms the reward', async () => {
  const economy = await freshEconomy();
  const r = await claimFreeCoins({ economy, requestRewardedAd: ad('earned') });
  assert.deepEqual(r, { ok: true, amount: 30 });
  assert.equal(economy.getState().coins, 30);
});

test('free coins: no coins for any result other than earned', async () => {
  for (const status of ['closed', 'unavailable', 'timeout', 'failed', 'busy'] as const) {
    const economy = await freshEconomy();
    const r = await claimFreeCoins({ economy, requestRewardedAd: ad(status) });
    assert.deepEqual(r, { ok: false, reason: status });
    assert.equal(economy.getState().coins, 0, `${status} must not pay`);
  }
});

test('free coins: two taps while the ad is playing pay once', async () => {
  const economy = await freshEconomy();
  let release!: () => void;
  const slow = () => new Promise<RewardedStatus>((res) => (release = () => res('earned')));
  const first = claimFreeCoins({ economy, requestRewardedAd: slow });
  const second = await claimFreeCoins({ economy, requestRewardedAd: ad('earned') }); // impatient 2nd tap
  assert.deepEqual(second, { ok: false, reason: 'busy' });
  release();
  assert.deepEqual(await first, { ok: true, amount: 30 });
  assert.equal(economy.getState().coins, 30);
});

test('free coins: the same ad session cannot pay twice (same id)', async () => {
  const economy = await freshEconomy();
  const same = ids('SAME');
  assert.equal((await claimFreeCoins({ economy, requestRewardedAd: ad('earned'), newId: same })).ok, true);
  const again = await claimFreeCoins({ economy, requestRewardedAd: ad('earned'), newId: same });
  assert.deepEqual(again, { ok: false, reason: 'duplicate' });
  assert.equal(economy.getState().coins, 30);
});

test('free coins: a second, separately watched ad pays again', async () => {
  const economy = await freshEconomy();
  await claimFreeCoins({ economy, requestRewardedAd: ad('earned'), newId: ids('A') });
  await claimFreeCoins({ economy, requestRewardedAd: ad('earned'), newId: ids('B') });
  assert.equal(economy.getState().coins, 60);
});

// ---- Hints with coins ---------------------------------------------------------------------------

test('hint with coins: charges 50 once and applies the hint', async () => {
  const economy = await freshEconomy(120);
  let applied = 0;
  const r = buyHintWithCoins({ economy, canApplyHint: () => true, applyHint: () => applied++, newId: ids('h1') });
  assert.equal(r, 'applied');
  assert.equal(applied, 1);
  assert.equal(economy.getState().coins, 70);
});

test('hint with coins: not enough coins -> nothing happens, nothing deducted', async () => {
  const economy = await freshEconomy(49);
  let applied = 0;
  const r = buyHintWithCoins({ economy, canApplyHint: () => true, applyHint: () => applied++ });
  assert.equal(r, 'insufficient');
  assert.equal(applied, 0);
  assert.equal(economy.getState().coins, 49);
});

test('hint with coins: never charges when there is nothing to reveal', async () => {
  const economy = await freshEconomy(100);
  const r = buyHintWithCoins({ economy, canApplyHint: () => false, applyHint: () => assert.fail('must not apply') });
  assert.equal(r, 'nothing-to-hint');
  assert.equal(economy.getState().coins, 100);
});

test('hint with coins: a double-submitted purchase deducts once', async () => {
  const economy = await freshEconomy(200);
  let applied = 0;
  const deps = { economy, canApplyHint: () => true, applyHint: () => applied++, newId: ids('SAME') };
  assert.equal(buyHintWithCoins(deps), 'applied');
  assert.equal(buyHintWithCoins(deps), 'duplicate');
  assert.equal(applied, 1);
  assert.equal(economy.getState().coins, 150);
});

test('hint with coins: if applying fails after the charge, the coins are refunded', async () => {
  const economy = await freshEconomy(100);
  assert.throws(() =>
    buyHintWithCoins({ economy, canApplyHint: () => true, applyHint: () => { throw new Error('boom'); }, newId: ids('x') }),
  );
  assert.equal(economy.getState().coins, 100, 'player is made whole');
});

test('hint with coins: exactly 50 coins is enough and leaves 0', async () => {
  const economy = await freshEconomy(50);
  assert.equal(buyHintWithCoins({ economy, canApplyHint: () => true, applyHint: () => {} }), 'applied');
  assert.equal(economy.getState().coins, 0);
});

// ---- Hints from ads -----------------------------------------------------------------------------

test('ad hint: applied only when the reward is earned', async () => {
  let applied = 0;
  const r = await getHintFromAd({ canApplyHint: () => true, applyHint: () => applied++, requestRewardedAd: ad('earned') });
  assert.deepEqual(r, { ok: true });
  assert.equal(applied, 1);
});

test('ad hint: closing early, failing, timing out or no ad -> no hint', async () => {
  for (const status of ['closed', 'unavailable', 'timeout', 'failed', 'busy'] as const) {
    let applied = 0;
    const r = await getHintFromAd({ canApplyHint: () => true, applyHint: () => applied++, requestRewardedAd: ad(status) });
    assert.deepEqual(r, { ok: false, reason: status });
    assert.equal(applied, 0, `${status} must not give a hint`);
  }
});

test('ad hint: no ad is even requested when there is nothing to hint', async () => {
  let asked = 0;
  const r = await getHintFromAd({ canApplyHint: () => false, applyHint: () => {}, requestRewardedAd: async () => { asked++; return 'earned'; } });
  assert.deepEqual(r, { ok: false, reason: 'nothing-to-hint' });
  assert.equal(asked, 0);
});

test('ad hint: not applied if the puzzle ended while the ad was playing', async () => {
  let canApply = true;
  let applied = 0;
  const r = await getHintFromAd({
    canApplyHint: () => canApply,
    applyHint: () => applied++,
    requestRewardedAd: async () => { canApply = false; return 'earned'; },
  });
  assert.deepEqual(r, { ok: false, reason: 'nothing-to-hint' });
  assert.equal(applied, 0);
});

test('ad hint: simultaneous requests are refused (single flight)', async () => {
  let release!: () => void;
  const slow = () => new Promise<RewardedStatus>((res) => (release = () => res('earned')));
  let applied = 0;
  const first = getHintFromAd({ canApplyHint: () => true, applyHint: () => applied++, requestRewardedAd: slow });
  const second = await getHintFromAd({ canApplyHint: () => true, applyHint: () => applied++, requestRewardedAd: ad('earned') });
  assert.deepEqual(second, { ok: false, reason: 'busy' });
  release();
  await first;
  assert.equal(applied, 1);
});
