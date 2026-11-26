// The coin store: in-memory state + change events + a SERIALISED persistence queue.
//
// Why a queue: every change is applied to memory instantly (the UI never waits on storage), and
// each change is then written to storage strictly in order. Two quick transactions can therefore
// never interleave their writes or let an older snapshot overwrite a newer one.
import {
  EMPTY_ECONOMY,
  applyGrant,
  applySpend,
  canAfford,
  sanitizeEconomy,
  type EconomyState,
  type Tx,
  type TxResult,
} from './ledger.ts';

export interface EconomyStorage {
  load(): Promise<unknown>;
  save(state: EconomyState): Promise<void>;
}

export interface GainEvent {
  amount: number;
  reason: string;
}
export interface SpendEvent {
  amount: number;
  reason: string;
}

export interface EconomyStore {
  getState(): EconomyState;
  /** Load (and repair) the saved state. Call once at startup. */
  init(): Promise<void>;
  /** Pay out coins. A repeated id is ignored (see ledger). */
  grant(tx: Tx, reason: string): TxResult;
  /** Deduct coins. Refused (nothing changes) if the balance is too low or the id repeats. */
  spend(tx: Tx, reason: string): TxResult;
  canAfford(amount: number): boolean;
  subscribe(listener: () => void): () => void;
  onGain(listener: (e: GainEvent) => void): () => void;
  onSpend(listener: (e: SpendEvent) => void): () => void;
  /** Resolves when every queued write has finished (used by tests and on shutdown). */
  flush(): Promise<void>;
  /** Run an arbitrary pure update on the state (for non-coin economy fields, e.g. streaks). */
  update(fn: (s: EconomyState) => EconomyState): void;
  /**
   * Run a pure state transition as ONE atomic commit (one persisted snapshot), so related changes
   * - e.g. "grant the daily coins" + "remember today as claimed" - can never be saved half-done.
   * `gain` / `spend` (optional) are announced to onGain / onSpend listeners only if the state
   * actually changed.
   */
  transact<T>(fn: (s: EconomyState) => { state: EconomyState; result: T; gain?: GainEvent; spend?: SpendEvent }): T;
}

export function createEconomyStore(storage: EconomyStorage, onError?: (e: unknown) => void): EconomyStore {
  let state: EconomyState = EMPTY_ECONOMY;
  let ready = false;
  const listeners = new Set<() => void>();
  const gainListeners = new Set<(e: GainEvent) => void>();
  const spendListeners = new Set<(e: SpendEvent) => void>();
  let queue: Promise<void> = Promise.resolve();

  const persist = () => {
    const snapshot = state;
    queue = queue
      .then(() => storage.save(snapshot))
      .catch((e) => {
        // A failed write must never crash the game; the next change will write a newer snapshot.
        onError?.(e);
      });
  };

  const commit = (next: EconomyState) => {
    state = next;
    persist();
    listeners.forEach((l) => l());
  };

  return {
    getState: () => state,

    async init() {
      if (ready) return;
      try {
        const loaded = sanitizeEconomy(await storage.load());
        // Anything earned before the load finished is kept (state may already have changed).
        state = state === EMPTY_ECONOMY ? loaded : state;
      } catch (e) {
        onError?.(e);
      }
      ready = true;
      listeners.forEach((l) => l());
    },

    grant(tx, reason) {
      const res = applyGrant(state, tx);
      if (res.applied) {
        commit(res.state);
        gainListeners.forEach((l) => l({ amount: tx.amount, reason }));
      }
      return res;
    },

    spend(tx, reason) {
      const res = applySpend(state, tx);
      if (res.applied) {
        commit(res.state);
        spendListeners.forEach((l) => l({ amount: tx.amount, reason }));
      }
      return res;
    },

    canAfford: (amount) => canAfford(state, amount),

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    onGain(listener) {
      gainListeners.add(listener);
      return () => {
        gainListeners.delete(listener);
      };
    },
    onSpend(listener) {
      spendListeners.add(listener);
      return () => {
        spendListeners.delete(listener);
      };
    },

    flush: () => queue,

    update(fn) {
      commit(fn(state));
    },

    transact(fn) {
      const out = fn(state);
      if (out.state !== state) {
        commit(out.state);
        if (out.gain) gainListeners.forEach((l) => l(out.gain as GainEvent));
        if (out.spend) spendListeners.forEach((l) => l(out.spend as SpendEvent));
      }
      return out.result;
    },
  };
}
