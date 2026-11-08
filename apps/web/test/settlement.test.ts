/** Settlement input building and summaries. Tracks are SYNTHETIC fixtures; no network or DB. */
import { planSettlement } from "@movepact/core";
import { describe, expect, it } from "vitest";
import { run } from "../../../packages/core/test/fixtures";
import { outcomeSentence } from "../lib/receipt";
import { buildSettlementInput } from "../lib/settlement";
import { memberWindow, runSync, type SyncSource } from "../lib/sync";

const PACT = {
  id: "pact-1",
  stake_lamports: 100_000_000,
  goal_meters: 10_000,
  starts_at: "2026-11-07T00:00:00Z",
  ends_at: "2026-11-14T00:00:00Z",
  funding_cutoff: "2026-11-07T00:00:00Z",
  sync_cutoff: "2026-11-14T01:00:00Z",
};

async function checksFor(userId: string, kms: number[], syncedAt = "2026-11-12T00:00:00Z") {
  let id = userId.length * 1000;
  const items = kms.map((k, i) => ({
    ...run(k, { start: `2026-11-0${8 + i}T07:00:00Z` }).activity,
    id: id++,
    streams: run(k, { start: `2026-11-0${8 + i}T07:00:00Z` }).streams,
  }));
  const source: SyncSource = {
    listActivities: async () => items,
    getStreams: async (aid) => items.find((x) => x.id === aid)!.streams,
  };
  const out = await runSync({
    source,
    window: memberWindow(PACT, "2026-11-06T00:00:00Z"),
    now: new Date("2026-11-12T00:00:00Z"),
    alreadyChecked: new Set(),
  });
  return out.checked.map((c) => ({ user_id: userId, result: c.result, synced_at: syncedAt }));
}

const dep = (user_id: string, confirmed_at = "2026-11-06T12:00:00Z", lamports = 100_000_000) => ({
  user_id,
  lamports,
  confirmed_at,
});

describe("buildSettlementInput", () => {
  it("uses frozen progress and verified deposits, splitting the pool among qualifiers", async () => {
    const checks = [...(await checksFor("alice", [6, 6])), ...(await checksFor("bob", [3])), ...(await checksFor("cara", [11]))];
    const wallets = new Map([
      ["alice", "WalletA"],
      ["bob", "WalletB"],
      ["cara", "WalletC"],
    ]);
    const input = buildSettlementInput(PACT, [dep("alice"), dep("bob"), dep("cara")], wallets, checks);
    const plan = planSettlement(input);

    expect(plan.outcome).toBe("split");
    expect(plan.poolLamports).toBe(300_000_000);
    expect(plan.qualifierIds.sort()).toEqual(["alice", "cara"]);
    expect(plan.allocations.reduce((n, a) => n + a.lamports, 0)).toBe(300_000_000);
    expect(outcomeSentence({ outcome: plan.outcome, funded: 3, cleared: 2 })).toBe("2 of 3 reached the goal and split the pool.");
  });

  it("ignores activities synced after the cutoff", async () => {
    const late = await checksFor("alice", [12], "2026-11-14T02:00:00Z");
    const input = buildSettlementInput(PACT, [dep("alice"), dep("bob")], new Map([["alice", "A"], ["bob", "B"]]), late);
    expect(input.participants.find((p) => p.id === "alice")?.acceptedMeters).toBe(0);
    expect(planSettlement(input).outcome).toBe("refund_none_succeeded");
  });

  it("returns a late deposit instead of pooling it", async () => {
    const checks = await checksFor("alice", [12]);
    const input = buildSettlementInput(
      PACT,
      [dep("alice"), dep("bob"), dep("late", "2026-11-08T00:00:00Z")],
      new Map([["alice", "A"], ["bob", "B"], ["late", "L"]]),
      checks,
    );
    const plan = planSettlement(input);
    expect(plan.poolLamports).toBe(200_000_000);
    expect(plan.allocations.find((a) => a.participantId === "late")).toMatchObject({
      kind: "return_unfunded",
      lamports: 100_000_000,
    });
  });

  it("only includes members who deposited", () => {
    const input = buildSettlementInput(PACT, [dep("alice")], new Map([["alice", "A"], ["nodeposit", "N"]]), []);
    expect(input.participants.map((p) => p.id)).toEqual(["alice"]);
  });

  it("refuses to settle a depositor with no wallet rather than lose their funds", () => {
    expect(() => buildSettlementInput(PACT, [dep("alice")], new Map(), [])).toThrow(/no linked wallet/);
  });
});
