import { Flag } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell, PageHeader } from "@/components/ui/AppShell";
import { Scene } from "@/components/ui/art";
import { ButtonLink } from "@/components/ui/Button";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { km, solShort, when } from "@/lib/format";
import { DEMO_PACT_ID, isRetiredSeedPact } from "@/lib/demo-pact";
import { pactStatus, sceneFor } from "@/lib/spots";
import { createSupabaseServer, getUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MyPactsPage() {
  const user = await getUser();
  if (!user) redirect("/");

  // RLS: memberships and deposits are own-only; pacts are visible to their members.
  const supabase = await createSupabaseServer();
  const [{ data: rows }, { data: deposits }] = await Promise.all([
    supabase
      .from("memberships")
      .select("joined_at, mode, pacts (id, title, goal_meters, stake_lamports, starts_at, ends_at, funding_cutoff, is_demo, cancelled_at)")
      .is("left_at", null)
      .order("joined_at", { ascending: false }),
    supabase.from("deposits").select("pact_id"),
  ]);
  const deposited = new Set((deposits ?? []).map((d) => d.pact_id));
  const entries = (rows ?? []).flatMap(r => r.pacts && !isRetiredSeedPact(r.pacts.id)
    ? [{ pact: r.pacts.id === DEMO_PACT_ID ? { ...r.pacts, title: "Demo" } : r.pacts, mode: r.mode }] : []);
  const now = new Date();

  return (
    <AppShell>
      <PageHeader title="My pacts" />
      <div className="flex flex-col gap-3 px-4 pt-4">
        {entries.length === 0 ? (
          <EmptyState
            icon={<Flag className="size-8" />}
            text="You haven't joined a pact yet."
            action={
              <ButtonLink href="/explore" size="sm" full={false}>
                Find a pact
              </ButtonLink>
            }
          />
        ) : (
          entries.map(({ pact: p, mode }) => {
            const status = pactStatus(p, now);
            const needsDeposit = mode === "staked" && !deposited.has(p.id) && now.getTime() < Date.parse(p.funding_cutoff) && status !== "cancelled";
            return (
              <Link
                key={p.id}
                href={`/pacts/${p.id}`}
                className="flex items-center gap-3.5 rounded-[18px] bg-card p-3.5 transition hover:bg-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oath motion-reduce:transition-none"
              >
                <Scene kind={sceneFor(p.id)} className="size-16 shrink-0 rounded-2xl" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-semibold">{p.title}</p>
                  <p className="text-sm text-muted">
                    {km(p.goal_meters, 0)} · {solShort(Number(p.stake_lamports))} ·{" "}
                    {status === "live" ? `ends ${when(p.ends_at)}` : status === "upcoming" ? `starts ${when(p.starts_at)}` : status === "ended" ? "ended" : "cancelled"}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {needsDeposit && <Badge tone="demo">Deposit needed</Badge>}
                    {p.is_demo && <Badge tone="neutral">Demo pact</Badge>}
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </AppShell>
  );
}
