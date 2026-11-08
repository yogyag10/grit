import { SolValue } from "@/components/ui/Money";
import { Check, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/ui/AppShell";
import { Badge, Card, ExplorerLink, StatTile } from "@/components/ui/primitives";
import { cadOf, km, solCad, solShort, when } from "@/lib/format";
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

function Row({ line }: { line: ReceiptLine }) {
  const out = line.kind !== "deposit" && line.kind !== "late_deposit";
  return (
    <tr className="border-t border-line">
      <td className={`py-3.5 pr-2 ${out ? "font-semibold text-oath" : ""}`}>
        {KIND_LABEL[line.kind] ?? line.kind}
        {line.status !== "confirmed" && <span className="block text-xs font-normal text-muted">{line.status}</span>}
      </td>
      <td className="py-3.5 pr-2 font-mono text-[15px]">
        {line.explorer ? (
          <a href={line.explorer} target="_blank" rel="noreferrer" className="text-oath underline underline-offset-2">
            {line.wallet}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : (
          <span>
            {line.wallet} <span className="text-xs text-muted">pending</span>
          </span>
        )}
      </td>
      <td className={`py-3.5 text-right tabular-nums ${out ? "font-semibold" : ""}`}>{solShort(line.lamports).replace(" SOL", "")}<span className="block text-xs font-normal text-muted">≈ {cadOf(line.lamports)}</span></td>
    </tr>
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
  const lines = [...r.deposits, ...r.payouts];

  return (
    <AppShell nav={false}>
      <div className="flex flex-col gap-4 px-4 pb-10 pt-4">
        <div className="flex items-center justify-between">
          <Link
            href="/results"
            aria-label="Back to results"
            className="flex size-11 items-center justify-center rounded-full bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oath"
          >
            <ChevronLeft className="size-6" aria-hidden="true" />
          </Link>
          {r.isDemo && <Badge tone="demo">Demo pact</Badge>}
        </div>

        <div>
          <p className="font-semibold text-oath">Public · anyone can check</p>
          <h1 className="text-[40px] font-extrabold leading-tight tracking-tight">Pool Receipt</h1>
          <p className="text-lg text-muted">
            {r.title} · every SOL in and out, on-chain
          </p>
          <p className="mt-1 text-sm text-muted">
            {km(r.goalMeters, 0)} goal · {solCad(r.stakeLamports)} deposit · ended {when(r.endsAt)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatTile label="Deposited" value={<SolValue lamports={t.depositedLamports} />} />
          <StatTile label="Paid out" value={<SolValue lamports={t.paidOutLamports} />} />
          <StatTile label="Fee" value={<SolValue lamports={0} />} accent />
          <StatTile label="Refunded" value={<SolValue lamports={t.refundedLamports} />} />
        </div>

        {r.balanced ? (
          <Card tone="soft" className="flex items-center gap-3 font-semibold text-oath">
            <Check className="size-6" aria-hidden="true" /> Payouts equal the pool
          </Card>
        ) : (
          <Card className="text-muted">
            {r.settled
              ? `Payouts in progress: ${solCad(t.outstandingLamports)} still to send.`
              : `${solCad(t.depositedLamports)} held in the Grit devnet wallet until the pact settles.`}
          </Card>
        )}
        <p className="text-muted">{outcomeSentence(r)}</p>

        <Card className="p-5">
          <h2 className="mb-2 text-2xl font-bold">Transactions</h2>
          {lines.length === 0 ? (
            <p className="text-muted">No transactions yet.</p>
          ) : (
            <table className="w-full text-left text-base">
              <thead className="text-muted">
                <tr>
                  <th scope="col" className="pb-2 pr-2 font-semibold">
                    Type
                  </th>
                  <th scope="col" className="pb-2 pr-2 font-semibold">
                    Wallet
                  </th>
                  <th scope="col" className="pb-2 text-right font-semibold">
                    SOL
                  </th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, i) => (
                  <Row key={`${l.signature ?? i}-${i}`} line={l} />
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <p className="text-sm text-muted">
          No names here. Wallet transfers are public on Solana, so anyone can verify this receipt. Devnet only, no real funds. Treasury:{" "}
          <ExplorerLink href={explorerAddress(treasury)}>
            {treasury.slice(0, 4)}…{treasury.slice(-4)}
          </ExplorerLink>
        </p>
      </div>
    </AppShell>
  );
}
