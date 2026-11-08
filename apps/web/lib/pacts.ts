import type { SupabaseClient } from "@supabase/supabase-js";
import { buildProgressView, type ProgressView } from "./sync";
import type { Database } from "./supabase/database.types";

type Admin = SupabaseClient<Database>;
export type Pact = Database["public"]["Tables"]["pacts"]["Row"];
export type Membership = Database["public"]["Tables"]["memberships"]["Row"];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function loadPact(admin: Admin, pactId: string): Promise<Pact | null> {
  if (!UUID.test(pactId)) return null;
  const { data, error } = await admin.from("pacts").select("*").eq("id", pactId).maybeSingle();
  if (error) throw new Error(`loading pact failed: ${error.message}`);
  return data;
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

/** Who may see a pact page: anyone signed in for public pacts; members or code holders for invite pacts. */
export function canView(pact: Pact, membership: Membership | null, inviteCode: string | null): boolean {
  return pact.visibility === "public" || membership !== null || (!!inviteCode && inviteCode === pact.invite_code);
}
