import { NextResponse, type NextRequest } from "next/server";
import { appUrl } from "@/lib/env";
import { createSupabaseServer } from "@/lib/supabase/server";

/** Magic-link landing: exchanges the PKCE code for a session, then continues to onboarding. */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const supabase = await createSupabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${appUrl()}/onboarding`);
  }
  return NextResponse.redirect(`${appUrl()}/signin?error=link`);
}
