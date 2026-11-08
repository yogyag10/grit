import { SolValue } from "@/components/ui/Money";
import { Check, Lock } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DepositButton } from "@/components/DepositButton";
import { DemoPledges } from "@/components/DemoPledges";
import { AppShell } from "@/components/ui/AppShell";
import { Scene } from "@/components/ui/art";
import { ButtonLink } from "@/components/ui/Button";
import { PactHero } from "@/components/ui/PactHero";
import { Badge, Card, ExplorerLink, Note, ProgressBar, StatTile } from "@/components/ui/primitives";
import { cadOf, km, shortDate, solCad, when } from "@/lib/format";
import { canView, loadMembership, loadMyProgress, loadPact } from "@/lib/pacts";
import { outcomeSentence } from "@/lib/receipt";
import type { StoredPlan } from "@/lib/settlement";
import { explorerAddress, explorerTx, treasuryAddress } from "@/lib/solana";
import { daysLeft, pactStatus, sceneFor } from "@/lib/spots";
import { loadStats } from "@/lib/standings";
import { createSupabaseAdmin, getUser } from "@/lib/supabase/server";
import { memberWindow, syncPhase } from "@/lib/sync";
import { InviteButton, JoinButton, StandingsOptIn, SyncButton } from "./PactActions";

export default async function PactPage({
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

  const { data: profile } = await admin
    .from("profiles")
    .select("strava_athlete_id, wallet_address, display_name")
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
      ? await admin
          .from("payouts")
          .select("kind, lamports, status, signature")
          .eq("pact_id", pact.id)
          .eq("participant_id", user.id)
          .maybeSingle()
      : { data: null };

  const now = new Date();
  const status = pactStatus(pact, now);
  const stake = Number(pact.stake_lamports);
  const joinOpen = !pact.cancelled_at && now.getTime() < Date.parse(pact.funding_cutoff);
  const window = membership ? memberWindow(pact, membership.joined_at) : null;
  const phase = window ? syncPhase(pact, window, now) : null;
  const progress = membership ? await loadMyProgress(admin, pact, user.id) : null;
  const stats = await loadStats(admin, pact);
  const codeQuery = code ? `?code=${encodeURIComponent(code)}` : "";
  const pactPath = `/pacts/${pact.id}${pact.visibility === "invite" && pact.invite_code ? `?code=${encodeURIComponent(pact.invite_code)}` : ""}`;

  const eyebrow =
    status === "live"
      ? `● Live · ${daysLeft(pact.ends_at, now)} days left`
      : status === "upcoming"
        ? `Starts ${when(pact.starts_at)}`
        : status === "cancelled"
          ? "Cancelled"
          : `Ended · ${shortDate(pact.starts_at)} – ${shortDate(pact.ends_at)}`;
  const eyebrowClass = status === "live" ? "text-oath" : status === "upcoming" ? "text-demo" : "text-ink";

  const shareExample = Math.max(1, Math.ceil(stats.funded / 2));

  return (
    <AppShell>
      <PactHero
        scene={sceneFor(pact.id, pact.title)}
        title={pact.title}
        eyebrow={eyebrow}
        eyebrowClass={eyebrowClass}
        backHref="/explore"
        sharePath={pactPath}
        demo={pact.is_demo}
      />
      <div className="flex flex-col gap-4 px-4 pt-3">
        <p className="text-muted">
          {shortDate(pact.starts_at)} – {shortDate(pact.ends_at)} · {solCad(stake)} deposit ·{" "}
          {pact.visibility === "invite" ? "Invite only" : "Public"}
        </p>
        {pact.cancelled_at && <Note tone="warn">This pact was cancelled.</Note>}
        <DemoPledges pact={pact} actualMembers={stats.members} />

        {plan && membership && (
          <ResultCard
            payoutKind={myPayout?.kind ?? null}
            payoutLamports={myPayout ? Number(myPayout.lamports) : null}
            payoutConfirmed={myPayout?.status === "confirmed"}
            payoutSignature={myPayout?.signature ?? null}
            stakeLamports={stake}
            km={progress ? km(progress.acceptedMeters) : ""}
            goal={km(pact.goal_meters, 0)}
            funded={plan.fundedIds.includes(user.id)}
            split={plan.outcome === "split"}
            summary={outcomeSentence({ outcome: plan.outcome, funded: plan.fundedIds.length, cleared: plan.qualifierIds.length })}
            receiptHref={`/pacts/${pact.id}/receipt${codeQuery}`}
          />
        )}

        {progress && !plan && (
          <Card aria-labelledby="progress" className="flex flex-col gap-3 p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 id="progress" className="text-muted">
                Your progress · only you see this
              </h2>
            </div>
            <p className="tabular-nums">
              <span className="text-[56px] font-extrabold leading-none">{(progress.acceptedMeters / 1000).toFixed(1)}</span>{" "}
              <span className="text-lg text-muted">
                of {(pact.goal_meters / 1000).toFixed(0)} km · {progress.percent}%
              </span>
            </p>
            <ProgressBar percent={progress.percent} label={`${progress.percent}% of your ${km(pact.goal_meters, 0)} goal`} />
            <p className="flex items-center gap-1.5 text-muted">
              {progress.cleared ? (
                <>
                  <Check className="size-4 text-oath" aria-hidden="true" /> <span className="text-oath">Goal reached</span>
                </>
              ) : (
                `${km(Math.max(0, pact.goal_meters - progress.acceptedMeters))} to go`
              )}
            </p>
            {window && (
              <p className="text-xs text-muted">
                Runs count from {when(window.startsAt)} to {when(window.endsAt)}.
              </p>
            )}
          </Card>
        )}

        <div className="grid grid-cols-3 gap-3">
          <StatTile label="Cleared" value={`${stats.cleared} of ${stats.funded}`} />
          <StatTile label="Pool" value={<SolValue lamports={stats.poolLamports} />} />
          <StatTile label="Fee" value="0%" accent />
        </div>

        <Card aria-labelledby="money" className="flex flex-col gap-3 p-5">
          <h2 id="money" className="text-xl font-bold">
            Where the money goes
          </h2>
          <div className="flex justify-between text-muted">
            <span>
              Pool ({stats.funded} × {solCad(stake)})
            </span>
            <span className="font-semibold text-ink tabular-nums">{solCad(stats.poolLamports)}</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>Grit fee</span>
            <span className="font-semibold text-ink tabular-nums">{solCad(0)}</span>
          </div>
          <hr className="border-line" />
          {stats.funded > 0 ? (
            <div className="flex justify-between gap-3 font-semibold">
              <span>
                If {shareExample} {shareExample === 1 ? "person clears" : "people clear"}, each gets
              </span>
              <span className="text-oath tabular-nums">{solCad(Math.floor(stats.poolLamports / shareExample))}</span>
            </div>
          ) : (
            <p className="font-semibold">The pool grows as members deposit.</p>
          )}
          <p className="text-sm text-muted">Nobody clears? Everyone gets their {solCad(stake)} back.</p>
        </Card>

        {!membership ? (
          joinOpen ? (
            <JoinButton pactId={pact.id} inviteCode={code ?? null} />
          ) : (
            <p className="flex items-center gap-2 text-muted">
              <Lock className="size-4" aria-hidden="true" /> Joining is closed for this pact.
            </p>
          )
        ) : (
          <>
            <Card aria-labelledby="deposit" className="flex flex-col gap-3 p-5">
              <h2 id="deposit" className="text-xl font-bold">
                Your deposit
              </h2>
              {deposit ? (
                <>
                  <p className="text-muted">
                    {Date.parse(deposit.confirmed_at) > Date.parse(pact.funding_cutoff) ? (
                      <>Received after the pact started, so it isn&apos;t in the pool. It goes back to your wallet when the pact settles.</>
                    ) : (
                      <>
                        <span className="font-semibold text-ink">{solCad(stake)}</span> confirmed on {when(deposit.confirmed_at)}.
                      </>
                    )}
                  </p>
                  <ExplorerLink href={explorerTx(deposit.signature)}>View on Solana Explorer</ExplorerLink>
                </>
              ) : membership.mode !== "staked" ? (
                <p className="text-muted">Practice entry: no deposit.</p>
              ) : !joinOpen ? (
                <p className="text-muted">No deposit was made before the pact started, so this entry isn&apos;t funded. You can still track your runs.</p>
              ) : !profile?.wallet_address ? (
                <Link href="/onboarding" className="font-semibold text-oath underline underline-offset-2">
                  Set up your demo wallet to make your deposit
                </Link>
              ) : (
                <>
                  <p className="text-muted">
                    Deposit {solCad(stake)} before {when(pact.funding_cutoff)}. It&apos;s held in a{" "}
                    <a href={explorerAddress(treasury)} target="_blank" rel="noreferrer" className="text-oath underline underline-offset-2">
                      Grit devnet wallet
                    </a>{" "}
                    until the pact settles.
                  </p>
                  <DepositButton
                    userId={user.id}
                    pactId={pact.id}
                    lamports={stake}
                    treasury={treasury}
                    linkedWallet={profile.wallet_address}
                    label={`Deposit ${solCad(stake)}`}
                  />
                </>
              )}
            </Card>

            <section aria-labelledby="runs" className="flex flex-col gap-3">
              <h2 id="runs" className="pt-2 text-xl font-bold">
                Your runs
              </h2>
              {progress && progress.activities.length === 0 ? (
                <p className="rounded-[18px] bg-card p-4 text-muted">No runs checked yet. Sync after your next run.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {progress?.activities.map((a) => {
                    const counted = a.verdict === "accepted" && a.counted;
                    return (
                      <li key={a.id} className="flex items-start gap-3.5 rounded-[18px] bg-card p-3.5">
                        <Scene kind={sceneFor(a.id, pact.title)} className="size-16 shrink-0 rounded-2xl" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold">
                              {a.name ?? "Run"}
                              {a.startDate ? ` · ${new Intl.DateTimeFormat("en-CA", { timeZone: "America/Vancouver", weekday: "short" }).format(new Date(a.startDate))}` : ""}
                            </p>
                            <Badge tone={counted ? "counted" : "missed"}>{counted ? "Counted" : "Not counted"}</Badge>
                          </div>
                          <p className="text-muted">
                            {counted ? `${km(a.acceptedMeters, 1)} counted` : a.startDate ? when(a.startDate) : ""}
                          </p>
                          {a.reasons.map((r) => (
                            <p key={r.code} className="text-sm text-muted">
                              {r.message}
                            </p>
                          ))}
                          {a.late && <p className="text-sm text-muted">Synced after the cutoff, so it doesn&apos;t count.</p>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="text-xs text-muted">These are automatic eligibility checks on GPS data, not a judgement about you.</p>
            </section>

            {!profile?.strava_athlete_id ? (
              <ButtonLink href="/onboarding" variant="strava">
                Connect Strava to start counting runs
              </ButtonLink>
            ) : phase === "open" ? (
              <div className="grid grid-cols-2 gap-3">
                <InviteButton path={pactPath} title={pact.title} />
                <SyncButton pactId={pact.id} />
              </div>
            ) : (
              <>
                <p className="text-muted">
                  {phase === "frozen" ? "Syncing has closed. Your progress is final." : "Syncing opens when the pact starts."}
                </p>
                <InviteButton path={pactPath} title={pact.title} />
              </>
            )}

            <Card aria-labelledby="standings" className="flex flex-col gap-3 p-5">
              <h2 id="standings" className="text-xl font-bold">
                Leaderboard
              </h2>
              <StandingsOptIn pactId={pact.id} initialShow={membership.show_in_standings} initialName={profile?.display_name ?? ""} />
              <Link href={`/pacts/${pact.id}/leaderboard${codeQuery}`} className="font-semibold text-oath underline underline-offset-2">
                View the leaderboard
              </Link>
            </Card>
          </>
        )}

        <Card aria-labelledby="rules" className="flex flex-col gap-2 p-5">
          <h2 id="rules" className="text-xl font-bold">
            The pact
          </h2>
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-muted">
            <li>
              Run <strong className="text-ink">{km(pact.goal_meters, 0)}</strong> in total between{" "}
              <strong className="text-ink">{when(pact.starts_at)}</strong> and <strong className="text-ink">{when(pact.ends_at)}</strong>{" "}
              (Vancouver time).
            </li>
            <li>
              Commitment deposit: <strong className="text-ink">{solCad(stake)}</strong> (devnet, no real funds).
            </li>
            <li>Only GPS-recorded outdoor runs from Strava count, and only runs you start after joining.</li>
            <li>Reach the goal and you get your full deposit back plus an equal share of deposits from members who don&apos;t.</li>
            <li>If nobody reaches the goal, everyone gets their deposit back. Grit takes no fee.</li>
            <li>Sync your runs by {when(pact.sync_cutoff)}. Progress is final after that.</li>
          </ul>
        </Card>

        {status === "ended" && (
          <ButtonLink href={`/pacts/${pact.id}/leaderboard${codeQuery}`} variant="light">
            View leaderboard
          </ButtonLink>
        )}
      </div>
    </AppShell>
  );
}

function ResultCard(props: {
  payoutKind: string | null;
  payoutLamports: number | null;
  payoutConfirmed: boolean;
  payoutSignature: string | null;
  stakeLamports: number;
  km: string;
  goal: string;
  funded: boolean;
  split: boolean;
  summary: string;
  receiptHref: string;
  }) {
  const cleared = props.payoutKind === "payout";
  const refunded = props.payoutKind === "refund" || props.payoutKind === "leave_refund" || props.payoutKind === "return_unfunded";
  return (
    <div className="flex flex-col gap-3">
      {cleared && props.payoutLamports !== null ? (
        <Card tone="oath" className="flex flex-col gap-3 p-6">
          <span className="flex size-[52px] items-center justify-center rounded-full bg-oath-ink text-oath">
            <Check className="size-7" aria-hidden="true" />
          </span>
          <h2 className="text-[40px] font-extrabold leading-none tracking-tight">That&apos;s grit.</h2>
          <p className="text-lg">
            {props.km} of {props.goal} cleared.
          </p>
          <hr className="border-oath-ink/20" />
          <p className="font-semibold">{props.payoutConfirmed ? "Sent to your wallet" : "Sending to your wallet"}</p>
          <p className="text-[44px] font-extrabold leading-none tabular-nums">+{solCad(props.payoutLamports)}</p>
          <p className="font-semibold">≈ {cadOf(props.payoutLamports)}</p>
          <p>
            {solCad(props.stakeLamports)} deposit back + {solCad(Math.max(0, props.payoutLamports - props.stakeLamports))} from the pool
          </p>
        </Card>
      ) : (
        <Card className="flex flex-col gap-2 p-5">
          <h2 className="text-2xl font-bold">
            {refunded ? "Your deposit is back" : props.funded && props.split ? "Not this time" : "Results are in"}
          </h2>
          <p className="text-muted">
            {refunded && props.payoutLamports !== null
              ? `${solCad(props.payoutLamports)} ${props.payoutConfirmed ? "was sent" : "is on its way"} to your wallet.`
              : props.funded && props.split
                ? `You covered ${props.km} of ${props.goal}. Your deposit went to the members who cleared the goal. Your next pact is a fresh start.`
                : props.summary}
          </p>
        </Card>
      )}
      <p className="text-muted">{props.summary}</p>
      {props.payoutConfirmed && props.payoutSignature && (
        <ExplorerLink href={explorerTx(props.payoutSignature)}>See your payout on Solana Explorer</ExplorerLink>
      )}
      <ButtonLink href={props.receiptHref} variant="secondary">
        View pool receipt
      </ButtonLink>
      <ButtonLink href="/explore" variant="light">
        Find your next pact
      </ButtonLink>
    </div>
  );
}
