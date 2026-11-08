import { NextResponse } from "next/server";
import { DISPLAY_NAME } from "@/lib/standings";
import { createSupabaseAdmin, getUser } from "@/lib/supabase/server";

/** Sets the name other members see in chats and, if you opt in, on leaderboards. */
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const payload = await request.json().catch(() => ({}));
  const displayName = typeof payload.displayName === "string" ? payload.displayName.trim() : "";
  if (!DISPLAY_NAME.test(displayName)) {
    return NextResponse.json({ error: "Pick a name of 2 to 24 letters, numbers or spaces." }, { status: 400 });
  }
  const { error } = await createSupabaseAdmin().from("profiles").update({ display_name: displayName }).eq("id", user.id);
  if (error) {
    console.error("saving display name failed", error.code);
    return NextResponse.json({ error: "Couldn't save your name. Try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
