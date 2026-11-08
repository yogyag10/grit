export const DEMO_PACT_ID = "10000000-0000-4000-8000-0000000000d0";
export const DEMO_PACT_TITLE = "Wreck Beach run";

/** Retired fixed seeds. Existing records remain accessible by their direct receipt links. */
const RETIRED_SEED_IDS = new Set([
  "10000000-0000-4000-8000-000000000001",
  "10000000-0000-4000-8000-0000000000da",
  "10000000-0000-4000-8000-0000000000db",
  "10000000-0000-4000-8000-0000000000dc",
]);

export const isRetiredSeedPact = (id: string) => RETIRED_SEED_IDS.has(id);

export function demoPactSeed(now = Date.now(), endsAt?: string) {
  const end = endsAt ? Date.parse(endsAt) : now + 48 * 3600_000;
  if (!Number.isFinite(end) || end <= now) throw new Error("DEMO_ENDS must be a future ISO date.");
  return {
    id: DEMO_PACT_ID,
    title: DEMO_PACT_TITLE,
    visibility: "public",
    is_demo: true,
    goal_meters: 3000,
    stake_lamports: 100_000_000,
    starts_at: new Date(now - 5 * 60_000).toISOString(),
    ends_at: new Date(end).toISOString(),
    funding_cutoff: new Date(end).toISOString(),
    sync_cutoff: new Date(end + 3600_000).toISOString(),
  };
}
