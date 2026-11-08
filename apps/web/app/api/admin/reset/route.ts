import { adminResetResponse, resetAppDatabase } from "@/lib/admin-reset";
import { createSupabaseAdmin } from "@/lib/supabase/server";

export const maxDuration = 60;

export async function POST(request: Request) {
  return adminResetResponse(request, {
    secret: process.env.ADMIN_RESET_SECRET,
    reset: keepAccounts => resetAppDatabase(createSupabaseAdmin(), keepAccounts),
  });
}
