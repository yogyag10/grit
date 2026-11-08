import Link from "next/link";
import { km, sol, when } from "@/lib/format";
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

  const ids = (data ?? []).map((s) => s.pact_id);
  const { data: payouts } = ids.length
    ? await admin.from("payouts").select("pact_id, kind, lamports, status").in("pact_id", ids).eq("status", "confirmed")
    : { data: [] };
  const paid = (pactId: string, kinds: string[]) =>
    (payouts ?? []).filter((p) => p.pact_id === pactId && kinds.includes(p.kind)).reduce((n, p) => n + Number(p.lamports), 0);

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-10">
      <header className="flex items-center justify-between">
        <Link href="/" className="font-bold">
          Oathmile
        </Link>
      </header>
      <div>
        <h1 className="text-2xl font-bold">Results</h1>
        <p className="mt-1 text-slate-600">
          Every settled public pact, with its pool receipt. Oathmile keeps nothing: every deposit goes back out.
        </p>
      </div>

      {(data ?? []).length === 0 ? (
        <p className="text-slate-600">No public pacts have settled yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {(data ?? []).map((s) => {
            const plan = s.plan as unknown as StoredPlan;
            const p = s.pacts;
            return (
              <li key={s.pact_id}>
                <Link
                  href={`/pacts/${s.pact_id}/receipt`}
                  className="block rounded-xl border border-slate-200 p-4 hover:border-emerald-600"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{p.title}</p>
                    {p.is_demo && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-900">Demo</span>}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {km(p.goal_meters, 0)} · {sol(p.stake_lamports)} deposit · ended {when(p.ends_at)}
                  </p>
                  <p className="mt-2 text-sm text-slate-800">
                    {outcomeSentence({ outcome: plan.outcome, funded: plan.fundedIds.length, cleared: plan.qualifierIds.length })}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {sol(paid(s.pact_id, ["payout"]))} paid out · {sol(paid(s.pact_id, ["refund", "return_unfunded", "leave_refund"]))}{" "}
                    refunded · 0 SOL fee
                    {s.status !== "done" && " · payouts in progress"}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
