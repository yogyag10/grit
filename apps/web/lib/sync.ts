import {
  checkActivity,
  computeProgress,
  REASON_MESSAGES,
  type ActivityStreams,
  type ChallengeWindow,
  type CheckResult,
  type ReasonCode,
} from "@movepact/core";
import { StravaError, type StravaErrorKind, type StravaSummaryActivity } from "./strava";

/** Pure sync logic. Strava and the database are injected so this is unit-testable. */

export interface PactTimes {
  starts_at: string;
  ends_at: string;
  sync_cutoff: string;
}

/** A member's runs count from max(starts_at, joined_at) to ends_at. */
export function memberWindow(pact: PactTimes, joinedAt: string): ChallengeWindow {
  const start = Math.max(Date.parse(pact.starts_at), Date.parse(joinedAt));
  return { startsAt: new Date(start).toISOString(), endsAt: new Date(Date.parse(pact.ends_at)).toISOString() };
}

export type SyncPhase = "not_started" | "open" | "frozen";

export function syncPhase(pact: PactTimes, window: ChallengeWindow, now: Date): SyncPhase {
  if (now.getTime() > Date.parse(pact.sync_cutoff)) return "frozen";
  if (now.getTime() < Date.parse(window.startsAt)) return "not_started";
  return "open";
}

export interface ActivitySummary {
  name: string | null;
  start_date: string;
  sport_type: string | null;
  distance: number;
}

/** What we store in activity_checks.result: the core CheckResult plus a little display info. */
export type StoredResult = CheckResult & { summary: ActivitySummary };

export interface CheckRow {
  strava_activity_id: number;
  verdict: CheckResult["verdict"];
  reasons: ReasonCode[];
  accepted_meters: number;
  result: StoredResult;
  synced_at: string;
}

export interface SyncSource {
  listActivities(range: { afterSec: number; beforeSec: number }): Promise<StravaSummaryActivity[]>;
  getStreams(activityId: number): Promise<ActivityStreams>;
}

export interface SyncOutcome {
  checked: CheckRow[];
  /** Activities not checked this time because of the per-sync cap; the next sync picks them up. */
  remaining: number;
  error: StravaError | null;
}

export const MAX_NEW_PER_SYNC = 30;

/**
 * Lists the member's activities inside their window and checks the ones not checked before.
 * A Strava failure stops the sync and is returned as a retryable error. Activities already checked
 * in this sync are kept. We never call checkActivity with streams we failed to fetch.
 */
export async function runSync(opts: {
  source: SyncSource;
  window: ChallengeWindow;
  now: Date;
  alreadyChecked: Set<string>;
  maxNew?: number;
}): Promise<SyncOutcome> {
  const { source, window, now, alreadyChecked } = opts;
  const maxNew = opts.maxNew ?? MAX_NEW_PER_SYNC;
  const checked: CheckRow[] = [];

  const afterSec = Math.floor(Date.parse(window.startsAt) / 1000) - 1;
  const beforeSec = Math.floor(Math.min(now.getTime(), Date.parse(window.endsAt)) / 1000);
  if (beforeSec <= afterSec) return { checked, remaining: 0, error: null };

  let activities: StravaSummaryActivity[];
  try {
    activities = await source.listActivities({ afterSec, beforeSec });
  } catch (err) {
    if (err instanceof StravaError) return { checked, remaining: 0, error: err };
    throw err;
  }

  const todo = activities
    .filter((a) => !alreadyChecked.has(String(a.id)))
    .sort((a, b) => Date.parse(a.start_date) - Date.parse(b.start_date));
  const batch = todo.slice(0, maxNew);

  for (const activity of batch) {
    let streams: ActivityStreams | null = null;
    // Manual entries have no recording, so there is nothing to fetch; checkActivity rejects them.
    if (!activity.manual) {
      try {
        streams = await source.getStreams(activity.id);
      } catch (err) {
        if (err instanceof StravaError) {
          return { checked, remaining: todo.length - checked.length, error: err };
        }
        throw err;
      }
    }
    const result = checkActivity(activity, streams, window);
    checked.push({
      strava_activity_id: Number(activity.id),
      verdict: result.verdict,
      reasons: result.reasons,
      accepted_meters: Math.floor(result.acceptedMeters),
      result: {
        ...result,
        summary: {
          name: activity.name ?? null,
          start_date: activity.start_date,
          sport_type: activity.sport_type ?? activity.type ?? null,
          distance: activity.distance,
        },
      },
      synced_at: now.toISOString(),
    });
  }
  return { checked, remaining: todo.length - checked.length, error: null };
}

export interface ActivityView {
  id: string;
  name: string | null;
  startDate: string;
  sportType: string | null;
  verdict: CheckResult["verdict"];
  acceptedMeters: number;
  counted: boolean;
  late: boolean;
  reasons: { code: ReasonCode; message: string }[];
}

export interface ProgressView {
  acceptedMeters: number;
  goalMeters: number;
  percent: number;
  cleared: boolean;
  activities: ActivityView[];
}

/** Private progress for one member. Frozen at sync_cutoff by computeProgress. */
export function buildProgressView(
  rows: { result: unknown; synced_at: string }[],
  pact: { goal_meters: number; sync_cutoff: string },
): ProgressView {
  const stored = rows.map((r) => ({ result: r.result as StoredResult, syncedAt: r.synced_at }));
  const progress = computeProgress(stored, pact.sync_cutoff);
  const counted = new Set(progress.countedActivityIds);
  const late = new Set(progress.lateActivityIds);

  const activities = stored
    .map(({ result }): ActivityView => ({
      id: result.activityId,
      name: result.summary?.name ?? null,
      startDate: result.summary?.start_date ?? "",
      sportType: result.summary?.sport_type ?? null,
      verdict: result.verdict,
      acceptedMeters: result.acceptedMeters,
      counted: counted.has(result.activityId),
      late: late.has(result.activityId),
      reasons: result.reasons.map((code) => ({ code, message: REASON_MESSAGES[code] })),
    }))
    .sort((a, b) => b.startDate.localeCompare(a.startDate));

  const percent = Math.min(100, Math.floor((progress.acceptedMeters / pact.goal_meters) * 100));
  return {
    acceptedMeters: progress.acceptedMeters,
    goalMeters: pact.goal_meters,
    percent,
    cleared: progress.acceptedMeters >= pact.goal_meters,
    activities,
  };
}

/** Member-facing text for a failed sync. Never suggests the member did anything wrong. */
export const SYNC_ERROR_MESSAGES: Record<StravaErrorKind, string> = {
  auth: "MovePact isn't connected to your Strava account. Connect Strava from Setup, then sync again.",
  permission:
    "MovePact can't read your activities. Reconnect Strava and allow access to all activities, including private ones.",
  rate_limited: "Strava is limiting requests right now. Try again in about 15 minutes.",
  not_found: "Strava couldn't find one of your activities. Try syncing again.",
  server: "Strava had a problem. Try syncing again in a minute.",
  network: "We couldn't reach Strava. Try syncing again.",
};
