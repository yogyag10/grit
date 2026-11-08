import { NextResponse } from "next/server";
import { appUrl } from "@/lib/env";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  return NextResponse.redirect(`${appUrl()}/`, { status: 303 });
}
