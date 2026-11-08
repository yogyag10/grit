import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { loadTreasury, solanaPayoutChain, supabasePayoutStore } from "@/lib/payouts-live";
import { runSettlement } from "@/lib/settlement";
import { connection } from "@/lib/solana";
import { createSupabaseAdmin } from "@/lib/supabase/server";

export const maxDuration = 60;

function authorized(header: string | null): boolean {
  const expected = Buffer.from(`Bearer ${env("SETTLEMENT_API_SECRET")}`);
  const got = Buffer.from(header ?? "");
  return got.length === expected.length && timingSafeEqual(got, expected);
}

/**
 * Called by n8n. Settles pacts past their sync cutoff and executes payouts. Returns aggregates only:
 * no names, no wallets, no fitness data.
 */
export async function POST(request: Request) {
  if (!authorized(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const admin = createSupabaseAdmin();
  const { newlySettled, summaries } = await runSettlement(admin, () => ({
    store: supabasePayoutStore(admin),
    chain: solanaPayoutChain(connection(), loadTreasury()),
  }));

  for (const s of summaries) {
    if (s.errors.length) console.error(`settlement ${s.pactId}:`, s.errors.join("; "));
  }

  return NextResponse.json({
    newlySettled,
    settledCount: summaries.length,
    pacts: summaries.map((s) => ({
      title: s.title,
      outcome: s.outcome,
      status: s.status,
      members: s.members,
      funded: s.funded,
      cleared: s.cleared,
      poolSol: s.poolLamports / 1e9,
      paidOutSol: s.paidOutLamports / 1e9,
      refundedSol: s.refundedLamports / 1e9,
      feeSol: 0,
      payouts: s.payouts,
      hadErrors: s.errors.length > 0,
      receiptUrl: s.receiptUrl,
    })),
  });
}
