import { NextResponse } from "next/server";
import { cleanDescription, generateInviteCode, GROUP_NAME, MAX_GROUPS_PER_MEMBER } from "@/lib/community";
import { createSupabaseAdmin, getUser } from "@/lib/supabase/server";

/** Creates a group. Private groups get a shareable invite code; the creator becomes its owner. */
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const payload = await request.json().catch(() => ({}));
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  if (!GROUP_NAME.test(name)) {
    return NextResponse.json({ error: "Name the group with 2 to 40 letters, numbers or spaces." }, { status: 400 });
  }
  const description = cleanDescription(payload.description);
  if (description === null) {
    return NextResponse.json({ error: "Keep the description under 120 characters." }, { status: 400 });
  }
  if (payload.visibility !== "public" && payload.visibility !== "private") {
    return NextResponse.json({ error: "Choose open or private." }, { status: 400 });
  }
  const visibility: "public" | "private" = payload.visibility;

  const admin = createSupabaseAdmin();
  const { count } = await admin.from("groups").select("id", { count: "exact", head: true }).eq("created_by", user.id);
  if ((count ?? 0) >= MAX_GROUPS_PER_MEMBER) {
    return NextResponse.json({ error: `You can start up to ${MAX_GROUPS_PER_MEMBER} groups.` }, { status: 429 });
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: group, error } = await admin
      .from("groups")
      .insert({
        name,
        description,
        visibility,
        invite_code: visibility === "private" ? generateInviteCode() : null,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (error?.code === "23505") continue; // invite code collision: draw another
    if (error || !group) {
      console.error("creating group failed", error?.code);
      return NextResponse.json({ error: "Couldn't create the group. Try again." }, { status: 500 });
    }
    const { error: memberError } = await admin
      .from("group_members")
      .insert({ group_id: group.id, user_id: user.id, role: "owner" });
    if (memberError) {
      console.error("adding group owner failed", memberError.code);
      await admin.from("groups").delete().eq("id", group.id);
      return NextResponse.json({ error: "Couldn't create the group. Try again." }, { status: 500 });
    }
    return NextResponse.json({ id: group.id });
  }
  return NextResponse.json({ error: "Couldn't create the group. Try again." }, { status: 500 });
}
