import Link from "next/link";
import { redirect } from "next/navigation";
import { GritLogo } from "@/components/brand/GritLogo";
import { Scene } from "@/components/ui/art";
import { StepDots } from "@/components/ui/primitives";
import { getUser } from "@/lib/supabase/server";
import { SignInForm } from "./signin/SignInForm";

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getUser()) redirect("/explore");
  const { error } = await searchParams;

  return (
    <main className="mx-auto w-full max-w-md">
      <div className="relative h-[380px] overflow-hidden">
        <Scene kind="beach" className="h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-canvas/30 to-canvas" />
        <div className="absolute left-5 top-6">
          <GritLogo size={34} />
        </div>
      </div>

      <div className="relative -mt-16 flex flex-col gap-5 px-5 pb-10">
        <StepDots step={1} of={2} />
        <h1 className="text-[40px] font-extrabold leading-[1.05] tracking-tight">Put your money where your movement is.</h1>
        <p className="text-lg text-muted">
          Make a running pact with UBC friends. Clear the distance, get your deposit back plus a share of the pool. 0% fee.
        </p>
        {error === "link" && (
          <p role="alert" className="rounded-2xl bg-demo-soft p-3 text-sm text-demo">
            That sign-in link expired. Request a new code.
          </p>
        )}
        <SignInForm />
        <p className="text-center text-sm text-muted">Only @student.ubc.ca addresses can join.</p>
        <Link href="/results" className="text-center text-sm text-muted underline underline-offset-2 hover:text-ink">
          See results from past pacts
        </Link>
      </div>
    </main>
  );
}
