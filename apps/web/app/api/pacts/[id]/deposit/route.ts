import { NextResponse } from "next/server";
import { loadMembership, loadPact } from "@/lib/pacts";
import { explorerTx, fetchParsedTransaction, isSignatureString, treasuryAddress, verifyDepositTx } from "@/lib/solana";
import { createSupabaseAdmin, getUser } from "@/lib/supabase/server";

/**
 * Records a commitment deposit after verifying it on devnet. Never trusts a client "success":
 * the transaction is fetched and checked here. Late deposits are recorded so settlement returns them.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const signature = body.signature;
  if (!isSignatureString(signature)) return NextResponse.json({ error: "Invalid transaction signature." }, { status: 400 });

  const admin = createSupabaseAdmin();
  const pact = await loadPact(admin, id);
  if (!pact) return NextResponse.json({ error: "Pact not found." }, { status: 404 });
  const membership = await loadMembership(admin, pact.id, user.id);
  if (!membership) return NextResponse.json({ error: "Join this pact first." }, { status: 403 });
  if (membership.mode !== "staked") {
    return NextResponse.json({ error: "Practice entries don't take a deposit." }, { status: 409 });
  }

  const { data: profile } = await admin.from("profiles").select("wallet_address").eq("id", user.id).single();
  if (!profile?.wallet_address) return NextResponse.json({ error: "Link your wallet first." }, { status: 409 });

  const { data: existing } = await admin
    .from("deposits")
    .select("signature")
    .eq("pact_id", pact.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      existing.signature === signature
        ? { ok: true, alreadyRecorded: true, explorer: explorerTx(signature) }
        : { error: "You've already made a deposit for this pact." },
      { status: existing.signature === signature ? 200 : 409 },
    );
  }

  const tx = await fetchParsedTransaction(signature).catch((err) => {
    console.error("getParsedTransaction failed", (err as Error).message);
    return undefined;
  });
  if (tx === undefined) {
    return NextResponse.json({ error: "Couldn't reach Solana devnet. Trying again shortly.", retryable: true }, { status: 503 });
  }

  const check = verifyDepositTx(tx, {
    from: profile.wallet_address,
    to: treasuryAddress(),
    lamports: Number(pact.stake_lamports),
  });
  if (!check.ok) {
    return NextResponse.json(
      { error: check.message, code: check.code, retryable: check.retryable },
      { status: check.retryable ? 404 : 422 },
    );
  }

  const { error } = await admin.from("deposits").insert({
    signature,
    pact_id: pact.id,
    user_id: user.id,
    lamports: check.lamports,
    confirmed_at: check.confirmedAt,
  });
  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "This transaction has already been used for a deposit." }, { status: 409 });
    }
    console.error("deposit insert failed", error.code);
    return NextResponse.json({ error: "Couldn't record the deposit. Try again." }, { status: 500 });
  }

  const late = Date.parse(check.confirmedAt) > Date.parse(pact.funding_cutoff);
  return NextResponse.json({
    ok: true,
    late,
    message: late
      ? "This deposit arrived after the pact started, so it isn't in the pool. It will be returned to your wallet when the pact settles."
      : "Deposit confirmed on devnet.",
    explorer: explorerTx(signature),
  });
}
