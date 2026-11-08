import { Check } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GritLogo } from "@/components/brand/GritLogo";
import { DisconnectStrava } from "@/components/DisconnectStrava";
import { WalletLinker } from "@/components/WalletLinker";
import { RouteMap } from "@/components/ui/art";
import { buttonClass } from "@/components/ui/Button";
import { Card, Note, StepDots } from "@/components/ui/primitives";
import { createSupabaseServer, getUser } from "@/lib/supabase/server";

const STRAVA_STATUS: Record<string, { tone: "ok" | "warn"; text: string }> = {
  connected: { tone: "ok", text: "Strava connected." },
  denied: { tone: "warn", text: "Strava access wasn't granted. Connect again when you're ready." },
  missing_scope: {
    tone: "warn",
    text: "Grit needs to read all your activities, including private ones, to count your activities. Connect again and leave that box checked.",
  },
  athlete_taken: { tone: "warn", text: "That Strava account is already linked to another Grit account." },
  bad_state: { tone: "warn", text: "That Strava sign-in expired. Try connecting again." },
  error: { tone: "warn", text: "Something went wrong connecting Strava. Try again." },
};

const REASONS = [
  { title: "Only runs inside your pacts", body: "We read activities from the days you're in a pact." },
  {
    title: "Your activities stay private",
    body: "Others only see whether you cleared the goal, unless you choose to show your progress.",
  },
  { title: "You stay in control", body: "Disconnect Strava here any time, or remove Grit in your Strava settings." },
];

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ strava?: string }> }) {
  const user = await getUser();
  if (!user) redirect("/");

  const supabase = await createSupabaseServer();
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, strava_athlete_id, wallet_address")
    .eq("id", user.id)
    .single();
  const { strava } = await searchParams;
  const status = strava ? STRAVA_STATUS[strava] : undefined;
  const stravaConnected = !!profile?.strava_athlete_id;
  const walletLinked = !!profile?.wallet_address;
  const ready = stravaConnected && walletLinked;

  return (
    <main className="mx-auto w-full max-w-md">
      <div className="relative h-[300px] overflow-hidden">
        <RouteMap className="h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-canvas" />
        <div className="absolute left-5 top-6">
          <GritLogo size={34} color="#0E0F0E" arrowColor="#2F8F2A" />
        </div>
        <form action="/api/auth/signout" method="post" className="absolute right-4 top-5">
          <button className="rounded-full bg-canvas/80 px-4 py-2 text-sm font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oath">
            Sign out
          </button>
        </form>
      </div>

      <div className="relative -mt-6 flex flex-col gap-5 px-5 pb-10">
        <StepDots step={2} of={2} />
        <h1 className="text-[34px] font-extrabold leading-[1.1] tracking-tight">Connect Strava to log your activities</h1>
        <p className="text-lg text-muted">
          Record runs the way you already do. We check them automatically and count them toward your pacts.
        </p>
        <p className="text-sm text-muted">Signed in as {profile?.email ?? user.email}</p>

        <ul className="flex flex-col gap-4">
          {REASONS.map((r) => (
            <li key={r.title} className="flex items-start gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-oath text-oath-ink">
                <Check className="size-6" aria-hidden="true" />
              </span>
              <div>
                <p className="text-lg font-semibold">{r.title}</p>
                <p className="text-muted">{r.body}</p>
              </div>
            </li>
          ))}
        </ul>

        {status && <Note tone={status.tone}>{status.text}</Note>}

        <a href="/api/strava/connect" className={buttonClass({ variant: "strava" })}>
          {stravaConnected ? "Reconnect Strava" : "Connect Strava"}
        </a>
        {stravaConnected && (
          <>
            <p className="flex items-center justify-center gap-2 text-oath">
              <Check className="size-5" aria-hidden="true" /> Strava connected
            </p>
            <DisconnectStrava />
          </>
        )}

        <Card className="flex flex-col gap-2">
          <h2 className="text-xl font-bold">Set up your demo wallet</h2>
          <p className="text-muted">
            Your demo wallet is saved in this browser. It uses free Solana devnet funds for real test deposits and receives payouts
            back here. No wallet extension needed.
          </p>
          {walletLinked && <p className="font-mono text-xs text-muted">{profile?.wallet_address}</p>}
          <WalletLinker linked={profile?.wallet_address ?? null} userId={user.id} />
        </Card>

        <Link
          href="/explore"
          className={ready ? buttonClass({ variant: "light" }) : "py-2 text-center text-lg font-semibold text-muted hover:text-ink"}
        >
          {ready ? "Find a pact" : "Skip for now"}
        </Link>
      </div>
    </main>
  );
}
