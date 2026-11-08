import type { SupabaseClient } from "@supabase/supabase-js";
import type { Pact } from "./pacts";
import type { StoredPlan } from "./settlement";
import { explorerTx } from "./solana";
import type { Database } from "./supabase/database.types";

type Admin = SupabaseClient<Database>;

/** Public Pool Receipt: every deposit and payout, truncated wallets, no names, no fitness data. */

export const truncateWallet = (w: string) => `${w.slice(0, 4)}…${w.slice(-4)}`;

export interface ReceiptLine {
  wallet: string;
  lamports: number;
  kind: string;
  status: string;
  signature: string | null;
  explorer: string | null;
  at: string | null;
}

export interface Receipt {
  pactId: string;
  title: string;
  isDemo: boolean;
  goalMeters: number;
  stakeLamports: number;
  endsAt: string;
  settled: boolean;
  settlementStatus: string | null;
  outcome: StoredPlan["outcome"] | null;
  members: number;
  funded: number | null;
  cleared: number | null;
  deposits: ReceiptLine[];
  payouts: ReceiptLine[];
  totals: {
    depositedLamports: number;
    poolLamports: number;
    feeLamports: 0;
    paidOutLamports: number;
    refundedLamports: number;
    outstandingLamports: number;
  };
  /** True once every payout is confirmed and money out equals money in. */
  balanced: boolean;
}

export async function buildReceipt(admin: Admin, pact: Pact): Promise<Receipt> {
  const [{ data: deposits }, { data: payouts }, { data: settlement }, { count: members }] = await Promise.all([
    admin.from("deposits").select("user_id, lamports, signature, confirmed_at").eq("pact_id", pact.id).order("confirmed_at"),
    admin.from("payouts").select("wallet, lamports, kind, status, signature").eq("pact_id", pact.id).order("id"),
    admin.from("settlements").select("plan, status").eq("pact_id", pact.id).maybeSingle(),
    admin.from("memberships").select("user_id", { count: "exact", head: true }).eq("pact_id", pact.id).is("left_at", null),
  ]);

  const userIds = [...new Set((deposits ?? []).map((d) => d.user_id))];
  const { data: profiles } = userIds.length
    ? await admin.from("profiles").select("id, wallet_address").in("id", userIds)
    : { data: [] };
  const walletOf = new Map((profiles ?? []).map((p) => [p.id, p.wallet_address ?? ""]));

  const depositLines: ReceiptLine[] = (deposits ?? []).map((d) => ({
    wallet: truncateWallet(walletOf.get(d.user_id) ?? "unknown"),
    lamports: Number(d.lamports),
    kind: Date.parse(d.confirmed_at) > Date.parse(pact.funding_cutoff) ? "late_deposit" : "deposit",
    status: "confirmed",
    signature: d.signature,
    explorer: explorerTx(d.signature),
    at: d.confirmed_at,
  }));
  const payoutLines: ReceiptLine[] = (payouts ?? []).map((p) => ({
    wallet: truncateWallet(p.wallet),
    lamports: Number(p.lamports),
    kind: p.kind,
    status: p.status,
    signature: p.status === "confirmed" ? p.signature : null,
    explorer: p.status === "confirmed" && p.signature ? explorerTx(p.signature) : null,
    at: null,
  }));

  const plan = (settlement?.plan ?? null) as StoredPlan | null;
  const sum = (lines: ReceiptLine[]) => lines.reduce((n, l) => n + l.lamports, 0);
  const confirmedOut = payoutLines.filter((l) => l.status === "confirmed");
  const depositedLamports = sum(depositLines);
  const paidOutLamports = sum(confirmedOut.filter((l) => l.kind === "payout"));
  const refundedLamports = sum(confirmedOut.filter((l) => l.kind !== "payout"));
  const poolLamports = plan ? plan.poolLamports : sum(depositLines.filter((l) => l.kind === "deposit" && l.lamports === Number(pact.stake_lamports)));

  return {
    pactId: pact.id,
    title: pact.title,
    isDemo: pact.is_demo,
    goalMeters: pact.goal_meters,
    stakeLamports: Number(pact.stake_lamports),
    endsAt: pact.ends_at,
    settled: !!settlement,
    settlementStatus: settlement?.status ?? null,
    outcome: plan?.outcome ?? null,
    members: members ?? 0,
    funded: plan ? plan.fundedIds.length : null,
    cleared: plan ? plan.qualifierIds.length : null,
    deposits: depositLines,
    payouts: payoutLines,
    totals: {
      depositedLamports,
      poolLamports,
      feeLamports: 0,
      paidOutLamports,
      refundedLamports,
      outstandingLamports: depositedLamports - paidOutLamports - refundedLamports,
    },
    balanced:
      settlement?.status === "done" &&
      payoutLines.every((l) => l.status === "confirmed") &&
      paidOutLamports + refundedLamports === depositedLamports,
  };
}

/** Public pacts' receipts are public. Invite-only pacts' receipts are for members or invite-code holders. */
export function canViewReceipt(pact: Pact, isMember: boolean, code: string | null): boolean {
  return pact.visibility === "public" || isMember || (!!code && code === pact.invite_code);
}

export function outcomeSentence(r: Pick<Receipt, "outcome" | "funded" | "cleared">): string {
  switch (r.outcome) {
    case "split":
      return `${r.cleared} of ${r.funded} reached the goal and split the pool.`;
    case "refund_all_succeeded":
      return `All ${r.funded} reached the goal. Everyone got their deposit back.`;
    case "refund_none_succeeded":
      return `Nobody reached the goal, so all ${r.funded} got their deposit back.`;
    case "no_funded_participants":
      return "No deposits were made before the start, so there was nothing to settle.";
    default:
      return "Not settled yet.";
  }
}
