export const GOAL_PRESETS_KM = [5, 10, 20, 42] as const;
export const STAKE_PRESETS_SOL = [0.05, 0.1, 0.25] as const;
export const MAX_ACTIVE_HOSTED = 3;
/** Custom values. The deposit cap is what the demo wallet funding can cover. */
export const GOAL_KM_RANGE = { min: 1, max: 100 } as const;
export const STAKE_SOL_RANGE = { min: 0.01, max: 0.25 } as const;

const TITLE = /^[\p{L}\p{N} .'&-]{3,50}$/u;
const MIN_LEAD_MS = 5 * 60_000;
const MAX_LEAD_MS = 30 * 86_400_000;
const MIN_LENGTH_MS = 3600_000;
const MAX_LENGTH_MS = 31 * 86_400_000;
const SYNC_GRACE_MS = 3600_000;

export interface NewPact {
  title: string;
  goal_meters: number;
  stake_lamports: number;
  visibility: "public" | "invite";
  starts_at: string;
  ends_at: string;
  funding_cutoff: string;
  sync_cutoff: string;
}

export type ParsedPact = { ok: true; pact: NewPact } | { ok: false; error: string };

/** True when `value` has no more decimals than 1/`perUnit` allows (0.1 km -> perUnit 10). */
function isMultiple(value: number, perUnit: number): boolean {
  return Math.abs(value * perUnit - Math.round(value * perUnit)) < 1e-9;
}

/** Validates a create-pact request against the presets and date rules. Joining closes when the pact starts. */
export function parseNewPact(body: unknown, now = Date.now()): ParsedPact {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const title = typeof b.title === "string" ? b.title.trim().replace(/\s+/g, " ") : "";
  if (!TITLE.test(title)) return { ok: false, error: "Name the pact with 3 to 50 letters, numbers or spaces." };
  const goalKm = b.goalKm;
  if (typeof goalKm !== "number" || !Number.isFinite(goalKm) || goalKm < GOAL_KM_RANGE.min || goalKm > GOAL_KM_RANGE.max || !isMultiple(goalKm, 10)) {
    return { ok: false, error: `Choose a goal between ${GOAL_KM_RANGE.min} and ${GOAL_KM_RANGE.max} km, in steps of 0.1.` };
  }
  const stakeSol = b.stakeSol;
  if (typeof stakeSol !== "number" || !Number.isFinite(stakeSol) || stakeSol < STAKE_SOL_RANGE.min || stakeSol > STAKE_SOL_RANGE.max || !isMultiple(stakeSol, 1000)) {
    return { ok: false, error: `Choose a deposit between ${STAKE_SOL_RANGE.min} and ${STAKE_SOL_RANGE.max} SOL, in steps of 0.001.` };
  }
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
      goal_meters: Math.round(goalKm * 1000),
      stake_lamports: Math.round(stakeSol * 1_000_000_000),
      visibility: b.visibility,
      starts_at: iso(start),
      ends_at: iso(end),
      funding_cutoff: iso(start),
      sync_cutoff: iso(end + SYNC_GRACE_MS),
    },
  };
}
