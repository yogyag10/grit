import type { SupabaseClient } from "@supabase/supabase-js";
import type { Pact } from "./pacts";
import type { StoredPlan } from "./settlement";
import type { Database } from "./supabase/database.types";
import { buildProgressView } from "./sync";

type Admin = SupabaseClient<Database>;

export interface PactStats {
  members: number;
  funded: number;
  cleared: number;
  poolLamports: number;
  settled: boolean;
}

export interface StandingRow {
  userId: string;
  name: string;
  percent: number;
  /** Accepted distance, capped at the goal. Opted-in members only. */
  meters: number;
  cleared: boolean;
}

export interface Standings {
  rows: StandingRow[];
  /** Funded members who did not opt in: counts only, never names. */
  hiddenCleared: number;
  hiddenNotCleared: number;
}

/** Accepted meters per funded member, from one query. Only counts and percentages leave this module. */
async function progressByUser(admin: Admin, pact: Pact, userIds: string[]) {
  const out = new Map<string, { acceptedMeters: number; cleared: boolean }>();
  if (userIds.length === 0) return out;
  const { data, error } = await admin
    .from("activity_checks")
    .select("user_id, result, synced_at")
    .eq("pact_id", pact.id)
    .in("user_id", userIds);
  if (error) throw new Error(`loading activity checks failed: ${error.message}`);
  const byUser = new Map<string, { result: unknown; synced_at: string }[]>();
  for (const row of data ?? []) byUser.set(row.user_id, [...(byUser.get(row.user_id) ?? []), row]);
  for (const id of userIds) {
    const view = buildProgressView(byUser.get(id) ?? [], pact);
    out.set(id, { acceptedMeters: view.acceptedMeters, cleared: view.cleared });
  }
  return out;
}

async function fundedUserIds(admin: Admin, pact: Pact): Promise<string[]> {
  const { data, error } = await admin
    .from("deposits")
    .select("user_id")
    .eq("pact_id", pact.id)
    .lte("confirmed_at", pact.funding_cutoff);
  if (error) throw new Error(`loading deposits failed: ${error.message}`);
  return (data ?? []).map((d) => d.user_id);
}

export async function loadStats(admin: Admin, pact: Pact): Promise<PactStats> {
  const [{ count }, { data: settlement }] = await Promise.all([
    admin
      .from("memberships")
      .select("user_id", { count: "exact", head: true })
      .eq("pact_id", pact.id)
      .eq("mode", "staked")
      .is("left_at", null),
    admin.from("settlements").select("plan").eq("pact_id", pact.id).maybeSingle(),
  ]);
  if (settlement) {
    const plan = settlement.plan as unknown as StoredPlan;
    return {
      members: count ?? 0,
      funded: plan.fundedIds.length,
      cleared: plan.qualifierIds.length,
      poolLamports: plan.poolLamports,
      settled: true,
    };
  }
  const funded = await fundedUserIds(admin, pact);
  const progress = await progressByUser(admin, pact, funded);
  return {
    members: count ?? 0,
    funded: funded.length,
    cleared: [...progress.values()].filter((p) => p.cleared).length,
    poolLamports: funded.length * Number(pact.stake_lamports),
    settled: false,
  };
}

/** Opted-in funded members with a name and a % of goal; everyone else is a count. */
export async function loadStandings(admin: Admin, pact: Pact): Promise<Standings> {
  const funded = await fundedUserIds(admin, pact);
  const progress = await progressByUser(admin, pact, funded);
  const { data: optedIn, error } = await admin
    .from("memberships")
    .select("user_id, profiles (display_name)")
    .eq("pact_id", pact.id)
    .eq("show_in_standings", true)
    .in("user_id", funded.length ? funded : ["00000000-0000-0000-0000-000000000000"]);
  if (error) throw new Error(`loading standings failed: ${error.message}`);

  const shown = new Set<string>();
  const rows: StandingRow[] = [];
  for (const m of optedIn ?? []) {
    const name = m.profiles?.display_name;
    const p = progress.get(m.user_id);
    if (!name || !p) continue;
    shown.add(m.user_id);
    rows.push({
      userId: m.user_id,
      name,
      percent: Math.floor((p.acceptedMeters / pact.goal_meters) * 100),
      meters: Math.min(p.acceptedMeters, pact.goal_meters),
      cleared: p.cleared,
    });
  }
  rows.sort((a, b) => b.percent - a.percent);
  const hidden = funded.filter((id) => !shown.has(id)).map((id) => progress.get(id)!);
  return {
    rows,
    hiddenCleared: hidden.filter((p) => p.cleared).length,
    hiddenNotCleared: hidden.filter((p) => !p.cleared).length,
  };
}

/** Letters, numbers, spaces and . ' - only, 2 to 24 characters. */
export const DISPLAY_NAME = /^[\p{L}\p{N} .'-]{2,24}$/u;
