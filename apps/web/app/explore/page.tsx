import { redirect } from "next/navigation";
import { AppShell, PageHeader } from "@/components/ui/AppShell";
import { km, solShort, when } from "@/lib/format";
import { pactLengthDays, pactStatus, sceneFor } from "@/lib/spots";
import type { StoredPlan } from "@/lib/settlement";
import { createSupabaseAdmin, createSupabaseServer, getUser } from "@/lib/supabase/server";
import { ExploreList, type ExploreCard } from "./ExploreList";

export const dynamic = "force-dynamic";

export default async function ExplorePage() {
  const user = await getUser();
  if (!user) redirect("/");

  // RLS decides what this member may see: public pacts plus invite pacts they joined.
  const supabase = await createSupabaseServer();
  const { data: pacts } = await supabase
    .from("pacts")
    .select("id, title, goal_meters, stake_lamports, starts_at, ends_at, funding_cutoff, is_demo, cancelled_at")
    .is("cancelled_at", null);
  const list = pacts ?? [];
  const ids = list.map((p) => p.id);

  // Counts only, from the server: members can't read each other's rows directly.
  const admin = createSupabaseAdmin();
  const [{ data: members }, { data: settlements }] = ids.length
    ? await Promise.all([
        admin.from("memberships").select("pact_id, user_id").in("pact_id", ids).is("left_at", null),
        admin.from("settlements").select("pact_id, plan").in("pact_id", ids),
      ])
    : [{ data: [] }, { data: [] }];
  const runners = new Map<string, number>();
  const mine = new Set<string>();
  for (const m of members ?? []) {
    runners.set(m.pact_id, (runners.get(m.pact_id) ?? 0) + 1);
    if (m.user_id === user.id) mine.add(m.pact_id);
  }
  const plans = new Map((settlements ?? []).map((s) => [s.pact_id, s.plan as unknown as StoredPlan]));

  const now = new Date();
  const cards: (ExploreCard & { sort: number })[] = list.map((p) => {
    const status = pactStatus(p, now);
    const count = runners.get(p.id) ?? 0;
    const plan = plans.get(p.id);
    const joinOpen = now.getTime() < Date.parse(p.funding_cutoff);
    const joined = mine.has(p.id);
    const lines = [
      `${km(p.goal_meters, 0)} in ${pactLengthDays(p)} days · ${solShort(Number(p.stake_lamports))} · ${
        status === "upcoming" ? `${count} joined so far` : `${count} ${count === 1 ? "runner" : "runners"}`
      }`,
    ];
    if (p.is_demo) lines.push("Demo pact");

    let card: Omit<ExploreCard, "id" | "title" | "scene" | "status" | "pill" | "lines" | "searchText">;
    let pill: string;
    if (status === "ended") {
      pill = "Ended";
      card = {
        footer: plan ? `${plan.qualifierIds.length} of ${plan.fundedIds.length} cleared · 0% fee` : "Settling soon",
        cta: { label: "View leaderboard", href: `/pacts/${p.id}/leaderboard`, variant: "light", lock: false },
      };
    } else if (status === "live") {
      pill = joined ? "● Live · you're in" : "● Live · view only";
      card = {
        footer: joinOpen ? `Joining open until ${when(p.funding_cutoff)}` : "In progress · joining closed",
        cta: joinOpen && !joined
          ? { label: `Join · ${solShort(Number(p.stake_lamports))}`, href: `/pacts/${p.id}`, variant: "primary", lock: false }
          : { label: "View", href: `/pacts/${p.id}`, variant: "secondary", lock: !joinOpen },
      };
    } else {
      pill = `Upcoming · starts ${when(p.starts_at)}`;
      card = {
        footer: joined ? "You've joined" : `Joining open until ${when(p.funding_cutoff)}`,
        cta: joined
          ? { label: "View", href: `/pacts/${p.id}`, variant: "secondary", lock: false }
          : { label: `Join · ${solShort(Number(p.stake_lamports))}`, href: `/pacts/${p.id}`, variant: "primary", lock: false },
      };
    }

    return {
      id: p.id,
      title: p.title,
      scene: sceneFor(p.id),
      status: status === "cancelled" ? "ended" : status,
      pill,
      lines,
      searchText: `${p.title} ${lines.join(" ")}`.toLowerCase(),
      ...card,
      sort: status === "ended" ? 1e15 - Date.parse(p.ends_at) : Date.parse(p.starts_at),
    };
  });
  cards.sort((a, b) => a.sort - b.sort);

  return (
    <AppShell>
      <PageHeader title="Explore pacts" />
      <ExploreList cards={cards.map(({ sort: _sort, ...c }) => c)} />
    </AppShell>
  );
}
