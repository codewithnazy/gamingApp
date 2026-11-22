// The coin ledger: PURE functions over an immutable state. No React, no storage, no clock.
//
// Reliability rules enforced here (and covered by tests):
//  - every transaction carries an id; applying the same id twice is a no-op (no double pay,
//    no double deduction);
//  - spending more than the balance is REFUSED (never clamped to zero, never goes negative);
//  - amounts must be positive whole numbers;
//  - saved data is never trusted: sanitizeEconomy repairs or rejects anything odd.

export const MAX_COINS = 999_999_999;
/** How many recent one-off transaction ids are remembered for duplicate protection. */
export const RECENT_LIMIT = 100;

export interface EconomyState {
  version: 1;
  coins: number;
  /** Permanent once-only rewards, e.g. "level:12:complete". */
  granted: Record<string, true>;
  /** Recent non-permanent transaction ids (ad rewards, hint purchases), newest last. */
  recent: string[];
}

export const EMPTY_ECONOMY: EconomyState = { version: 1, coins: 0, granted: {}, recent: [] };

export type TxFailure = 'duplicate' | 'insufficient' | 'invalid';

export interface TxResult {
  state: EconomyState;
  applied: boolean;
  /** Why nothing happened (only when applied is false). */
  reason?: TxFailure;
}

export interface Tx {
  /** Unique id. For `once` transactions it must be stable (same reward => same id). */
  id: string;
  amount: number;
  /**
   * 'once'  - a permanent reward that can only ever be paid one time (level, daily, ...).
   * 'event' - a one-off transaction; its id is remembered for a while to stop double submits.
   */
  kind: 'once' | 'event';
}

const isAmount = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n > 0;
const isId = (s: unknown): s is string => typeof s === 'string' && s.length > 0 && s.length <= 120;

const rejected = (state: EconomyState, reason: TxFailure): TxResult => ({ state, applied: false, reason });

const seen = (state: EconomyState, tx: Tx) =>
  tx.kind === 'once' ? state.granted[tx.id] === true : state.recent.includes(tx.id);

function remember(state: EconomyState, tx: Tx): Pick<EconomyState, 'granted' | 'recent'> {
  if (tx.kind === 'once') return { granted: { ...state.granted, [tx.id]: true }, recent: state.recent };
  return { granted: state.granted, recent: [...state.recent, tx.id].slice(-RECENT_LIMIT) };
}

export function applyGrant(state: EconomyState, tx: Tx): TxResult {
  if (!isId(tx.id) || !isAmount(tx.amount)) return rejected(state, 'invalid');
  if (seen(state, tx)) return rejected(state, 'duplicate');
  return {
    applied: true,
    state: { ...state, ...remember(state, tx), coins: Math.min(MAX_COINS, state.coins + tx.amount) },
  };
}

export function applySpend(state: EconomyState, tx: Tx): TxResult {
  if (!isId(tx.id) || !isAmount(tx.amount)) return rejected(state, 'invalid');
  if (seen(state, tx)) return rejected(state, 'duplicate');
  if (state.coins < tx.amount) return rejected(state, 'insufficient');
  return { applied: true, state: { ...state, ...remember(state, tx), coins: state.coins - tx.amount } };
}

export const canAfford = (state: EconomyState, amount: number) => state.coins >= amount;

/** Repair untrusted saved data. Unknown / malformed fields fall back to safe defaults. */
export function sanitizeEconomy(raw: unknown): EconomyState {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const coins =
    typeof r.coins === 'number' && Number.isFinite(r.coins)
      ? Math.min(MAX_COINS, Math.max(0, Math.floor(r.coins)))
      : 0;

  const granted: Record<string, true> = {};
  if (r.granted && typeof r.granted === 'object') {
    for (const [k, v] of Object.entries(r.granted as Record<string, unknown>)) {
      if (isId(k) && v === true) granted[k] = true;
    }
  }
  const recent = Array.isArray(r.recent) ? r.recent.filter(isId).slice(-RECENT_LIMIT) : [];
  return { version: 1, coins, granted, recent };
}
