import { NextResponse } from "next/server";
import { UUID } from "@/lib/community";
import { createSupabaseAdmin, getUser } from "@/lib/supabase/server";

/** Leaves a group. Your past messages stay; you can rejoin an open group any time, or a private one with its code. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Group not found." }, { status: 404 });

  const admin = createSupabaseAdmin();
  const { error } = await admin.from("group_members").delete().eq("group_id", id).eq("user_id", user.id);
  if (error) {
    console.error("leaving group failed", error.code);
    return NextResponse.json({ error: "Couldn't leave. Try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
