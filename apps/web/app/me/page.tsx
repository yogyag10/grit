import { Check } from "lucide-react";
import { redirect } from "next/navigation";
import { AppShell, PageHeader } from "@/components/ui/AppShell";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/primitives";
import { QUOTES } from "@/lib/quotes";
import { createSupabaseServer, getUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function Row({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="font-semibold">{label}</p>
        <p className="text-sm text-muted">{detail}</p>
      </div>
      <span className={`flex items-center gap-1 text-sm font-semibold ${ok ? "text-oath" : "text-demo"}`}>
        {ok && <Check className="size-4" aria-hidden="true" />}
        {ok ? "Connected" : "Not set up"}
      </span>
    </div>
  );
}

export default async function MePage() {
  const user = await getUser();
  if (!user) redirect("/");

  const supabase = await createSupabaseServer();
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, display_name, strava_athlete_id, wallet_address")
    .eq("id", user.id)
    .single();
  const wallet = profile?.wallet_address;

  return (
    <AppShell>
      <PageHeader title="Me" />
      <div className="flex flex-col gap-4 px-4 pt-4">
        <Card className="flex flex-col gap-1 p-5">
          <p className="text-sm text-muted">Signed in as</p>
          <p className="text-lg font-semibold">{profile?.email ?? user.email}</p>
          {profile?.display_name && <p className="text-sm text-muted">Leaderboard name: {profile.display_name}</p>}
        </Card>

        <Card className="flex flex-col gap-4 p-5">
          <Row label="Strava" ok={!!profile?.strava_athlete_id} detail="Used to check your runs against your pacts." />
          <hr className="border-line" />
          <Row
            label="Demo wallet"
            ok={!!wallet}
            detail={wallet ? `${wallet.slice(0, 4)}…${wallet.slice(-4)} · saved in this browser` : "Needed to deposit and get paid back."}
          />
          <p className="text-sm text-muted">Don&apos;t clear site data before a pact settles, or you can&apos;t reach your payout.</p>
          <ButtonLink href="/onboarding" variant="secondary" size="sm">
            Manage Strava and wallet
          </ButtonLink>
        </Card>

        <ButtonLink href="/pacts" variant="secondary">
          My pacts
        </ButtonLink>

        <Card className="flex flex-col gap-4 p-5">
          <h2 className="text-lg font-bold">Keep moving</h2>
          {QUOTES.map((q) => (
            <figure key={q.by} className="flex flex-col gap-1">
              <blockquote className="text-base text-ink">&ldquo;{q.text}&rdquo;</blockquote>
              <figcaption className="text-sm text-muted">
                {q.by}, {q.source}
              </figcaption>
            </figure>
          ))}
          <p className="text-xs text-muted">Spot photos are from Wikimedia Commons (CC BY and CC BY-SA). Credits are in the project repo.</p>
        </Card>

        <form action="/api/auth/signout" method="post">
          <Button variant="secondary">Sign out</Button>
        </form>
      </div>
    </AppShell>
  );
}
