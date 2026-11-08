import { NextResponse } from "next/server";
import { loadPact } from "@/lib/pacts";
import { createSupabaseAdmin, getUser } from "@/lib/supabase/server";

/** Joins a pact as a staked member. The deposit is a separate step. Practice mode is P2. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const inviteCode = typeof body.inviteCode === "string" ? body.inviteCode : null;

  const admin = createSupabaseAdmin();
  const pact = await loadPact(admin, id);
  if (!pact) return NextResponse.json({ error: "Pact not found." }, { status: 404 });
  if (pact.visibility === "invite" && inviteCode !== pact.invite_code) {
    return NextResponse.json({ error: "Pact not found." }, { status: 404 });
  }
  if (pact.cancelled_at) return NextResponse.json({ error: "This pact was cancelled." }, { status: 409 });
  if (Date.now() >= Date.parse(pact.funding_cutoff)) {
    return NextResponse.json({ error: "Joining closed when the pact started." }, { status: 409 });
  }

  const { error } = await admin
    .from("memberships")
    .upsert({ pact_id: pact.id, user_id: user.id, mode: "staked" }, { onConflict: "pact_id,user_id", ignoreDuplicates: true });
  if (error) {
    console.error("join failed", error.code, error.message);
    return NextResponse.json({ error: "Couldn't join. Try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
