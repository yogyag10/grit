import { NextResponse } from "next/server";
import { normalizeCode, UUID } from "@/lib/community";
import { createSupabaseAdmin, getUser } from "@/lib/supabase/server";

const NOT_FOUND = { error: "That code doesn't match a group." };

/** Joins an open group by id, or any group with its invite code. Private groups can only be joined with the code. */
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const payload = await request.json().catch(() => ({}));
  const admin = createSupabaseAdmin();

  let groupId: string | null = null;
  if (payload.code !== undefined) {
    const code = normalizeCode(payload.code);
    if (!code) return NextResponse.json(NOT_FOUND, { status: 404 });
    const { data } = await admin.from("groups").select("id").eq("invite_code", code).maybeSingle();
    groupId = data?.id ?? null;
  } else if (typeof payload.groupId === "string" && UUID.test(payload.groupId)) {
    const { data } = await admin.from("groups").select("id, visibility").eq("id", payload.groupId).maybeSingle();
    groupId = data?.visibility === "public" ? data.id : null;
  }
  if (!groupId) return NextResponse.json(payload.code !== undefined ? NOT_FOUND : { error: "Group not found." }, { status: 404 });

  const { error } = await admin
    .from("group_members")
    .upsert({ group_id: groupId, user_id: user.id, role: "member" }, { onConflict: "group_id,user_id", ignoreDuplicates: true });
  if (error) {
    console.error("joining group failed", error.code);
    return NextResponse.json({ error: "Couldn't join. Try again." }, { status: 500 });
  }
  return NextResponse.json({ id: groupId });
}
