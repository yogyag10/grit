import { Trophy } from "lucide-react";
import Link from "next/link";
import { GritLogo } from "@/components/brand/GritLogo";
import { AppShell } from "@/components/ui/AppShell";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { km, solShort, when } from "@/lib/format";
import { DEMO_PACT_ID, DEMO_PACT_TITLE, isRetiredSeedPact } from "@/lib/demo-pact";
import { outcomeSentence } from "@/lib/receipt";
import type { StoredPlan } from "@/lib/settlement";
import { createSupabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Public results: every settled public pact. Aggregates only, no names. */
export default async function ResultsPage() {
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("settlements")
    .select("pact_id, plan, status, created_at, pacts!inner (title, visibility, is_demo, goal_meters, stake_lamports, ends_at)")
    .eq("pacts.visibility", "public")
    .order("created_at", { ascending: false })
    .limit(50);

  const visible = (data ?? []).filter(s => !isRetiredSeedPact(s.pact_id));
  const ids = visible.map((s) => s.pact_id);
  const { data: payouts } = ids.length
    ? await admin.from("payouts").select("pact_id, kind, lamports, status").in("pact_id", ids).eq("status", "confirmed")
    : { data: [] };
  const paid = (pactId: string, kinds: string[]) =>
    (payouts ?? []).filter((p) => p.pact_id === pactId && kinds.includes(p.kind)).reduce((n, p) => n + Number(p.lamports), 0);

  return (
    <AppShell nav={false}>
      <div className="flex flex-col gap-5 px-4 pb-10 pt-6">
        <Link href="/" aria-label="Grit home" className="self-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oath">
          <GritLogo size={30} />
        </Link>
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">Results</h1>
          <p className="mt-1 text-muted">
            Every settled public pact, with its pool receipt. Grit keeps nothing: every deposit goes back out.
          </p>
        </div>

        {visible.length === 0 ? (
          <EmptyState icon={<Trophy className="size-8" />} text="No public pacts have settled yet." />
        ) : (
          <ul className="flex flex-col gap-3">
            {visible.map((s) => {
              const plan = s.plan as unknown as StoredPlan;
              const p = s.pacts;
              return (
                <li key={s.pact_id}>
                  <Link
                    href={`/pacts/${s.pact_id}/receipt`}
                    className="block rounded-[18px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oath"
                  >
                    <Card className="flex flex-col gap-2 p-5 transition hover:bg-line motion-reduce:transition-none">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xl font-bold">{s.pact_id === DEMO_PACT_ID ? DEMO_PACT_TITLE : p.title}</p>
                        {p.is_demo && <Badge tone="demo">Demo pact</Badge>}
                      </div>
                      <p className="text-sm text-muted">
                        {km(p.goal_meters, 0)} · {solShort(Number(p.stake_lamports))} deposit · ended {when(p.ends_at)}
                      </p>
                      <p>
                        {outcomeSentence({ outcome: plan.outcome, funded: plan.fundedIds.length, cleared: plan.qualifierIds.length })}
                      </p>
                      <p className="text-sm text-muted">
                        {solShort(paid(s.pact_id, ["payout"]))} paid out ·{" "}
                        {solShort(paid(s.pact_id, ["refund", "return_unfunded", "leave_refund"]))} refunded · 0 SOL fee
                        {s.status !== "done" && " · payouts in progress"}
                      </p>
                    </Card>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
