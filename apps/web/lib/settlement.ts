import {
  computeProgress,
  planSettlement,
  type CheckResult,
  type SettlementInput,
  type SettlementOutcome,
  type SettlementPlan,
} from "@oathmile/core";
import type { SupabaseClient } from "@supabase/supabase-js";
import { appUrl } from "./env";
import { processPayouts, type PayoutChain, type PayoutRunResult, type PayoutStore } from "./payouts";
import type { Database, Json } from "./supabase/database.types";

type Admin = SupabaseClient<Database>;
type Pact = Database["public"]["Tables"]["pacts"]["Row"];

/** What we store in settlements.plan: the core plan plus the member count for public summaries. */
export type StoredPlan = SettlementPlan & { memberCount: number };

export interface DepositRow {
  user_id: string;
  lamports: number;
  confirmed_at: string;
}

/**
 * Pure: builds planSettlement input. Only members with a verified deposit take part; everyone else has
 * nothing to settle. Progress is frozen at sync_cutoff by computeProgress.
 */
export function buildSettlementInput(
  pact: Pick<Pact, "id" | "stake_lamports" | "goal_meters" | "funding_cutoff" | "sync_cutoff">,
  deposits: DepositRow[],
  wallets: Map<string, string | null>,
  checks: { user_id: string; result: unknown; synced_at: string }[],
): SettlementInput {
  const byUser = new Map<string, DepositRow[]>();
  for (const d of deposits) byUser.set(d.user_id, [...(byUser.get(d.user_id) ?? []), d]);

  const participants = [...byUser].map(([userId, rows]) => {
    const wallet = wallets.get(userId);
    if (!wallet) throw new Error(`member ${userId} has a deposit but no linked wallet`);
    const entries = checks
      .filter((c) => c.user_id === userId)
      .map((c) => ({ result: c.result as CheckResult, syncedAt: c.synced_at }));
    const lastConfirmed = rows.map((r) => r.confirmed_at).sort().at(-1) ?? null;
    return {
      id: userId,
      wallet,
      depositLamports: rows.reduce((sum, r) => sum + Number(r.lamports), 0),
      depositConfirmedAt: lastConfirmed,
      acceptedMeters: computeProgress(entries, pact.sync_cutoff).acceptedMeters,
    };
  });

  return {
    challengeId: pact.id,
    stakeLamports: Number(pact.stake_lamports),
    goalMeters: pact.goal_meters,
    fundingCutoff: pact.funding_cutoff,
    participants,
  };
}

export interface PactSettlementSummary {
  pactId: string;
  title: string;
  outcome: SettlementOutcome;
  status: string;
  members: number;
  funded: number;
  cleared: number;
  poolLamports: number;
  paidOutLamports: number;
  refundedLamports: number;
  feeLamports: 0;
  payouts: Omit<PayoutRunResult, "errors">;
  errors: string[];
  /** Confirmed payout transaction signatures (public on-chain anyway). */
  signatures: string[];
  receiptUrl: string;
}

async function planAndInsert(admin: Admin, pact: Pact): Promise<boolean> {
  const [{ data: deposits, error: dErr }, { data: checks, error: cErr }, { count: memberCount }] = await Promise.all([
    admin.from("deposits").select("user_id, lamports, confirmed_at").eq("pact_id", pact.id),
    admin.from("activity_checks").select("user_id, result, synced_at").eq("pact_id", pact.id),
    admin.from("memberships").select("user_id", { count: "exact", head: true }).eq("pact_id", pact.id).is("left_at", null),
  ]);
  if (dErr || cErr) throw new Error((dErr ?? cErr)!.message);

  const userIds = [...new Set((deposits ?? []).map((d) => d.user_id))];
  const { data: profiles, error: pErr } = userIds.length
    ? await admin.from("profiles").select("id, wallet_address").in("id", userIds)
    : { data: [], error: null };
  if (pErr) throw new Error(pErr.message);

  const input = buildSettlementInput(
    pact,
    (deposits ?? []).map((d) => ({ ...d, lamports: Number(d.lamports) })),
    new Map((profiles ?? []).map((p) => [p.id, p.wallet_address])),
    checks ?? [],
  );
  const plan: StoredPlan = { ...planSettlement(input), memberCount: memberCount ?? 0 };

  const { data: created, error } = await admin.rpc("create_settlement", {
    p_pact_id: pact.id,
    p_plan: plan as unknown as Json,
    p_payouts: plan.allocations.map((a) => ({
      participant_id: a.participantId,
      wallet: a.wallet,
      lamports: a.lamports,
      kind: a.kind,
    })) as unknown as Json,
  });
  if (error) throw new Error(`create_settlement failed: ${error.message}`);
  return created === true;
}

/**
 * Settles every pact past its sync cutoff that has no settlement yet, then pays out (or resumes paying)
 * every unfinished settlement. Safe to call repeatedly and concurrently.
 */
export async function runSettlement(
  admin: Admin,
  payoutDeps: () => { store: PayoutStore; chain: PayoutChain },
  now = new Date(),
): Promise<{ newlySettled: number; summaries: PactSettlementSummary[] }> {
  const { data: due, error } = await admin
    .from("pacts")
    .select("*")
    .lt("sync_cutoff", now.toISOString())
    .is("cancelled_at", null);
  if (error) throw new Error(error.message);

  const { data: existing } = await admin.from("settlements").select("pact_id");
  const settled = new Set((existing ?? []).map((s) => s.pact_id));
  let newlySettled = 0;
  for (const pact of (due ?? []).filter((p) => !settled.has(p.id))) {
    if (await planAndInsert(admin, pact)) newlySettled++;
  }

  const { data: open, error: oErr } = await admin
    .from("settlements")
    .select("pact_id, plan, status, pacts (title)")
    .neq("status", "done");
  if (oErr) throw new Error(oErr.message);
  const { data: fresh } = newlySettled
    ? await admin.from("settlements").select("pact_id, plan, status, pacts (title)").eq("status", "done").gte("created_at", now.toISOString())
    : { data: [] };

  const summaries: PactSettlementSummary[] = [];
  let deps: { store: PayoutStore; chain: PayoutChain } | null = null;
  for (const s of [...(open ?? []), ...(fresh ?? [])]) {
    let result: PayoutRunResult = { confirmed: 0, inFlight: 0, pending: 0, errors: [] };
    if (s.status !== "done") {
      deps ??= payoutDeps();
      result = await processPayouts(s.pact_id, deps.store, deps.chain);
      if (result.pending === 0 && result.inFlight === 0) {
        await admin.from("settlements").update({ status: "done" }).eq("pact_id", s.pact_id).neq("status", "done");
      }
    }
    summaries.push(await summarizeSettlement(admin, s.pact_id, s.pacts?.title ?? "", s.plan as unknown as StoredPlan, result));
  }
  return { newlySettled, summaries };
}

async function summarizeSettlement(
  admin: Admin,
  pactId: string,
  title: string,
  plan: StoredPlan,
  run: PayoutRunResult,
): Promise<PactSettlementSummary> {
  const { data: settlement } = await admin.from("settlements").select("status").eq("pact_id", pactId).single();
  const { data: payouts } = await admin.from("payouts").select("kind, lamports, status, signature").eq("pact_id", pactId);
  const confirmed = (payouts ?? []).filter((p) => p.status === "confirmed");
  const sum = (kinds: string[]) =>
    confirmed.filter((p) => kinds.includes(p.kind)).reduce((n, p) => n + Number(p.lamports), 0);
  return {
    pactId,
    title,
    outcome: plan.outcome,
    status: settlement?.status ?? "unknown",
    members: plan.memberCount,
    funded: plan.fundedIds.length,
    cleared: plan.qualifierIds.length,
    poolLamports: plan.poolLamports,
    paidOutLamports: sum(["payout"]),
    refundedLamports: sum(["refund", "return_unfunded", "leave_refund"]),
    feeLamports: 0,
    payouts: { confirmed: run.confirmed, inFlight: run.inFlight, pending: run.pending },
    errors: run.errors,
    signatures: confirmed.map((p) => p.signature).filter((x): x is string => !!x),
    receiptUrl: `${appUrl()}/pacts/${pactId}/receipt`,
  };
}
