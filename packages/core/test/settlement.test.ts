import { describe, expect, it } from "vitest";
import { planSettlement, type SettlementParticipant } from "../src/settlement";

const STAKE = 100_000_000; // 0.1 SOL
const GOAL = 20_000;
const CUTOFF = "2026-11-08T00:00:00Z";
const ON_TIME = "2026-11-07T20:00:00Z";

const p = (id: string, meters: number, over: Partial<SettlementParticipant> = {}): SettlementParticipant => ({
  id,
  wallet: `wallet-${id}`,
  depositLamports: STAKE,
  depositConfirmedAt: ON_TIME,
  acceptedMeters: meters,
  ...over,
});
const plan = (participants: SettlementParticipant[], stake = STAKE) =>
  planSettlement({ challengeId: "c1", stakeLamports: stake, goalMeters: GOAL, fundingCutoff: CUTOFF, participants });
const total = (xs: { lamports: number }[]) => xs.reduce((s, a) => s + a.lamports, 0);

describe("planSettlement", () => {
  it("splits the pool among qualifiers (4 funded, 2 qualify)", () => {
    const r = plan([p("a", 21_000), p("b", 20_000), p("c", 5_000), p("d", 0)]);
    expect(r.outcome).toBe("split");
    expect(r.poolLamports).toBe(4 * STAKE);
    expect(r.allocations).toEqual([
      { participantId: "a", wallet: "wallet-a", lamports: 2 * STAKE, kind: "payout" },
      { participantId: "b", wallet: "wallet-b", lamports: 2 * STAKE, kind: "payout" },
    ]);
  });

  it("refunds everyone when everyone succeeds", () => {
    const r = plan([p("a", 25_000), p("b", 20_000)]);
    expect(r.outcome).toBe("refund_all_succeeded");
    expect(r.allocations.every((a) => a.kind === "refund" && a.lamports === STAKE)).toBe(true);
  });

  it("refunds everyone when nobody succeeds", () => {
    const r = plan([p("a", 1_000), p("b", 0)]);
    expect(r.outcome).toBe("refund_none_succeeded");
    expect(total(r.allocations)).toBe(2 * STAKE);
  });

  it("gives the remainder 1 lamport at a time, in id order, and pays out the whole pool", () => {
    const stake = 100_000_001;
    const r = plan([p("c", 0), p("b", 30_000), p("a", 30_000)].map((x) => ({ ...x, depositLamports: stake })), stake);
    expect(r.allocations.map((a) => [a.participantId, a.lamports])).toEqual([
      ["a", 150_000_002],
      ["b", 150_000_001],
    ]);
    expect(total(r.allocations)).toBe(r.poolLamports);
  });

  it("never pays an unfunded member, even if they hit the goal", () => {
    const r = plan([p("a", 30_000), p("b", 0), p("ghost", 50_000, { depositLamports: 0, depositConfirmedAt: null })]);
    expect(r.fundedIds).toEqual(["a", "b"]);
    expect(r.qualifierIds).toEqual(["a"]);
    expect(r.allocations.find((x) => x.participantId === "ghost")).toBeUndefined();
  });

  it("returns late or wrong-amount deposits instead of pooling them", () => {
    const r = plan([
      p("a", 30_000),
      p("b", 0),
      p("late", 30_000, { depositConfirmedAt: "2026-11-08T00:00:01Z" }),
      p("short", 30_000, { depositLamports: STAKE - 1 }),
    ]);
    expect(r.poolLamports).toBe(2 * STAKE);
    expect(r.allocations.filter((a) => a.kind === "return_unfunded")).toEqual([
      { participantId: "late", wallet: "wallet-late", lamports: STAKE, kind: "return_unfunded" },
      { participantId: "short", wallet: "wallet-short", lamports: STAKE - 1, kind: "return_unfunded" },
    ]);
  });

  it("gives the same plan regardless of input order", () => {
    const xs = [p("a", 30_000), p("b", 0), p("c", 25_000)];
    expect(plan([...xs].reverse())).toEqual(plan(xs));
  });

  it("rejects bad money inputs", () => {
    expect(() => plan([p("a", 0, { depositLamports: 0.5 })])).toThrow();
    expect(() => plan([p("a", 0), p("a", 0)])).toThrow(/duplicate/);
    expect(() => plan([], 0)).toThrow();
  });
});
