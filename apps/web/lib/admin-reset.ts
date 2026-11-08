import { timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { demoPactSeed, DEMO_PACT_ID } from "./demo-pact";
import type { Database, Json } from "./supabase/database.types";

class PartialResetError extends Error {
  constructor(public usersDeleted: number) {
    super("App data was reset, but account deletion did not finish. Retry the reset to finish.");
  }
}

/** The RPC clears app rows and recreates Demo atomically. Auth accounts use Supabase's admin API. */
export async function resetAppDatabase(admin: SupabaseClient<Database>, keepAccounts: boolean) {
  let usersDeleted = 0;
  let users: { id: string }[] = [];
  if (!keepAccounts) {
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 50 });
    if (error) throw new Error("Couldn't read sign-in accounts. Reset did not start.");
    users = data.users;
  }
  const { error } = await admin.rpc("reset_app_data", {
    p_demo: demoPactSeed() as Json,
    p_keep_accounts: keepAccounts,
  });
  if (error) {
    console.error("admin reset RPC failed", error.code);
    throw new Error(error.code === "PGRST202"
      ? "Apply migration 0003_admin_reset.sql before using reset."
      : "Database reset failed. Check the server logs before retrying.");
  }
  if (!keepAccounts) {
    while (users.length) {
      for (let i = 0; i < users.length; i += 5) {
        const results = await Promise.all(users.slice(i, i + 5).map(user => admin.auth.admin.deleteUser(user.id)));
        usersDeleted += results.filter(result => !result.error).length;
        if (results.some(result => result.error)) throw new PartialResetError(usersDeleted);
      }
      // Always read page 1: deleting users moves later accounts into the first page.
      const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 50 });
      if (error) throw new PartialResetError(usersDeleted);
      users = data.users;
    }
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
