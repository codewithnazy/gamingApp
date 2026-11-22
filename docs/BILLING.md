# Remove Ads purchase - how to finish it

## State today
The architecture is ready; **no real billing is wired**, on purpose (it needs your Play Console
products and a native build to test safely). The game ships a "not available" billing service, so:

- Level select -> Options shows **Remove Ads - one-time purchase - coming soon** (and *Restore
  purchases*). Both answer honestly ("not available in this version yet") and grant nothing.
- The **entitlement** (`adsRemoved`) is already stored (inside the persisted economy state) and
  already honoured: when it is true, **banner and between-level ads are off** while the optional
  reward videos (free hints / coins) stay available.

```
UI (RemoveAdsDialog) -> src/billing/index.ts -> BillingService (interface)   <- plug Play Billing in here
                              |                    default: noopBilling (unavailable)
                              +-> entitlements.ts  grants 'remove_ads' ONLY for a confirmed purchase/restore
                                     -> economy.adsRemoved -> ads layer (no banners / interstitials)
```

## To add Google Play Billing
1. **Play Console**: *Monetize -> Products -> In-app products* -> create `remove_ads`, a **one-time
   (managed) product**, set the price, activate it. Add yourself as a *license tester* to test free.
2. Pick a library (all need a development/EAS build): `react-native-iap` (direct), `expo-iap`, or
   RevenueCat (handles receipts/restore for you). Install it per its docs.
3. Implement `BillingService` (src/billing/types.ts) - four small methods:
   - `available`: store connection established
   - `getPrice('remove_ads')`: the localized price string from the store
   - `purchase('remove_ads')`: launch the flow -> `'purchased' | 'cancelled' | 'failed' | 'already-owned'`;
     **acknowledge/finish the transaction** (Google refunds unacknowledged purchases after 3 days)
   - `restore()`: query owned purchases -> `{ status: 'restored', products: ['remove_ads'] }`
4. At startup call `setBillingService(yourService)` (src/billing/index.ts). Also run `restore()` once
   per launch (silently) so reinstalling or a new phone keeps the purchase.
5. In `RemoveAdsDialog` the button reads `billingAvailable()` and shows the real price via
   `getRemoveAdsPrice()`; the entitlement flows already exist and are tested (`billing.test.ts`).
6. Test with a license-tester account: purchase, cancel, restore after reinstall, airplane mode.

## Hardening before real money
- The entitlement is stored on the device. For stronger protection, verify purchases server-side
  (RevenueCat does this for you; otherwise use the Play Developer API with the purchase token).
- Keep the "optional reward videos stay" rule unless you decide otherwise: change
  `PRODUCTS.remove_ads.removes` and the ads layer together.
