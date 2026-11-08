import type { SupabaseClient } from "@supabase/supabase-js";
import { UUID, type ChatMessage } from "./community";
import type { Database } from "./supabase/database.types";

type Admin = SupabaseClient<Database>;
export type Group = Database["public"]["Tables"]["groups"]["Row"];

/** "campus" is the chat for every verified student; anything else must be a group id. */
export function parseChannel(raw: unknown): { campus: true } | { campus: false; groupId: string } | null {
  if (raw === "campus") return { campus: true };
  return typeof raw === "string" && UUID.test(raw) ? { campus: false, groupId: raw } : null;
}

export async function loadGroup(admin: Admin, groupId: string): Promise<Group | null> {
  if (!UUID.test(groupId)) return null;
  const { data, error } = await admin.from("groups").select("*").eq("id", groupId).maybeSingle();
  if (error) throw new Error(`loading group failed: ${error.message}`);
  return data;
}

export async function isGroupMember(admin: Admin, groupId: string, userId: string): Promise<boolean> {
  const { data, error } = await admin
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`checking membership failed: ${error.message}`);
  return !!data;
}

export async function memberCounts(admin: Admin, groupIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (groupIds.length === 0) return counts;
  const { data, error } = await admin.from("group_members").select("group_id").in("group_id", groupIds);
  if (error) throw new Error(`counting members failed: ${error.message}`);
  for (const row of data ?? []) counts.set(row.group_id, (counts.get(row.group_id) ?? 0) + 1);
  return counts;
}

/** Recent messages, oldest first. With `after`, only messages newer than that id. */
export async function loadMessages(
  admin: Admin,
  channel: ReturnType<typeof parseChannel>,
  viewerId: string,
  after?: number,
): Promise<ChatMessage[]> {
  if (!channel) return [];
  let query = admin.from("messages").select("id, body, created_at, user_id, profiles (display_name)");
  query = channel.campus ? query.is("group_id", null) : query.eq("group_id", channel.groupId);
  const { data, error } =
    after !== undefined
      ? await query.gt("id", after).order("id", { ascending: true }).limit(100)
      : await query.order("id", { ascending: false }).limit(50);
  if (error) throw new Error(`loading messages failed: ${error.message}`);
  const rows = after !== undefined ? (data ?? []) : [...(data ?? [])].reverse();
  return rows.map((m) => ({
    id: m.id,
    name: m.profiles?.display_name ?? "Runner",
    body: m.body,
    createdAt: m.created_at,
    mine: m.user_id === viewerId,
  }));
}
