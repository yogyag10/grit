import { timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { demoPactSeed, DEMO_PACT_ID } from "./demo-pact";
import type { Database } from "./supabase/database.types";

class PartialResetError extends Error {
  constructor(stage: string, public usersDeleted: number) {
    super(`Reset stopped while ${stage}. Some data may already be deleted. Retry the reset to finish.`);
  }
}

// Child tables precede their parents, so ordinary REST deletes satisfy the foreign keys.
const PACT_TABLES = [
  ["payouts", "id"], ["settlements", "pact_id"], ["activity_checks", "pact_id"],
  ["sync_errors", "id"], ["deposits", "signature"], ["memberships", "pact_id"], ["pacts", "id"],
] as const;
const COMMUNITY_TABLES = [["messages", "id"], ["group_members", "group_id"], ["groups", "id"]] as const;

/** Uses only existing Supabase table and Auth APIs; no reset-specific SQL or RPC is required. */
export async function resetAppDatabase(admin: SupabaseClient<Database>, keepAccounts: boolean) {
  let usersDeleted = 0;
  let users: { id: string }[] = [];
  if (!keepAccounts) {
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 50 });
    if (error) throw new Error("Couldn't read sign-in accounts. Reset did not start.");
    users = data.users;
  }
  const tables = keepAccounts ? PACT_TABLES : [
    ...COMMUNITY_TABLES, ...PACT_TABLES, ["strava_tokens", "user_id"], ["profiles", "id"],
  ] as const;
  let stage = "clearing app data";
  try {
    for (const [table, column] of tables) {
      stage = `clearing ${table}`;
      const { error } = await admin.from(table).delete().not(column, "is", null);
      if (error) throw error;
    }
    if (!keepAccounts) {
      stage = "deleting sign-in accounts";
      while (users.length) {
        for (let i = 0; i < users.length; i += 5) {
          const results = await Promise.all(users.slice(i, i + 5).map(user => admin.auth.admin.deleteUser(user.id)));
          usersDeleted += results.filter(result => !result.error).length;
          if (results.some(result => result.error)) throw new Error("Account deletion failed");
        }
        // Always read page 1: deleting users moves later accounts into the first page.
        const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 50 });
        if (error) throw error;
        users = data.users;
      }
    }
    stage = "creating Demo";
    const { error } = await admin.from("pacts").insert(demoPactSeed());
    if (error) throw error;
  } catch {
    console.error("admin reset failed while", stage);
    throw new PartialResetError(stage, usersDeleted);
  }
  return { ok: true, scope: keepAccounts ? "pact-data" : "app-data-and-accounts",
    usersDeleted, demoPactId: DEMO_PACT_ID, demoPath: `/pacts/${DEMO_PACT_ID}` };
}

/** Authorization is checked before constructing a database client or reading a request body. */
export async function adminResetResponse(request: Request, deps: {
  secret: string | undefined;
  reset: (keepAccounts: boolean) => Promise<unknown>;
}) {
  if (request.method !== "POST") return Response.json({ error: "Use POST." }, { status: 405, headers: { Allow: "POST" } });
  if (!deps.secret) return Response.json({ error: "Not found." }, { status: 404 });
  const expected = Buffer.from(`Bearer ${deps.secret}`);
  const supplied = Buffer.from(request.headers.get("authorization") ?? "");
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  let keepAccounts = false;
  try {
    const text = await request.text();
    const body = text ? JSON.parse(text) : {};
    if (!body || Array.isArray(body) || typeof body !== "object" ||
      (body.keepAccounts !== undefined && typeof body.keepAccounts !== "boolean")) throw new Error();
    keepAccounts = body.keepAccounts ?? false;
  } catch {
    return Response.json({ error: "Use an empty body or JSON with a boolean keepAccounts." }, { status: 400 });
  }
  try {
    return Response.json(await deps.reset(keepAccounts), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: (error as Error).message,
      ...(error instanceof PartialResetError ? { partial: true, usersDeleted: error.usersDeleted } : {}) },
    { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
