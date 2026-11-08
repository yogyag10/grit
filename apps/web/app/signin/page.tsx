import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";

/** Sign-in lives on the home page; this keeps old links and redirects working. */
export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getUser()) redirect("/onboarding");
  const { error } = await searchParams;
  redirect(error ? `/?error=${encodeURIComponent(error)}` : "/");
}
