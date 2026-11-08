import type { CheckResult } from "./types";

export interface SyncedResult {
  result: CheckResult;
  /** ISO 8601 UTC time this activity was synced and checked */
  syncedAt: string;
}

export interface Progress {
  acceptedMeters: number;
  countedActivityIds: string[];
  /** Activities whose only syncs happened after the cutoff. Shown to the user, never counted. */
  lateActivityIds: string[];
}

/**
 * Sums accepted meters for one participant.
 * - Each Strava activity counts at most once, however many times it was synced.
 * - If an activity was synced more than once before the cutoff, the latest check wins.
 * - Anything synced after the cutoff is ignored, so settlement inputs are frozen.
 */
export function computeProgress(entries: SyncedResult[], syncCutoff: string): Progress {
  const cutoffMs = Date.parse(syncCutoff);
  const latest = new Map<string, SyncedResult>();
  const late = new Set<string>();

  for (const entry of entries) {
    const id = entry.result.activityId;
    const at = Date.parse(entry.syncedAt);
    if (!(at <= cutoffMs)) {
      late.add(id);
      continue;
    }
    const prev = latest.get(id);
    if (!prev || Date.parse(prev.syncedAt) <= at) latest.set(id, entry);
  }

  let acceptedMeters = 0;
  const counted: string[] = [];
  for (const [id, entry] of [...latest].sort(([a], [b]) => a.localeCompare(b))) {
    late.delete(id);
    if (entry.result.verdict === "accepted") {
      acceptedMeters += entry.result.acceptedMeters;
      counted.push(id);
    }
  }
  return { acceptedMeters, countedActivityIds: counted, lateActivityIds: [...late].sort() };
}
