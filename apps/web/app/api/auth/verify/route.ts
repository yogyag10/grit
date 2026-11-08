import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { isUbcStudentEmail, normalizeEmail } from "@/lib/ubc";

/** Exchanges the emailed 6-digit code for a session cookie. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = normalizeEmail(body.email);
  const token = typeof body.token === "string" ? body.token.replace(/\s/g, "") : "";
  if (!isUbcStudentEmail(email) || !/^\d{6,10}$/.test(token)) {
    return NextResponse.json({ error: "Enter the code from your email." }, { status: 400 });
  }

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) {
    return NextResponse.json({ error: "That code didn't work. It may have expired." }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
