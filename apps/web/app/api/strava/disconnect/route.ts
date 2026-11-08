import { NextResponse } from "next/server";
import { createSupabaseAdmin, getUser } from "@/lib/supabase/server";

/**
 * Disconnects Strava: revokes Grit's access at Strava (best effort), then deletes the stored tokens and the link
 * to the athlete. Activities already checked stay, because settlement needs them. Syncing needs a reconnect.
 */
export async function POST() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const admin = createSupabaseAdmin();
  const { data: row } = await admin.from("strava_tokens").select("access_token").eq("user_id", user.id).maybeSingle();
  if (row) {
    try {
      await fetch("https://www.strava.com/oauth/deauthorize", {
        method: "POST",
        headers: { Authorization: `Bearer ${row.access_token}` },
      });
    } catch {
      // Strava unreachable or the token already expired: we still remove our copy below.
    }
  }

  const { error: tokenError } = await admin.from("strava_tokens").delete().eq("user_id", user.id);
  const { error: profileError } = await admin.from("profiles").update({ strava_athlete_id: null }).eq("id", user.id);
  if (tokenError || profileError) {
    console.error("disconnecting Strava failed", tokenError?.code, profileError?.code);
    return NextResponse.json({ error: "Couldn't disconnect Strava. Try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
