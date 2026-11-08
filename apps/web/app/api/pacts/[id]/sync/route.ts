import { rulesFor } from "@oathmile/core";
import { NextResponse } from "next/server";
import { loadMembership, loadMyProgress, loadPact } from "@/lib/pacts";
import { getStreams, listActivities, StravaError } from "@/lib/strava";
import { getValidAccessToken } from "@/lib/strava-tokens";
import type { Json } from "@/lib/supabase/database.types";
import { createSupabaseAdmin, getUser } from "@/lib/supabase/server";
import { memberWindow, runSync, SYNC_ERROR_MESSAGES, syncPhase } from "@/lib/sync";

/** Pulls the member's Strava activities for this pact, checks them, and returns private progress. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { id } = await params;
  const admin = createSupabaseAdmin();
  const pact = await loadPact(admin, id);
  if (!pact) return NextResponse.json({ error: "Pact not found." }, { status: 404 });
  const membership = await loadMembership(admin, pact.id, user.id);
  if (!membership) return NextResponse.json({ error: "Join this pact first." }, { status: 403 });
  if (pact.cancelled_at) return NextResponse.json({ error: "This pact was cancelled." }, { status: 409 });

  const now = new Date();
  const window = memberWindow(pact, membership.joined_at);
  const phase = syncPhase(pact, window, now);
  if (phase !== "open") {
    const progress = await loadMyProgress(admin, pact, user.id);
    const message =
      phase === "frozen" ? "Progress is final. Syncing closed after the pact ended." : "Your activities start counting when the pact starts.";
    return NextResponse.json({ phase, message, progress });
  }

  let syncError: StravaError | null = null;
  let checkedCount = 0;
  let remaining = 0;
  try {
    const token = await getValidAccessToken(admin, user.id, now);
    const { data: existing, error: existingError } = await admin
      .from("activity_checks")
      .select("strava_activity_id")
      .eq("pact_id", pact.id)
      .eq("user_id", user.id);
    if (existingError) throw new Error(existingError.message);

    const outcome = await runSync({
      source: {
        listActivities: (range) => listActivities(token, range),
        getStreams: (activityId) => getStreams(token, activityId),
      },
      window,
      now,
      alreadyChecked: new Set((existing ?? []).map((r) => String(r.strava_activity_id))),
      rules: rulesFor(pact.activity),
    });

    if (outcome.checked.length > 0) {
      const { error } = await admin
        .from("activity_checks")
        .upsert(
          outcome.checked.map((row) => ({
            ...row,
            result: row.result as unknown as NonNullable<Json>,
            pact_id: pact.id,
            user_id: user.id,
          })),
          { onConflict: "pact_id,user_id,strava_activity_id" },
        );
      if (error) throw new Error(`saving checks failed: ${error.message}`);
    }
    syncError = outcome.error;
    checkedCount = outcome.checked.length;
    remaining = outcome.remaining;
  } catch (err) {
    if (!(err instanceof StravaError)) throw err;
    syncError = err;
  }

  if (syncError) {
    await admin.from("sync_errors").insert({
      user_id: user.id,
      pact_id: pact.id,
      kind: syncError.kind,
      message: syncError.message,
    });
  }

  const progress = await loadMyProgress(admin, pact, user.id);
  return NextResponse.json(
    {
      phase,
      checked: checkedCount,
      remaining,
      error: syncError ? { kind: syncError.kind, message: SYNC_ERROR_MESSAGES[syncError.kind], retryable: true } : null,
      progress,
    },
    { status: syncError && checkedCount === 0 ? 502 : 200 },
  );
}
