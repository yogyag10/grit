import { isActivityKind, type ActivityKind } from "@oathmile/core";

/** Goal distances offered for each activity. A swim or a sail doesn't cover the same ground as a ride. */
export const GOAL_PRESETS_KM: Record<ActivityKind, readonly number[]> = {
  run: [5, 10, 20, 42],
  trail_run: [5, 10, 20, 42],
  walk: [5, 10, 20, 42],
  hike: [5, 10, 20, 42],
  ride: [20, 50, 100, 200],
  mountain_bike: [10, 25, 50, 100],
  swim: [1, 2, 5, 10],
  row: [5, 10, 20, 42],
  sail: [10, 20, 50, 100],
};
export const STAKE_PRESETS_SOL = [0.05, 0.1, 0.25] as const;
export const MAX_ACTIVE_HOSTED = 3;

const TITLE = /^[\p{L}\p{N} .'&-]{3,50}$/u;
const MIN_LEAD_MS = 5 * 60_000;
const MAX_LEAD_MS = 30 * 86_400_000;
const MIN_LENGTH_MS = 3600_000;
const MAX_LENGTH_MS = 31 * 86_400_000;
const SYNC_GRACE_MS = 3600_000;

export interface NewPact {
  title: string;
  activity: ActivityKind;
  goal_meters: number;
  stake_lamports: number;
  visibility: "public" | "invite";
  starts_at: string;
  ends_at: string;
  funding_cutoff: string;
  sync_cutoff: string;
}

export type ParsedPact = { ok: true; pact: NewPact } | { ok: false; error: string };

/** Validates a create-pact request against the presets and date rules. Joining closes when the pact starts. */
export function parseNewPact(body: unknown, now = Date.now()): ParsedPact {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const title = typeof b.title === "string" ? b.title.trim().replace(/\s+/g, " ") : "";
  if (!TITLE.test(title)) return { ok: false, error: "Name the pact with 3 to 50 letters, numbers or spaces." };
  const activity = b.activity ?? "run";
  if (!isActivityKind(activity)) return { ok: false, error: "Pick one of the activities." };
  if (!GOAL_PRESETS_KM[activity].some((km) => km === b.goalKm)) return { ok: false, error: "Pick one of the goal distances." };
  if (!STAKE_PRESETS_SOL.some((sol) => sol === b.stakeSol)) return { ok: false, error: "Pick one of the deposit amounts." };
  if (b.visibility !== "public" && b.visibility !== "invite") return { ok: false, error: "Choose public or invite only." };

  const start = typeof b.startsAt === "string" ? Date.parse(b.startsAt) : NaN;
  const end = typeof b.endsAt === "string" ? Date.parse(b.endsAt) : NaN;
  if (!Number.isFinite(start) || !Number.isFinite(end)) return { ok: false, error: "Choose a start and an end." };
  if (start < now + MIN_LEAD_MS) return { ok: false, error: "Start at least 5 minutes from now, so people can join and deposit first." };
  if (start > now + MAX_LEAD_MS) return { ok: false, error: "Start within the next 30 days." };
  if (end - start < MIN_LENGTH_MS) return { ok: false, error: "The pact needs to run for at least an hour." };
  if (end - start > MAX_LENGTH_MS) return { ok: false, error: "Pacts can run for up to 31 days." };

  const iso = (ms: number) => new Date(ms).toISOString();
  return {
    ok: true,
    pact: {
      title,
      activity,
      goal_meters: (b.goalKm as number) * 1000,
      stake_lamports: Math.round((b.stakeSol as number) * 1_000_000_000),
      visibility: b.visibility,
      starts_at: iso(start),
      ends_at: iso(end),
      funding_cutoff: iso(start),
      sync_cutoff: iso(end + SYNC_GRACE_MS),
    },
  };
}
