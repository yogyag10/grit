import Link from "next/link";
import { notFound } from "next/navigation";
import { km, sol, when } from "@/lib/format";
import { loadMembership, loadPact } from "@/lib/pacts";
import { buildReceipt, canViewReceipt, outcomeSentence, type ReceiptLine } from "@/lib/receipt";
import { explorerAddress, treasuryAddress } from "@/lib/solana";
import { createSupabaseAdmin, getUser } from "@/lib/supabase/server";

const KIND_LABEL: Record<string, string> = {
  deposit: "Deposit",
  late_deposit: "Late deposit (not pooled)",
  payout: "Payout",
  refund: "Refund",
  return_unfunded: "Returned",
  leave_refund: "Left before start",
};

function Lines({ lines, empty }: { lines: ReceiptLine[]; empty: string }) {
  if (lines.length === 0) return <p className="text-sm text-slate-500">{empty}</p>;
  return (
    <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
      {lines.map((l, i) => (
        <li key={`${l.signature ?? i}`} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
          <div className="min-w-0">
            <p className="font-mono text-slate-800">{l.wallet}</p>
            <p className="text-xs text-slate-500">
              {KIND_LABEL[l.kind] ?? l.kind}
              {l.status !== "confirmed" ? ` · ${l.status}` : ""}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-medium">{sol(l.lamports)}</p>
            {l.explorer ? (
              <a href={l.explorer} target="_blank" rel="noreferrer" className="text-xs text-emerald-800 underline">
                Explorer
              </a>
            ) : (
              <span className="text-xs text-slate-400">pending</span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function ReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ code?: string }>;
}) {
  const { id } = await params;
  const { code } = await searchParams;
  const admin = createSupabaseAdmin();
  const pact = await loadPact(admin, id);
  if (!pact) notFound();
  const user = await getUser();
  const isMember = user ? !!(await loadMembership(admin, pact.id, user.id)) : false;
  if (!canViewReceipt(pact, isMember, code ?? null)) notFound();

  const r = await buildReceipt(admin, pact);
  const t = r.totals;
  const treasury = treasuryAddress();

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-10">
      <header className="flex items-center justify-between">
        <Link href="/results" className="text-sm text-slate-600">
          ← Results
        </Link>
        {r.isDemo && <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-900">Demo</span>}
      </header>

      <section>
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Pool receipt</p>
        <h1 className="text-2xl font-bold">{r.title}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {km(r.goalMeters, 0)} goal · {sol(r.stakeLamports)} deposit · ended {when(r.endsAt)}
        </p>
        <p className="mt-3 text-slate-800">{outcomeSentence(r)}</p>
      </section>

      <section aria-label="Totals" className="grid grid-cols-2 gap-3">
        {[
          ["Pool", sol(t.poolLamports)],
          ["MovePact fee", "0 SOL"],
          ["Paid out", sol(t.paidOutLamports)],
          ["Refunded", sol(t.refundedLamports)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-200 p-3">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="text-lg font-semibold">{value}</p>
          </div>
        ))}
      </section>

      <p
        className={`rounded-xl p-3 text-sm ${r.balanced ? "bg-emerald-50 text-emerald-900" : "bg-slate-50 text-slate-700"}`}
      >
        {r.balanced
          ? `Every deposit is accounted for: ${sol(t.depositedLamports)} in, ${sol(t.paidOutLamports + t.refundedLamports)} out, nothing kept.`
          : r.settled
            ? `Payouts in progress: ${sol(t.outstandingLamports)} still to send.`
            : `${sol(t.depositedLamports)} held in the MovePact devnet wallet until the pact settles.`}
      </p>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">Deposits</h2>
        <Lines lines={r.deposits} empty="No deposits yet." />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">Payouts</h2>
        <Lines lines={r.payouts} empty={r.settled ? "Nothing to pay out." : "Payouts are sent when the pact settles."} />
      </section>

      <p className="text-xs text-slate-500">
        Devnet only, no real funds. Wallets are shortened and no names are shown, but transfers on Solana are public, so
        anyone can see which wallets were paid. Treasury:{" "}
        <a href={explorerAddress(treasury)} target="_blank" rel="noreferrer" className="underline">
          {treasury.slice(0, 4)}…{treasury.slice(-4)}
        </a>
      </p>
    </main>
  );
}
