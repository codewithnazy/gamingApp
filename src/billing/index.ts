import { economy } from '../economy';
import { buyRemoveAds, grantEntitlement, restorePurchases } from './entitlements';
import { noopBilling } from './noop';
import type { BillingService, ProductId, PurchaseStatus, RestoreStatus } from './types';

export { PRODUCTS } from './types';
export type { PurchaseStatus, RestoreStatus } from './types';

/** The active billing service. Swap in a Google Play Billing implementation here (docs/BILLING.md). */
let service: BillingService = noopBilling;
export const setBillingService = (s: BillingService) => {
  service = s;
};
export const billingAvailable = () => service.available;
export const getRemoveAdsPrice = () => service.getPrice('remove_ads');

const grant = (product: ProductId) => economy.update((s) => grantEntitlement(s, product));

export const startRemoveAdsPurchase = (): Promise<PurchaseStatus> => buyRemoveAds({ service, grant });
export const restoreEntitlements = (): Promise<RestoreStatus> => restorePurchases({ service, grant });
