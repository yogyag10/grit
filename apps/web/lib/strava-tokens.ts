import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";
import { refreshAccessToken, StravaError, type StravaTokenResponse } from "./strava";
import type { Database } from "./supabase/database.types";

type Admin = SupabaseClient<Database>;

/** Refresh a little early so a token never expires mid-sync. */
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

export function stravaCreds() {
  return { clientId: env("STRAVA_CLIENT_ID"), clientSecret: env("STRAVA_CLIENT_SECRET") };
}

export async function saveTokens(admin: Admin, userId: string, tokens: StravaTokenResponse, scope: string) {
  const { error } = await admin.from("strava_tokens").upsert({
    user_id: userId,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: new Date(tokens.expires_at * 1000).toISOString(),
    scope,
  });
  if (error) throw new Error(`saving Strava tokens failed: ${error.message}`);
}

/** A valid access token for the user, refreshing (and saving) it if it has expired. */
export async function getValidAccessToken(admin: Admin, userId: string, now = new Date()): Promise<string> {
  const { data: row, error } = await admin
    .from("strava_tokens")
    .select("access_token, refresh_token, expires_at, scope")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`loading Strava tokens failed: ${error.message}`);
  if (!row) throw new StravaError("auth", null, "Strava is not connected");

  if (Date.parse(row.expires_at) - now.getTime() > REFRESH_MARGIN_MS) return row.access_token;

  const fresh = await refreshAccessToken(row.refresh_token, stravaCreds());
  await saveTokens(admin, userId, fresh, row.scope);
  return fresh.access_token;
}
