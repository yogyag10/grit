import { NextResponse } from "next/server";
import { appUrl } from "@/lib/env";
import { createSupabaseServer } from "@/lib/supabase/server";
import { isUbcStudentEmail, normalizeEmail } from "@/lib/ubc";

/** Sends a one-time sign-in code (and link) to a @student.ubc.ca address. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = normalizeEmail(body.email);
  if (!isUbcStudentEmail(email)) {
    return NextResponse.json({ error: "Use your @student.ubc.ca email address." }, { status: 400 });
  }

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: `${appUrl()}/auth/callback` },
  });
  if (error) {
    const status = error.status === 429 ? 429 : 502;
    const message =
      status === 429 ? "Too many sign-in emails. Wait a minute and try again." : "Couldn't send the email. Try again.";
    console.error("signInWithOtp failed", error.status, error.code);
    return NextResponse.json({ error: message }, { status });
  }
  return NextResponse.json({ ok: true });
}
