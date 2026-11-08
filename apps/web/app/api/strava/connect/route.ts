import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { appUrl, env } from "@/lib/env";
import { authorizeUrl, STATE_COOKIE } from "@/lib/strava";
import { getUser } from "@/lib/supabase/server";


export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.redirect(`${appUrl()}/signin`);

  const state = randomBytes(24).toString("hex");
  const res = NextResponse.redirect(
    authorizeUrl({ clientId: env("STRAVA_CLIENT_ID"), redirectUri: `${appUrl()}/api/strava/callback`, state }),
  );
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: appUrl().startsWith("https://"),
    path: "/api/strava",
    maxAge: 600,
  });
  return res;
}
