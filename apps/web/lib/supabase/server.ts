import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { env, SUPABASE_ANON_KEY, SUPABASE_URL } from "../env";
import type { Database } from "./database.types";

/** Per-request client acting as the signed-in user (RLS applies). */
export async function createSupabaseServer() {
  const store = await cookies();
  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Called from a Server Component, where cookies are read-only. proxy.ts refreshes the session.
        }
      },
    },
  });
}

/** Service-role client. Server only: bypasses RLS. Never import from a client component. */
export function createSupabaseAdmin() {
  return createClient<Database>(SUPABASE_URL, env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** The verified signed-in user, or null. Uses getUser(), which checks the JWT with Supabase Auth. */
export async function getUser() {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.auth.getUser();
  return data.user;
}
