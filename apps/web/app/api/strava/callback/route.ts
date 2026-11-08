import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { appUrl } from "@/lib/env";
import { exchangeCode, hasRequiredScope, STATE_COOKIE, StravaError } from "@/lib/strava";
import { saveTokens, stravaCreds } from "@/lib/strava-tokens";
import { createSupabaseAdmin, getUser } from "@/lib/supabase/server";

function back(status: string) {
  const res = NextResponse.redirect(`${appUrl()}/onboarding?strava=${status}`);
  res.cookies.set(STATE_COOKIE, "", { path: "/api/strava", maxAge: 0 });
  return res;
}

function sameState(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.redirect(`${appUrl()}/signin`);

  const q = request.nextUrl.searchParams;
  if (!sameState(q.get("state"), request.cookies.get(STATE_COOKIE)?.value)) return back("bad_state");
  if (q.get("error")) return back("denied");

  // Missing activity:read_all is a permissions problem to fix, never a cheating signal.
  const scope = q.get("scope");
  if (!hasRequiredScope(scope)) return back("missing_scope");

  const code = q.get("code");
  if (!code) return back("error");

  try {
    const tokens = await exchangeCode(code, stravaCreds());
    const athleteId = tokens.athlete?.id;
    if (!athleteId) return back("error");

    const admin = createSupabaseAdmin();
    const { error } = await admin.from("profiles").update({ strava_athlete_id: athleteId }).eq("id", user.id);
    if (error) return back(error.code === "23505" ? "athlete_taken" : "error");

    await saveTokens(admin, user.id, tokens, scope ?? "");
    return back("connected");
  } catch (err) {
    console.error("Strava callback failed", err instanceof StravaError ? `${err.kind} ${err.status}` : err);
    return back("error");
  }
}
