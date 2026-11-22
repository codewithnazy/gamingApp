// Entitlements: pure state changes + the flows that turn a billing result into an entitlement.
import type { EconomyState } from '../economy/ledger.ts';
import type { BillingService, ProductId, PurchaseStatus, RestoreStatus } from './types.ts';

export const hasRemovedAds = (s: EconomyState): boolean => s.adsRemoved === true;

/** Grant a product. Idempotent; returns the SAME object when nothing changes. */
export function grantEntitlement(s: EconomyState, product: ProductId): EconomyState {
  if (product === 'remove_ads' && !s.adsRemoved) return { ...s, adsRemoved: true };
  return s;
}

export interface BillingFlowDeps {
  service: BillingService;
  /** Persist an entitlement (wired to the economy store in the app). */
  grant: (product: ProductId) => void;
}

/** Start the Remove Ads purchase. The entitlement is granted ONLY for a confirmed purchase. */
export async function buyRemoveAds(deps: BillingFlowDeps): Promise<PurchaseStatus> {
  let status: PurchaseStatus;
  try {
    status = await deps.service.purchase('remove_ads');
  } catch {
    return 'failed';
  }
  if (status === 'purchased' || status === 'already-owned') deps.grant('remove_ads');
  return status;
}

/** Restore earlier purchases; grants exactly the products the store reports as owned. */
export async function restorePurchases(deps: BillingFlowDeps): Promise<RestoreStatus> {
  try {
    const r = await deps.service.restore();
    if (r.status === 'restored') r.products.forEach((p) => deps.grant(p));
    return r.status;
  } catch {
    return 'failed';
  }
}
