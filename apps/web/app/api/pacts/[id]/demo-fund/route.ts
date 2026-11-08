import { NextResponse } from "next/server";
import { fundDemoWallet } from "@/lib/demo-funding";
import { loadMembership, loadPact } from "@/lib/pacts";
import { createSupabaseAdmin, getUser } from "@/lib/supabase/server";

export const maxDuration = 60;

/** Funds only an authenticated member's linked wallet, using the stake stored by the server. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const admin = createSupabaseAdmin();
  const { id } = await params;
  const pact = await loadPact(admin, id);
  if (!pact) return NextResponse.json({ error: "Pact not found." }, { status: 404 });
  const membership = await loadMembership(admin, pact.id, user.id);
  if (!membership || membership.mode !== "staked") {
    return NextResponse.json({ error: "Join this pact first." }, { status: 403 });
  }
  if (pact.cancelled_at || Date.now() >= Date.parse(pact.funding_cutoff)) {
    return NextResponse.json({ error: "Deposits are closed for this pact." }, { status: 409 });
  }
  const { data: deposit, error: depositError } = await admin.from("deposits").select("signature")
    .eq("pact_id", pact.id).eq("user_id", user.id).maybeSingle();
  if (depositError) return NextResponse.json({ error: "Couldn't check your deposit. Try again." }, { status: 503 });
  if (deposit) return NextResponse.json({ alreadyRecorded: true, signature: deposit.signature });
  const { data: profile } = await admin.from("profiles").select("wallet_address").eq("id", user.id).single();
  if (!profile?.wallet_address) return NextResponse.json({ error: "Set up your demo wallet first." }, { status: 409 });
  try {
    return NextResponse.json(await fundDemoWallet(profile.wallet_address, Number(pact.stake_lamports)));
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 503 });
  }
}
