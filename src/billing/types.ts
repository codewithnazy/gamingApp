// Billing architecture for a future one-time "Remove Ads" purchase. NO real billing is wired up
// yet: the app ships with a "not available" service, and everything else (entitlement storage, ad
// suppression, the Store UI, restore flow) already works against this interface. Plugging in Google
// Play Billing later means writing ONE class that implements BillingService - see docs/BILLING.md.

export type ProductId = 'remove_ads';

export interface Product {
  id: ProductId;
  title: string;
  description: string;
  /** Ads this entitlement switches off. Rewarded (opt-in) ads deliberately stay available. */
  removes: readonly ('banner' | 'interstitial')[];
}

export const PRODUCTS: Record<ProductId, Product> = {
  remove_ads: {
    id: 'remove_ads',
    title: 'Remove Ads',
    description: 'A one-time purchase that removes banner and between-level ads. Optional reward videos stay available.',
    removes: ['banner', 'interstitial'],
  },
};

export type PurchaseStatus = 'purchased' | 'already-owned' | 'cancelled' | 'unavailable' | 'failed';
export type RestoreStatus = 'restored' | 'nothing-to-restore' | 'unavailable' | 'failed';

export interface BillingService {
  /** False until a real store integration is installed. */
  readonly available: boolean;
  /** The localized price to show (e.g. "$2.99"), or null when unknown. */
  getPrice(product: ProductId): Promise<string | null>;
  purchase(product: ProductId): Promise<PurchaseStatus>;
  /** Re-grant products the user already bought (new phone / reinstall). */
  restore(): Promise<{ status: RestoreStatus; products: ProductId[] }>;
}
