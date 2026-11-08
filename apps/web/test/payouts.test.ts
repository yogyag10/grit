/**
 * Payout idempotency with a MOCKED RPC and an in-memory store that mirrors the conditional UPDATEs
 * in lib/payouts-live.ts. The rule under test: no retry or race may ever pay a row twice.
 */
import { describe, expect, it } from "vitest";
import {
  processPayouts,
  type ChainStatus,
  type PayoutChain,
  type PayoutRow,
  type PayoutStore,
  type SignedTransfer,
} from "../lib/payouts";

function memoryStore(initial: Partial<PayoutRow>[]): PayoutStore & { rows: PayoutRow[] } {
  const rows: PayoutRow[] = initial.map((r, i) => ({
    id: i + 1,
    wallet: `wallet${i + 1}`,
    lamports: 100_000_000,
    kind: "payout",
    status: "pending",
    signature: null,
    last_valid_block_height: null,
    claimed_at: null,
    ...r,
  }));
  const find = (id: number) => rows.find((r) => r.id === id)!;
  const tick = () => Promise.resolve(); // yield, like a network round trip
  return {
    rows,
    async list() {
      await tick();
      return rows.map((r) => ({ ...r }));
    },
    async claim(id, claimedAt) {
      await tick();
      const r = find(id);
      if (r.status !== "pending") return null;
      Object.assign(r, { status: "sending", claimed_at: claimedAt });
      return { ...r };
    },
    async markSent(id, claimedAt, signature, lvbh) {
      await tick();
      const r = find(id);
      if (r.status !== "sending" || r.claimed_at !== claimedAt) return false;
      Object.assign(r, { status: "sent", signature, last_valid_block_height: lvbh });
      return true;
    },
    async release(id, claimedAt) {
      await tick();
      const r = find(id);
      if (r.status !== "sending" || r.claimed_at !== claimedAt) return false;
      Object.assign(r, { status: "pending", claimed_at: null });
      return true;
    },
    async releaseStale(id, olderThan) {
      await tick();
      const r = find(id);
      if (r.status !== "sending" || !r.claimed_at || !(r.claimed_at < olderThan)) return false;
      Object.assign(r, { status: "pending", claimed_at: null });
      return true;
    },
    async markConfirmed(id, signature) {
      await tick();
      const r = find(id);
      if (r.status !== "sent" || r.signature !== signature) return false;
      r.status = "confirmed";
      return true;
    },
    async resetSent(id, signature) {
      await tick();
      const r = find(id);
      if (r.status !== "sent" || r.signature !== signature) return false;
      Object.assign(r, { status: "pending", signature: null, last_valid_block_height: null, claimed_at: null });
      return true;
    },
  };
}

type BroadcastMode = "land" | "land_then_timeout" | "drop_with_timeout" | "land_failed";

/** Mock cluster: records which transfers actually moved funds. */
function mockChain() {
  let seq = 0;
  const landed = new Map<string, { to: string; lamports: number; failed: boolean }>();
  const state = {
    height: 1000,
    modes: [] as BroadcastMode[],
    statusesFail: false,
    signFail: false,
    landed,
    /** Successful transfers per wallet: the thing that must never exceed 1. */
    paidCount(to: string) {
      return [...landed.values()].filter((t) => t.to === to && !t.failed).length;
    },
  };
  const pending = new Map<string, { to: string; lamports: number }>();
  const chain: PayoutChain = {
    async signTransfer(to, lamports) {
      if (state.signFail) throw new Error("blockhash fetch failed");
      const signature = `sig${++seq}`;
      pending.set(signature, { to, lamports });
      return { signature, lastValidBlockHeight: state.height + 150, serialized: new Uint8Array() };
    },
    async broadcast(tx: SignedTransfer) {
      const mode = state.modes.shift() ?? "land";
      const t = pending.get(tx.signature)!;
      if (mode === "land" || mode === "land_then_timeout") landed.set(tx.signature, { ...t, failed: false });
      if (mode === "land_failed") landed.set(tx.signature, { ...t, failed: true });
      if (mode !== "land" && mode !== "land_failed") throw new Error("timeout");
    },
    async statuses(signatures) {
      if (state.statusesFail) throw new Error("RPC 503");
      return signatures.map((s): ChainStatus => {
        const t = landed.get(s);
        if (!t) return null;
        return t.failed ? "failed" : "confirmed";
      });
    },
    async finalizedBlockHeight() {
      return state.height;
    },
  };
  return { chain, state };
}

const fast = { sleep: async () => {}, confirmPolls: 3 };

describe("processPayouts", () => {
  it("pays every pending row once and marks it confirmed", async () => {
    const store = memoryStore([{}, {}, {}]);
    const { chain, state } = mockChain();
    const res = await processPayouts("p", store, chain, fast);
    expect(res).toMatchObject({ confirmed: 3, inFlight: 0, pending: 0 });
    for (const r of store.rows) expect(state.paidCount(r.wallet)).toBe(1);
  });

  it("saves the signature before broadcasting", async () => {
    const store = memoryStore([{}]);
    const { chain } = mockChain();
    const seen: (string | null)[] = [];
    const original = chain.broadcast;
    chain.broadcast = async (tx) => {
      seen.push(store.rows[0].status === "sent" ? store.rows[0].signature : null);
      return original(tx);
    };
    await processPayouts("p", store, chain, fast);
    expect(seen).toEqual(["sig1"]);
  });

  it("a broadcast timeout that actually landed is confirmed on retry, never paid twice", async () => {
    const store = memoryStore([{}]);
    const { chain, state } = mockChain();
    state.modes = ["land_then_timeout"];
    await processPayouts("p", store, chain, { ...fast, confirmPolls: 0 });
    expect(store.rows[0].status).toBe("sent");

    const res = await processPayouts("p", store, chain, fast);
    expect(res.confirmed).toBe(1);
    expect(state.paidCount("wallet1")).toBe(1);
    expect(state.landed.size).toBe(1);
  });

  it("a dropped transfer is not resent until its blockhash expires, then resent exactly once", async () => {
    const store = memoryStore([{}]);
    const { chain, state } = mockChain();
    state.modes = ["drop_with_timeout"];
    await processPayouts("p", store, chain, fast);
    expect(store.rows[0]).toMatchObject({ status: "sent", signature: "sig1" });

    // Still within the blockhash's validity: wait, don't resend.
    state.height += 100;
    await processPayouts("p", store, chain, fast);
    expect(store.rows[0]).toMatchObject({ status: "sent", signature: "sig1" });
    expect(state.paidCount("wallet1")).toBe(0);

    // Past last_valid_block_height: it can never land, so pay again with a new transaction.
    state.height += 100;
    const res = await processPayouts("p", store, chain, fast);
    expect(res.confirmed).toBe(1);
    expect(store.rows[0].signature).toBe("sig2");
    expect(state.paidCount("wallet1")).toBe(1);
  });

  it("concurrent runs never pay the same row twice", async () => {
    const store = memoryStore([{}, {}, {}, {}]);
    const { chain, state } = mockChain();
    await Promise.all([
      processPayouts("p", store, chain, fast),
      processPayouts("p", store, chain, fast),
      processPayouts("p", store, chain, fast),
    ]);
    for (const r of store.rows) {
      expect(r.status).toBe("confirmed");
      expect(state.paidCount(r.wallet)).toBe(1);
    }
    expect(state.landed.size).toBe(4);
  });

  it("concurrent retries after a timeout still pay once", async () => {
    const store = memoryStore([{}, {}]);
    const { chain, state } = mockChain();
    state.modes = ["land_then_timeout", "drop_with_timeout"];
    await processPayouts("p", store, chain, { ...fast, confirmPolls: 0 });
    state.height += 500;
    await Promise.all([processPayouts("p", store, chain, fast), processPayouts("p", store, chain, fast)]);
    expect(state.paidCount("wallet1")).toBe(1);
    expect(state.paidCount("wallet2")).toBe(1);
    expect(store.rows.every((r) => r.status === "confirmed")).toBe(true);
  });

  it("sends nothing new when signature statuses can't be read", async () => {
    const store = memoryStore([{ status: "sent", signature: "old", last_valid_block_height: 900 }, {}]);
    const { chain, state } = mockChain();
    state.statusesFail = true;
    const res = await processPayouts("p", store, chain, fast);
    expect(state.landed.size).toBe(0);
    expect(store.rows[1].status).toBe("pending");
    expect(res.errors[0]).toMatch(/reconcile/);
  });

  it("a transfer that landed with an error is retried and paid once", async () => {
    const store = memoryStore([{}]);
    const { chain, state } = mockChain();
    state.modes = ["land_failed"];
    await processPayouts("p", store, chain, { ...fast, confirmPolls: 1 });
    expect(store.rows[0].status).toBe("pending");
    await processPayouts("p", store, chain, fast);
    expect(store.rows[0].status).toBe("confirmed");
    expect(state.paidCount("wallet1")).toBe(1);
  });

  it("releases a claim left by a run that crashed before signing, then pays once", async () => {
    const store = memoryStore([{ status: "sending", claimed_at: "2026-11-08T00:00:00.000Z" }]);
    const { chain, state } = mockChain();
    const res = await processPayouts("p", store, chain, { ...fast, now: () => new Date("2026-11-08T00:10:00Z") });
    expect(res.confirmed).toBe(1);
    expect(state.paidCount("wallet1")).toBe(1);
  });

  it("leaves a fresh claim from another run alone", async () => {
    const store = memoryStore([{ status: "sending", claimed_at: "2026-11-08T00:09:30.000Z" }]);
    const { chain, state } = mockChain();
    await processPayouts("p", store, chain, { ...fast, now: () => new Date("2026-11-08T00:10:00Z") });
    expect(store.rows[0].status).toBe("sending");
    expect(state.landed.size).toBe(0);
  });

  it("releases the claim when signing fails", async () => {
    const store = memoryStore([{}]);
    const { chain, state } = mockChain();
    state.signFail = true;
    const res = await processPayouts("p", store, chain, fast);
    expect(store.rows[0]).toMatchObject({ status: "pending", claimed_at: null });
    expect(res.errors[0]).toMatch(/sign payout/);
  });
});
