import { NextResponse } from "next/server";
import { loadMembership, loadPact } from "@/lib/pacts";
import { DISPLAY_NAME } from "@/lib/standings";
import { createSupabaseAdmin, getUser } from "@/lib/supabase/server";

/** A member chooses whether to appear on the leaderboard, and under what name. Off by default. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const show = body.show === true;
  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
  if (show && !DISPLAY_NAME.test(displayName)) {
    return NextResponse.json({ error: "Pick a name of 2 to 24 letters, numbers or spaces." }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  const pact = await loadPact(admin, id);
  if (!pact) return NextResponse.json({ error: "Pact not found." }, { status: 404 });
  if (!(await loadMembership(admin, pact.id, user.id))) {
    return NextResponse.json({ error: "Join this pact first." }, { status: 403 });
  }

  if (show) {
    const { error } = await admin.from("profiles").update({ display_name: displayName }).eq("id", user.id);
    if (error) return NextResponse.json({ error: "Couldn't save your name. Try again." }, { status: 500 });
  }
  const { error } = await admin
    .from("memberships")
    .update({ show_in_standings: show })
    .eq("pact_id", pact.id)
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: "Couldn't update that. Try again." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
