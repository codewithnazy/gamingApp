import type { BillingService } from './types.ts';

/** The default service: billing is not available (yet). Never throws, never grants anything. */
export const noopBilling: BillingService = {
  available: false,
  getPrice: async () => null,
  purchase: async () => 'unavailable',
  restore: async () => ({ status: 'unavailable', products: [] }),
};
