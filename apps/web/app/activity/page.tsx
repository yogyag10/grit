import { Check, TrendingUp } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell, PageHeader } from "@/components/ui/AppShell";
import { Scene } from "@/components/ui/art";
import { ButtonLink } from "@/components/ui/Button";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { km, shortDate, solCad, weekday } from "@/lib/format";
import { sceneFor } from "@/lib/spots";
import { weeklyRuns, weeklyStreak } from "@/lib/streak";
import { DEMO_PACT_ID } from "@/lib/demo-pact";
import { demoActivityFor, demoMemberIndex } from "@/lib/demo-activity";
import { createSupabaseAdmin, createSupabaseServer, getUser } from "@/lib/supabase/server";
import { buildProgressView, type ActivityView } from "@/lib/sync";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const user = await getUser();
  if (!user) redirect("/");

  // RLS: activity checks and payouts are own-only, so everything below is this member's data.
  const supabase = await createSupabaseServer();
  const [{ data: checks }, { data: payouts }] = await Promise.all([
    supabase.from("activity_checks").select("pact_id, result, synced_at"),
    supabase.from("payouts").select("pact_id, kind, lamports, status"),
  ]);
  const ids = [...new Set([...(checks ?? []).map((c) => c.pact_id), ...(payouts ?? []).map((p) => p.pact_id)])];
  const { data: pacts } = ids.length
    ? await supabase.from("pacts").select("id, title, goal_meters, stake_lamports, sync_cutoff").in("id", ids)
    : { data: [] };

  const counted = new Map<string, number>(); // activity id -> counted meters, so one run never counts twice
  const countedDates = new Map<string, string>(); // activity id -> start date, for the weekly streak
  const recent: (ActivityView & { pact: string })[] = [];
  const cleared = new Set<string>();
  for (const p of pacts ?? []) {
    const view = buildProgressView((checks ?? []).filter((c) => c.pact_id === p.id), p);
    if (view.cleared) cleared.add(p.id);
    for (const a of view.activities) {
      recent.push({ ...a, pact: p.title });
      if (a.counted && a.verdict === "accepted") {
        counted.set(a.id, Math.max(counted.get(a.id) ?? 0, a.acceptedMeters));
        if (a.startDate) countedDates.set(a.id, a.startDate);
      }
    }
  }

  const settledPacts = [...new Set((payouts ?? []).map((p) => p.pact_id))];
  const kept = settledPacts.filter((id) => cleared.has(id)).length;
  const stakeOf = new Map((pacts ?? []).map((p) => [p.id, Number(p.stake_lamports)]));
  const earned = (payouts ?? [])
    .filter((p) => p.kind === "payout" && p.status === "confirmed")
    .reduce((sum, p) => sum + Math.max(0, Number(p.lamports) - (stakeOf.get(p.pact_id) ?? 0)), 0);
  // Members of the demo pact see a fixed Activity page for the demo video (labelled below).
  const { data: demoMembers } = await createSupabaseAdmin()
    .from("memberships")
    .select("user_id, joined_at")
    .eq("pact_id", DEMO_PACT_ID)
    .eq("mode", "staked")
    .is("left_at", null);
  const demoIndex = demoMemberIndex(demoMembers ?? [], user.id);
  const demo = demoIndex >= 0 ? demoActivityFor(demoIndex) : null;

  const shownRecent = demo ? demo.recent : recent;
  shownRecent.sort((a, b) => b.startDate.localeCompare(a.startDate));

  const runDates = demo ? demo.runDates : [...countedDates.values()];
  const weeks = weeklyRuns(runDates);
  const streak = weeklyStreak(runDates);
  const totalMeters = demo ? demo.countedMeters : [...counted.values()].reduce((a, b) => a + b, 0);

  return (
    <AppShell>
      <PageHeader title="Your activity" />
      {demo && (
        <div className="px-4 pt-3">
          <Badge tone="demo">Demo data</Badge>
        </div>
      )}
      <div className="flex flex-col gap-4 px-4 pt-4">
        <div className="grid grid-cols-2 gap-3">
          <Card className="flex flex-col gap-2 p-5">
            <p className="text-lg font-semibold">All pacts</p>
            <div className="flex gap-4 tabular-nums">
              <div>
                <p className="text-3xl font-extrabold leading-none">{demo ? demo.countedRuns : counted.size}</p>
                <p className="text-sm text-muted">Runs</p>
              </div>
              <div>
                <p className="text-3xl font-extrabold leading-none">{Math.round(totalMeters / 1000)} km</p>
                <p className="text-sm text-muted">Counted</p>
              </div>
            </div>
          </Card>
          <Card className="flex flex-col gap-2 p-5">
            <p className="text-lg font-semibold">Pacts kept</p>
            <p className="text-3xl font-extrabold leading-none tabular-nums">
              {demo ? demo.kept : kept} of {demo ? demo.total : settledPacts.length}
            </p>
            <p className="text-sm text-muted">+{solCad(earned)} earned (devnet)</p>
          </Card>
        </div>

        <Card className="flex flex-col gap-4 p-5">
          <div className="flex items-center gap-2.5">
            <p className="text-lg font-semibold">Weekly streak</p>
            <p className="font-extrabold text-oath tabular-nums">
              {streak} {streak === 1 ? "week" : "weeks"}
            </p>
          </div>
          <ol className="flex justify-between" aria-label="Counted runs in each of the last five weeks">
            {weeks.map((w) => (
              <li key={w.start} className="flex flex-col items-center gap-1.5">
                <span
                  className={`flex size-[38px] items-center justify-center rounded-xl text-xs font-bold ${
                    w.runs > 0 ? "bg-oath text-oath-ink" : w.current ? "border-2 border-ink" : "border border-[#383b38]"
                  }`}
                >
                  {w.runs > 0 ? <Check className="size-[18px]" strokeWidth={3} aria-hidden="true" /> : null}
                </span>
                <span className={`text-xs ${w.current ? "text-ink" : "text-muted"}`}>{shortDate(new Date(w.start + 12 * 3_600_000).toISOString())}</span>
                <span className="sr-only">
                  {w.runs} counted {w.runs === 1 ? "run" : "runs"}
                  {w.current ? " this week" : ""}
                </span>
              </li>
            ))}
          </ol>
          <p className="text-sm text-muted">
            {weeks[weeks.length - 1].runs} counted {weeks[weeks.length - 1].runs === 1 ? "run" : "runs"} this week. A week counts when it has at least one counted run.
          </p>
        </Card>

        <h2 className="pt-2 text-xl font-bold">Recent activities</h2>
        {shownRecent.length === 0 ? (
          <EmptyState
            icon={<TrendingUp className="size-8" />}
            text="Nothing checked yet. Sync from a pact page after your next activity."
            action={
              <ButtonLink href="/pacts" size="sm" full={false}>
                Go to my pacts
              </ButtonLink>
            }
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {shownRecent.slice(0, 12).map((a, i) => {
              const ok = a.counted && a.verdict === "accepted";
              return (
                <li key={`${a.id}-${i}`} className="flex items-start gap-3.5 rounded-[18px] bg-card p-3.5">
                  <Scene kind={sceneFor(a.id, a.pact)} className="size-16 shrink-0 rounded-2xl" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold">
                        {a.name ?? "Run"}
                        {a.startDate ? ` · ${weekday(a.startDate)}` : ""}
                      </p>
                      <Badge tone={ok ? "counted" : "missed"}>{ok ? "Counted" : "Not counted"}</Badge>
                    </div>
                    <p className="text-muted">
                      {a.pact}
                      {ok ? ` · ${km(a.acceptedMeters, 1)}` : ""}
                    </p>
                    {a.reasons.map((r) => (
                      <p key={r.code} className="text-sm text-muted">
                        {r.message}
                      </p>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-xs text-muted">
          These are automatic eligibility checks on GPS data, not a judgement about you. See a pact page for details.{" "}
          <Link href="/pacts" className="underline underline-offset-2">
            My pacts
          </Link>
        </p>
      </div>
    </AppShell>
  );
}
