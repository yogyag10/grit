/**
 * Creates one Demo pact (Wreck Beach run). Real pact, no fake deposits or activities:
 * teammates join, deposit real devnet SOL and sync real runs.
 *
 *   pnpm seed                         # uses apps/web/.env.local (local Supabase by default)
 *   ENV_FILE=.env.production.local pnpm seed
 *   pnpm seed --force                 # also reset times on pacts that already exist
 *
 * The demo stays open for 48 hours. Override its end with DEMO_ENDS (ISO 8601).
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/supabase/database.types";
import { DEMO_PACT_TITLE, demoPactSeed } from "../lib/demo-pact";

process.loadEnvFile(process.env.ENV_FILE ?? ".env.local");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
const force = process.argv.includes("--force");

async function main() {
  const db = createClient<Database>(url, key, { auth: { persistSession: false } });
  console.log(`Seeding ${url}\n`);
  const p = demoPactSeed(Date.now(), process.env.DEMO_ENDS);
  const { data: existing, error: readError } = await db.from("pacts").select("id, ends_at").eq("id", p.id).maybeSingle();
  if (readError) throw readError;
  const { error } = existing && !force
    ? await db.from("pacts").update({ title: DEMO_PACT_TITLE }).eq("id", p.id)
    : await db.from("pacts").upsert(p);
  if (error) throw error;
  console.log(`${existing ? force ? "reset" : "exists" : "created"}   ${DEMO_PACT_TITLE}`);
  console.log(`         ends ${new Date(existing && !force ? existing.ends_at : p.ends_at).toLocaleString("en-CA", { timeZone: "America/Vancouver" })}  ${appUrl}/pacts/${p.id}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
