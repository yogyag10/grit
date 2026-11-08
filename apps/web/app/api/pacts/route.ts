import { NextResponse } from "next/server";
import { generateInviteCode } from "@/lib/community";
import { MAX_ACTIVE_HOSTED, parseNewPact } from "@/lib/pact-create";
import { createSupabaseAdmin, getUser } from "@/lib/supabase/server";

/** Creates a pact from presets. The host joins it as a staked member and still makes their own deposit. */
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const parsed = parseNewPact(await request.json().catch(() => ({})));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { pact } = parsed;

  const admin = createSupabaseAdmin();
  const { count } = await admin
    .from("pacts")
    .select("id", { count: "exact", head: true })
    .eq("host_id", user.id)
    .is("cancelled_at", null)
    .gt("ends_at", new Date().toISOString());
  if ((count ?? 0) >= MAX_ACTIVE_HOSTED) {
    return NextResponse.json({ error: `You can host up to ${MAX_ACTIVE_HOSTED} pacts at a time.` }, { status: 429 });
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const inviteCode = pact.visibility === "invite" ? generateInviteCode() : null;
    const { data: created, error } = await admin
      .from("pacts")
      // Running is the column default, so it is left out: creating a run pact works even before migration 0005 is applied.
      .insert({ ...pact, ...(pact.activity === "run" ? { activity: undefined } : {}), host_id: user.id, invite_code: inviteCode })
      .select("id")
      .single();
    if (error?.code === "23505") continue; // invite code collision: draw another
    if (error || !created) {
      console.error("creating pact failed", error?.code);
      return NextResponse.json({ error: "Couldn't create the pact. Try again." }, { status: 500 });
    }
    const { error: memberError } = await admin
      .from("memberships")
      .insert({ pact_id: created.id, user_id: user.id, mode: "staked" });
    if (memberError) {
      console.error("adding pact host failed", memberError.code);
      await admin.from("pacts").delete().eq("id", created.id);
      return NextResponse.json({ error: "Couldn't create the pact. Try again." }, { status: 500 });
    }
    return NextResponse.json({ id: created.id, path: `/pacts/${created.id}${inviteCode ? `?code=${inviteCode}` : ""}` });
  }
  return NextResponse.json({ error: "Couldn't create the pact. Try again." }, { status: 500 });
}
