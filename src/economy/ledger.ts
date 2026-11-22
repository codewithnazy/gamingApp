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

/** Dates are local calendar days as "YYYY-MM-DD" (ISO dates sort correctly as plain strings). */
export type DateKey = string;

export interface StreakState {
  current: number;
  best: number;
  /** The last calendar day with a finished puzzle. */
  lastDate: DateKey | null;
}

export interface EconomyState {
  version: 1;
  coins: number;
  /** Permanent once-only rewards, e.g. "level:12:complete". */
  granted: Record<string, true>;
  /** Recent non-permanent transaction ids (ad rewards, hint purchases), newest last. */
  recent: string[];
  /** Daily login reward: the last day it was claimed. */
  daily: { lastClaim: DateKey | null };
  /** Daily challenge: the last day it was completed. */
  challenge: { lastCompleted: DateKey | null };
  /** Daily play streak. */
  streak: StreakState;
  /** The "Remove Ads" entitlement (set by a future purchase/restore; see src/billing). */
  adsRemoved: boolean;
}

export const EMPTY_STREAK: StreakState = { current: 0, best: 0, lastDate: null };

export const EMPTY_ECONOMY: EconomyState = {
  version: 1,
  coins: 0,
  granted: {},
  recent: [],
  daily: { lastClaim: null },
  challenge: { lastCompleted: null },
  streak: EMPTY_STREAK,
  adsRemoved: false,
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const isDateKey = (v: unknown): v is DateKey => {
  if (typeof v !== 'string' || !DATE_RE.test(v)) return false;
  const [y, m, d] = v.split('-').map(Number);
  const t = new Date(y, m - 1, d);
  return t.getFullYear() === y && t.getMonth() === m - 1 && t.getDate() === d;
};

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

  const obj = (v: unknown) => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});
  const date = (v: unknown) => (isDateKey(v) ? v : null);
  const count = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(100_000, Math.max(0, Math.floor(v))) : 0);
  const st = obj(r.streak);
  const current = count(st.current);
  const streak: StreakState = { current, best: Math.max(current, count(st.best)), lastDate: date(st.lastDate) };
  // A saved streak with no date can't be continued; treat it as no streak.
  if (streak.lastDate === null) streak.current = 0;

  return {
    version: 1,
    coins,
    granted,
    recent,
    daily: { lastClaim: date(obj(r.daily).lastClaim) },
    challenge: { lastCompleted: date(obj(r.challenge).lastCompleted) },
    streak,
    adsRemoved: r.adsRemoved === true,
  };
}
