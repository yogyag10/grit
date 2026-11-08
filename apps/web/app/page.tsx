import Link from "next/link";
import { GPS_RULES } from "@oathmile/core";
import { getUser } from "@/lib/supabase/server";

const STEPS = [
  {
    title: "Join a pact",
    body: "Verified UBC students put in an equal commitment deposit of devnet SOL.",
  },
  {
    title: "Run toward the goal",
    body: "Connect Strava. Your runs are checked automatically and your progress stays private.",
  },
  {
    title: "Split the pool or get your deposit back",
    body: "Everyone who reaches the goal splits the pool. If everyone or no one makes it, everyone gets their deposit back. No platform fee.",
  },
];

export default async function Home() {
  const user = await getUser();
  const vehicleKmh = Math.round(GPS_RULES.vehicleSpeedMps * 3.6);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-10 px-4 py-12">
      <header className="flex flex-col gap-3">
        <h1 className="text-4xl font-bold tracking-tight">Oathmile</h1>
        <p className="text-lg text-slate-700">Put your money where your movement is.</p>
        <Link
          href={user ? "/me" : "/signin"}
          className="mt-2 self-start rounded-lg bg-emerald-700 px-5 py-2.5 font-medium text-white hover:bg-emerald-800"
        >
          {user ? "My pacts" : "Sign in with your UBC email"}
        </Link>
        <Link href="/results" className="text-sm text-slate-600 underline">
          See results from past pacts
        </Link>
      </header>

      <section aria-labelledby="how" className="flex flex-col gap-4">
        <h2 id="how" className="text-xl font-semibold">
          How it works
        </h2>
        <ol className="flex flex-col gap-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="rounded-lg border border-slate-200 p-4">
              <p className="font-medium">
                {i + 1}. {step.title}
              </p>
              <p className="mt-1 text-slate-600">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <p className="text-sm text-slate-500">
        Devnet only, no real funds. Runs faster than about {vehicleKmh} km/h for a sustained minute are not counted.
        These are eligibility checks, not proof of anything.
      </p>
    </main>
  );
}
