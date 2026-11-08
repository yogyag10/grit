/**
 * Creates the official pact and the demo pacts. Real pacts, no fake deposits or activities:
 * teammates join, deposit real devnet SOL and sync real runs.
 *
 *   pnpm seed                         # uses apps/web/.env.local (local Supabase by default)
 *   ENV_FILE=.env.production.local pnpm seed
 *   pnpm seed --force                 # also reset times on pacts that already exist
 *
 * Demo end times default to Nov 8 2026 (Vancouver): A 06:00, B 08:00, C 10:00. Override with
 * DEMO_A_ENDS / DEMO_B_ENDS / DEMO_C_ENDS (ISO 8601).
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/supabase/database.types";

process.loadEnvFile(process.env.ENV_FILE ?? ".env.local");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
const force = process.argv.includes("--force");

const HOUR = 3600_000;
const now = Date.now();
const iso = (ms: number) => new Date(ms).toISOString();

type Seed = Database["public"]["Tables"]["pacts"]["Insert"];

function pact(id: string, title: string, goalKm: number, startsAt: number, endsAt: number, opts: Partial<Seed> = {}): Seed {
  return {
    id,
    title,
    visibility: "public",
    is_demo: true,
    goal_meters: goalKm * 1000,
    stake_lamports: 100_000_000,
    starts_at: iso(startsAt),
    ends_at: iso(endsAt),
    // Seeded demo pacts take deposits until the end so teammates can join tonight and still count.
    funding_cutoff: iso(endsAt),
    sync_cutoff: iso(endsAt + HOUR),
    ...opts,
  };
}

const demoEnd = (envName: string, fallback: string) => Date.parse(process.env[envName] ?? fallback);
const start = now - 5 * 60_000; // a few minutes ago, so syncing is open right away

const PACTS: Seed[] = [
  pact("10000000-0000-4000-8000-000000000001", "Weekly pact: 20 km in 7 days", 20, now + HOUR, now + HOUR + 7 * 24 * HOUR, {
    is_demo: false,
    funding_cutoff: iso(now + HOUR),
  }),
  pact("10000000-0000-4000-8000-0000000000d0", "Demo: live pact (3 km)", 3, start, now + 48 * HOUR),
  pact("10000000-0000-4000-8000-0000000000da", "Demo A: rehearsal (3 km)", 3, start, demoEnd("DEMO_A_ENDS", "2026-11-08T14:00:00Z")),
  pact("10000000-0000-4000-8000-0000000000db", "Demo B: judging (3 km)", 3, start, demoEnd("DEMO_B_ENDS", "2026-11-08T16:00:00Z")),
  pact("10000000-0000-4000-8000-0000000000dc", "Demo C: backup (3 km)", 3, start, demoEnd("DEMO_C_ENDS", "2026-11-08T18:00:00Z")),
];

async function main() {
  const db = createClient<Database>(url, key, { auth: { persistSession: false } });
  console.log(`Seeding ${url}\n`);
  for (const p of PACTS) {
    const { data: existing } = await db.from("pacts").select("id").eq("id", p.id!).maybeSingle();
    if (existing && !force) {
      console.log(`exists   ${p.title}`);
    } else {
      const { error } = await db.from("pacts").upsert(p);
      if (error) throw new Error(`${p.title}: ${error.message}`);
      console.log(`${existing ? "reset   " : "created "} ${p.title}`);
    }
    console.log(`         ends ${new Date(p.ends_at).toLocaleString("en-CA", { timeZone: "America/Vancouver" })}  ${appUrl}/pacts/${p.id}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
