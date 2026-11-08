import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { SignInForm } from "./SignInForm";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getUser()) redirect("/onboarding");
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-12">
      <Link href="/" className="text-sm text-slate-600">
        ← Oathmile
      </Link>
      <h1 className="text-2xl font-bold">Sign in</h1>
      <p className="text-slate-600">Oathmile is for verified UBC students. We'll email a one-time code to your student address.</p>
      {error === "link" && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">That sign-in link expired. Request a new code.</p>
      )}
      <SignInForm />
    </main>
  );
}
