import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServer, getUser } from "@/lib/supabase/server";

const STRAVA_STATUS: Record<string, { tone: "ok" | "warn"; text: string }> = {
  connected: { tone: "ok", text: "Strava connected." },
  denied: { tone: "warn", text: "Strava access wasn't granted. Connect again when you're ready." },
  missing_scope: {
    tone: "warn",
    text: "MovePact needs to read all your activities, including private ones, to count your runs. Connect again and leave that box checked.",
  },
  athlete_taken: { tone: "warn", text: "That Strava account is already linked to another MovePact account." },
  bad_state: { tone: "warn", text: "That Strava sign-in expired. Try connecting again." },
  error: { tone: "warn", text: "Something went wrong connecting Strava. Try again." },
};

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ strava?: string }> }) {
  const user = await getUser();
  if (!user) redirect("/signin");

  const supabase = await createSupabaseServer();
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, strava_athlete_id, wallet_address")
    .eq("id", user.id)
    .single();
  const { strava } = await searchParams;
  const status = strava ? STRAVA_STATUS[strava] : undefined;
  const stravaConnected = !!profile?.strava_athlete_id;

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-12">
      <header className="flex items-center justify-between">
        <Link href="/" className="font-bold">
          MovePact
        </Link>
        <form action="/api/auth/signout" method="post">
          <button className="text-sm text-slate-600 underline">Sign out</button>
        </form>
      </header>

      <div>
        <h1 className="text-2xl font-bold">Get set up</h1>
        <p className="mt-1 text-sm text-slate-600">Signed in as {profile?.email ?? user.email}</p>
      </div>

      {status && (
        <p
          className={`rounded-lg p-3 text-sm ${status.tone === "ok" ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}
        >
          {status.text}
        </p>
      )}

      <ol className="flex flex-col gap-4">
        <li className="rounded-xl border border-slate-200 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium">1. Connect Strava</p>
              <p className="mt-1 text-sm text-slate-600">
                We read your runs to check them against the pact. Your distances, routes and activities stay private to
                you.
              </p>
            </div>
            {stravaConnected && <span className="shrink-0 text-sm font-medium text-emerald-700">Connected</span>}
          </div>
          <a
            href="/api/strava/connect"
            className="mt-3 inline-block rounded-lg bg-[#fc4c02] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            {stravaConnected ? "Reconnect Strava" : "Connect with Strava"}
          </a>
        </li>

        <li className="rounded-xl border border-slate-200 p-4">
          <p className="font-medium">2. Connect a Phantom wallet (devnet)</p>
          <p className="mt-1 text-sm text-slate-600">
            {profile?.wallet_address
              ? `Linked: ${profile.wallet_address.slice(0, 4)}…${profile.wallet_address.slice(-4)}`
              : "Wallet linking isn't built yet. It comes in the next step."}
          </p>
        </li>
      </ol>

      <Link href="/me" className="text-center text-sm font-medium text-emerald-800 underline">
        Go to my pacts
      </Link>
    </main>
  );
}
