import type { SupabaseClient } from "@supabase/supabase-js";
import { buildProgressView, type ProgressView } from "./sync";
import type { Database } from "./supabase/database.types";
import { DEMO_PACT_ID, DEMO_PACT_TITLE } from "./demo-pact";
import { demoMemberMeters } from "./demo-pledges";

type Admin = SupabaseClient<Database>;
export type Pact = Database["public"]["Tables"]["pacts"]["Row"];
export type Membership = Database["public"]["Tables"]["memberships"]["Row"];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function loadPact(admin: Admin, pactId: string): Promise<Pact | null> {
  if (!UUID.test(pactId)) return null;
  const { data, error } = await admin.from("pacts").select("*").eq("id", pactId).maybeSingle();
  if (error) throw new Error(`loading pact failed: ${error.message}`);
  return data?.id === DEMO_PACT_ID ? { ...data, title: DEMO_PACT_TITLE } : data;
}

/** Active membership (not left), or null. */
export async function loadMembership(admin: Admin, pactId: string, userId: string): Promise<Membership | null> {
  const { data, error } = await admin
    .from("memberships")
    .select("*")
    .eq("pact_id", pactId)
    .eq("user_id", userId)
    .is("left_at", null)
    .maybeSingle();
  if (error) throw new Error(`loading membership failed: ${error.message}`);
  return data;
}

export async function loadMyProgress(admin: Admin, pact: Pact, userId: string): Promise<ProgressView> {
  const { data, error } = await admin
    .from("activity_checks")
    .select("result, synced_at")
    .eq("pact_id", pact.id)
    .eq("user_id", userId);
  if (error) throw new Error(`loading activity checks failed: ${error.message}`);
  return buildProgressView(data ?? [], pact);
}

/** Demo-only: fixed distances for the real members of a demo pact. Empty map for real pacts. */
export async function loadDemoMemberMeters(admin: Admin, pact: Pact): Promise<Map<string, number>> {
  if (!pact.is_demo) return new Map();
  const { data, error } = await admin
    .from("memberships")
    .select("user_id, joined_at")
    .eq("pact_id", pact.id)
    .eq("mode", "staked")
    .is("left_at", null);
  if (error) throw new Error(`loading members failed: ${error.message}`);
  return demoMemberMeters(pact, data ?? []);
}

/** Who may see a pact page: anyone signed in for public pacts; members or code holders for invite pacts. */
export function canView(pact: Pact, membership: Membership | null, inviteCode: string | null): boolean {
  return pact.visibility === "public" || membership !== null || (!!inviteCode && inviteCode === pact.invite_code);
}
