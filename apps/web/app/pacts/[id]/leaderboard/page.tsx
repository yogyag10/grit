import { SolValue } from "@/components/ui/Money";
import { Check } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/ui/AppShell";
import { DemoPledges } from "@/components/DemoPledges";
import { ButtonLink } from "@/components/ui/Button";
import { PactHero } from "@/components/ui/PactHero";
import { Badge, Card, ProgressBar, StatTile } from "@/components/ui/primitives";
import { km, shortDate, solCad } from "@/lib/format";
import { canView, loadMembership, loadPact } from "@/lib/pacts";
import type { StoredPlan } from "@/lib/settlement";
import { initials, pactStatus, sceneFor } from "@/lib/spots";
import { loadStandings, loadStats } from "@/lib/standings";
import { createSupabaseAdmin, getUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ code?: string }>;
}) {
  const user = await getUser();
  if (!user) redirect("/");
  const { id } = await params;
  const { code } = await searchParams;
  const admin = createSupabaseAdmin();
  const pact = await loadPact(admin, id);
  if (!pact) notFound();
  const membership = await loadMembership(admin, pact.id, user.id);
  if (!canView(pact, membership, code ?? null)) notFound();

  const [stats, standings, { data: settlement }] = await Promise.all([
    loadStats(admin, pact),
    loadStandings(admin, pact),
    admin.from("settlements").select("plan").eq("pact_id", pact.id).maybeSingle(),
  ]);
  const plan = (settlement?.plan ?? null) as StoredPlan | null;
  const status = pactStatus(pact);
  const ended = status === "ended";
  const codeQuery = code ? `?code=${encodeURIComponent(code)}` : "";
  const hidden = standings.hiddenCleared + standings.hiddenNotCleared;

  return (
    <AppShell nav={false}>
      <PactHero
        scene={sceneFor(pact.id, pact.title)}
        title={pact.title}
        eyebrow={`${ended ? "Ended" : status === "live" ? "Live" : "Upcoming"} · ${shortDate(pact.starts_at)} – ${shortDate(pact.ends_at)}`}
        backHref={`/pacts/${pact.id}${codeQuery}`}
        sharePath={`/pacts/${pact.id}/leaderboard${codeQuery}`}
        demo={pact.is_demo}
        height={260}
      />
      <div className="flex flex-col gap-4 px-4 pb-10 pt-3">
        <DemoPledges pact={pact} actualMembers={stats.members} expanded />
        <div className="grid grid-cols-3 gap-3">
          <StatTile label="Cleared" value={`${stats.cleared} of ${stats.funded}`} />
          <StatTile label="Pool" value={<SolValue lamports={stats.poolLamports} />} />
          <StatTile label="Fee" value="0%" accent />
        </div>

        <div className="flex items-baseline justify-between gap-2 pt-1">
          <h2 className="text-[28px] font-bold tracking-tight">Leaderboard</h2>
          <span className="text-sm text-muted">% of the {km(pact.goal_meters, 0)} goal</span>
        </div>

        {standings.rows.length === 0 ? (
          <Card className="text-muted">No one has chosen to show their name yet.</Card>
        ) : (
          <ol className="flex flex-col gap-3">
            {standings.rows.map((row, i) => {
              const me = row.userId === user.id;
              return (
                <li
                  key={row.userId}
                  className={`flex items-center gap-3.5 rounded-[18px] bg-card p-3.5 ${me ? "ring-2 ring-oath" : ""}`}
                >
                  <span className="w-5 text-center font-semibold text-muted">{i + 1}</span>
                  <span
                    aria-hidden="true"
                    className="flex size-12 shrink-0 items-center justify-center rounded-full bg-line text-lg font-bold"
                  >
                    {initials(row.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-lg font-semibold">{me ? `${row.name} (you)` : row.name}</p>
                      {row.cleared ? <Badge tone="counted">Cleared</Badge> : <Badge tone="neutral">{ended ? "Not cleared" : "In progress"}</Badge>}
                    </div>
                    <div className="mt-1.5 flex items-center gap-3">
                      <ProgressBar percent={row.percent} label={`${row.name}: ${row.percent}% of the goal`} className="flex-1" />
                      <span className="w-12 text-right text-sm text-muted tabular-nums">{row.percent}%</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {hidden > 0 && (
          <Card className="flex flex-col gap-1 p-5">
            <p className="text-lg font-semibold">
              {standings.hiddenCleared} {standings.rows.length > 0 ? "more " : ""}cleared · {standings.hiddenNotCleared}{" "}
              {ended ? "didn't" : "haven't yet"}
            </p>
            <p className="text-muted">Only people who chose to show their name appear above. No routes or pace are ever shown.</p>
          </Card>
        )}

        {plan?.outcome === "split" && plan.qualifierIds.length > 0 && (
          <Card tone="soft" className="flex items-center justify-between gap-3 font-semibold text-oath">
            <span>Everyone who cleared got</span>
            <span className="flex items-center gap-1.5 text-2xl font-extrabold tabular-nums">
              <Check className="size-5" aria-hidden="true" />
              {solCad(Math.floor(plan.poolLamports / plan.qualifierIds.length))}
            </span>
          </Card>
        )}
        {plan && plan.outcome !== "split" && (
          <Card tone="soft" className="font-semibold text-oath">
            Everyone got their deposit back.
          </Card>
        )}

        <ButtonLink href={`/pacts/${pact.id}/receipt${codeQuery}`} variant="secondary">
          View Pool Receipt
        </ButtonLink>
      </div>
    </AppShell>
  );
}
