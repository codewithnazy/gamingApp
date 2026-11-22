import test from 'node:test';
import assert from 'node:assert/strict';
import { EMPTY_ECONOMY } from '../economy/ledger.ts';
import { PRODUCTS, type BillingService, type ProductId } from './types.ts';
import { buyRemoveAds, grantEntitlement, hasRemovedAds, restorePurchases } from './entitlements.ts';
import { noopBilling } from './noop.ts';
import { canShowInterstitial, newGate } from '../ads/policy.ts';
import { ADS_CONFIG } from '../ads/config.ts';

const fake = (over: Partial<BillingService>): BillingService => ({ ...noopBilling, ...over });
const recorder = () => {
  const granted: ProductId[] = [];
  return { granted, grant: (p: ProductId) => granted.push(p) };
};

test('the Remove Ads product keeps optional reward videos', () => {
  assert.deepEqual([...PRODUCTS.remove_ads.removes].sort(), ['banner', 'interstitial']);
  assert.ok(!(PRODUCTS.remove_ads.removes as readonly string[]).includes('rewarded'));
});

test('the default service is unavailable and grants nothing', async () => {
  assert.equal(noopBilling.available, false);
  const r = recorder();
  assert.equal(await buyRemoveAds({ service: noopBilling, grant: r.grant }), 'unavailable');
  assert.equal(await restorePurchases({ service: noopBilling, grant: r.grant }), 'unavailable');
  assert.deepEqual(r.granted, []);
});

test('only a confirmed purchase grants the entitlement', async () => {
  for (const status of ['cancelled', 'unavailable', 'failed'] as const) {
    const r = recorder();
    await buyRemoveAds({ service: fake({ purchase: async () => status }), grant: r.grant });
    assert.deepEqual(r.granted, [], `${status} must not grant`);
  }
  for (const status of ['purchased', 'already-owned'] as const) {
    const r = recorder();
    await buyRemoveAds({ service: fake({ purchase: async () => status }), grant: r.grant });
    assert.deepEqual(r.granted, ['remove_ads'], `${status} grants`);
  }
});

test('a billing service that throws is contained', async () => {
  const boom = fake({ purchase: async () => { throw new Error('store down'); }, restore: async () => { throw new Error('store down'); } });
  const r = recorder();
  assert.equal(await buyRemoveAds({ service: boom, grant: r.grant }), 'failed');
  assert.equal(await restorePurchases({ service: boom, grant: r.grant }), 'failed');
  assert.deepEqual(r.granted, []);
});

test('restore grants exactly what the store reports', async () => {
  const r = recorder();
  const status = await restorePurchases({ service: fake({ restore: async () => ({ status: 'restored', products: ['remove_ads'] }) }), grant: r.grant });
  assert.equal(status, 'restored');
  assert.deepEqual(r.granted, ['remove_ads']);
  const none = recorder();
  await restorePurchases({ service: fake({ restore: async () => ({ status: 'nothing-to-restore', products: [] }) }), grant: none.grant });
  assert.deepEqual(none.granted, []);
});

test('grantEntitlement is idempotent and keeps the rest of the state', () => {
  const a = grantEntitlement({ ...EMPTY_ECONOMY, coins: 9 }, 'remove_ads');
  assert.equal(hasRemovedAds(a), true);
  assert.equal(a.coins, 9);
  assert.equal(grantEntitlement(a, 'remove_ads'), a, 'no change -> same object');
  assert.equal(hasRemovedAds(EMPTY_ECONOMY), false);
});

test('with Remove Ads owned, interstitials never show - however due they are', () => {
  const rules = ADS_CONFIG.interstitial;
  const gate = { ...newGate(rules), completedSinceAd: 99 };
  const late = 10_000_000;
  assert.equal(canShowInterstitial(gate, late, 50, rules, 0), true);
  assert.equal(canShowInterstitial(gate, late, 50, rules, 0, true), false);
});
