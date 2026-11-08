import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { km, sol, when } from "@/lib/format";
import { canView, loadMembership, loadMyProgress, loadPact } from "@/lib/pacts";
import { createSupabaseAdmin, getUser } from "@/lib/supabase/server";
import { memberWindow, syncPhase } from "@/lib/sync";
import { DepositButton } from "@/components/DepositButton";
import { outcomeSentence } from "@/lib/receipt";
import type { StoredPlan } from "@/lib/settlement";
import { explorerAddress, explorerTx, treasuryAddress } from "@/lib/solana";
import { JoinButton, SyncButton } from "./PactActions";

export default async function PactPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ code?: string }>;
}) {
  const user = await getUser();
  if (!user) redirect("/signin");
  const { id } = await params;
  const { code } = await searchParams;

  const admin = createSupabaseAdmin();
  const pact = await loadPact(admin, id);
  if (!pact) notFound();
  const membership = await loadMembership(admin, pact.id, user.id);
  if (!canView(pact, membership, code ?? null)) notFound();

  const { data: profile } = await admin.from("profiles").select("strava_athlete_id, wallet_address")
    .eq("id", user.id)
    .single();
  const { data: deposit } = membership
    ? await admin.from("deposits").select("signature, confirmed_at").eq("pact_id", pact.id).eq("user_id", user.id).maybeSingle()
    : { data: null };
  const treasury = treasuryAddress();
  const { data: settlement } = await admin.from("settlements").select("plan, status").eq("pact_id", pact.id).maybeSingle();
  const plan = (settlement?.plan ?? null) as StoredPlan | null;
  const { data: myPayout } =
    settlement && membership
      ? await admin.from("payouts").select("kind, lamports, status, signature").eq("pact_id", pact.id).eq("participant_id", user.id).maybeSingle()
      : { data: null };
  const PAYOUT_TEXT: Record<string, string> = {
    payout: "You reached the goal. Your deposit plus your share of the pool",
    refund: "Your deposit back",
    return_unfunded: "Your late deposit returned",
    leave_refund: "Your deposit back",
  };
  const now = new Date();
  const joinOpen = !pact.cancelled_at && now.getTime() < Date.parse(pact.funding_cutoff);
  const window = membership ? memberWindow(pact, membership.joined_at) : null;
  const phase = window ? syncPhase(pact, window, now) : null;
  const progress = membership ? await loadMyProgress(admin, pact, user.id) : null;

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-10">
      <header className="flex items-center justify-between">
        <Link href="/me" className="text-sm text-slate-600">
          ← My pacts
        </Link>
        {pact.is_demo && <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-900">Demo</span>}
      </header>

      <section>
        <h1 className="text-2xl font-bold">{pact.title}</h1>
        {pact.cancelled_at && <p className="mt-2 text-sm font-medium text-red-700">This pact was cancelled.</p>}
      </section>

      {plan && (
        <section aria-labelledby="results" className="flex flex-col gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <h2 id="results" className="font-semibold text-emerald-950">
            Results
          </h2>
          <p className="text-sm text-emerald-950">{outcomeSentence({ outcome: plan.outcome, funded: plan.fundedIds.length, cleared: plan.qualifierIds.length })}</p>
          {myPayout ? (
            <p className="text-sm text-emerald-950">
              {PAYOUT_TEXT[myPayout.kind] ?? "Your payout"}: <strong>{sol(myPayout.lamports)}</strong>
              {myPayout.status === "confirmed" && myPayout.signature ? (
                <>
                  {" · "}
                  <a href={explorerTx(myPayout.signature)} target="_blank" rel="noreferrer" className="underline">
                    sent to your wallet
                  </a>
                </>
              ) : (
                " · sending to your wallet"
              )}
            </p>
          ) : (
            plan.outcome === "split" && plan.fundedIds.includes(user.id) && <p className="text-sm text-emerald-950">You didn&apos;t reach the goal this time, so your deposit went to the members who did.</p>
          )}
          <Link href={`/pacts/${pact.id}/receipt${code ? `?code=${code}` : ""}`} className="text-sm font-medium text-emerald-900 underline">
            See the pool receipt
          </Link>
        </section>
      )}

      <section aria-labelledby="rules" className="rounded-xl border border-slate-200 p-4">
        <h2 id="rules" className="font-semibold">
          The pact
        </h2>
        <ul className="mt-2 flex flex-col gap-1.5 text-sm text-slate-700">
          <li>
            Run <strong>{km(pact.goal_meters, 0)}</strong> in total between <strong>{when(pact.starts_at)}</strong> and{" "}
            <strong>{when(pact.ends_at)}</strong> (Vancouver time).
          </li>
          <li>
            Commitment deposit: <strong>{sol(pact.stake_lamports)}</strong> (devnet, no real funds).
          </li>
          <li>Only GPS-recorded outdoor runs from Strava count, and only runs you start after joining.</li>
          <li>Reach the goal and you get your full deposit back plus an equal share of deposits from members who don't.</li>
          <li>If nobody reaches the goal, everyone gets their deposit back. Oathmile takes no fee.</li>
          <li>Sync your runs by {when(pact.sync_cutoff)}. Progress is final after that.</li>
        </ul>
      </section>

      {!membership ? (
        joinOpen ? (
          <JoinButton pactId={pact.id} inviteCode={code ?? null} />
        ) : (
          <p className="text-sm text-slate-600">Joining is closed for this pact.</p>
        )
      ) : (
        <>
          <section aria-labelledby="deposit" className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4">
            <h2 id="deposit" className="font-semibold">
              Your deposit
            </h2>
            {deposit ? (
              <>
                <p className="text-sm text-slate-700">
                  {Date.parse(deposit.confirmed_at) > Date.parse(pact.funding_cutoff) ? (
                    <>
                      Received after the pact started, so it isn&apos;t in the pool. It goes back to your wallet when the
                      pact settles.
                    </>
                  ) : (
                    <>
                      <strong>{sol(pact.stake_lamports)}</strong> confirmed on {when(deposit.confirmed_at)}.
                    </>
                  )}
                </p>
                <a href={explorerTx(deposit.signature)} target="_blank" rel="noreferrer" className="text-sm text-emerald-800 underline">
                  View on Solana Explorer
                </a>
              </>
            ) : membership.mode !== "staked" ? (
              <p className="text-sm text-slate-600">Practice entry: no deposit.</p>
            ) : !joinOpen ? (
              <p className="text-sm text-slate-600">
                No deposit was made before the pact started, so this entry isn&apos;t funded. You can still track your runs.
              </p>
            ) : !profile?.wallet_address ? (
              <Link href="/onboarding" className="text-sm font-medium text-emerald-800 underline">
                Link your Phantom wallet to make your deposit
              </Link>
            ) : (
              <>
                <p className="text-sm text-slate-600">
                  Deposit {sol(pact.stake_lamports)} before {when(pact.funding_cutoff)}. It&apos;s held in a{" "}
                  <a href={explorerAddress(treasury)} target="_blank" rel="noreferrer" className="underline">
                    Oathmile devnet wallet
                  </a>{" "}
                  until the pact settles.
                </p>
                <DepositButton
                  pactId={pact.id}
                  lamports={Number(pact.stake_lamports)}
                  treasury={treasury}
                  linkedWallet={profile.wallet_address}
                  label={`Deposit ${sol(pact.stake_lamports)}`}
                />
              </>
            )}
          </section>

          <section aria-labelledby="progress" className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4">
            <div className="flex items-baseline justify-between">
              <h2 id="progress" className="font-semibold">
                Your progress
              </h2>
              <span className="text-xs text-slate-500">Only you can see this</span>
            </div>
            {progress && (
              <>
                <div
                  className="h-3 overflow-hidden rounded-full bg-slate-100"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress.percent}
                >
                  <div className="h-full rounded-full bg-emerald-600" style={{ width: `${progress.percent}%` }} />
                </div>
                <p className="text-sm text-slate-700">
                  <strong>{km(progress.acceptedMeters)}</strong> of {km(progress.goalMeters, 0)}
                  {progress.cleared && <span className="ml-2 font-medium text-emerald-700">Goal reached</span>}
                </p>
              </>
            )}
            {window && (
              <p className="text-xs text-slate-500">
                Runs count from {when(window.startsAt)} to {when(window.endsAt)}.
              </p>
            )}
            {!profile?.strava_athlete_id ? (
              <Link href="/onboarding" className="text-sm font-medium text-emerald-800 underline">
                Connect Strava to start counting runs
              </Link>
            ) : phase === "open" ? (
              <SyncButton pactId={pact.id} />
            ) : (
              <p className="text-sm text-slate-600">
                {phase === "frozen" ? "Syncing has closed. Your progress is final." : "Syncing opens when the pact starts."}
              </p>
            )}
          </section>

          <section aria-labelledby="activities" className="flex flex-col gap-3">
            <h2 id="activities" className="font-semibold">
              Your activities
            </h2>
            {progress && progress.activities.length === 0 ? (
              <p className="text-sm text-slate-600">No activities checked yet. Sync after your next run.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {progress?.activities.map((a) => (
                  <li key={a.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{a.name ?? "Activity"}</p>
                        <p className="text-xs text-slate-500">
                          {a.startDate ? when(a.startDate) : ""}
                          {a.sportType ? ` · ${a.sportType}` : ""}
                        </p>
                      </div>
                      {a.verdict === "accepted" ? (
                        <span className="shrink-0 text-sm font-medium text-emerald-700">+{km(a.acceptedMeters, 2)}</span>
                      ) : (
                        <span className="shrink-0 text-sm font-medium text-slate-500">Not counted</span>
                      )}
                    </div>
                    {a.reasons.length > 0 && (
                      <ul className="mt-2 flex flex-col gap-1 text-sm text-slate-600">
                        {a.reasons.map((r) => (
                          <li key={r.code}>{r.message}</li>
                        ))}
                      </ul>
                    )}
                    {a.late && <p className="mt-2 text-sm text-slate-600">Synced after the cutoff, so it doesn't count.</p>}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-slate-500">
              These are automatic eligibility checks on GPS data, not a judgement about you.
            </p>
          </section>
        </>
      )}
    </main>
  );
}
