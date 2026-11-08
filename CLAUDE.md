# MovePact: instructions for Claude Code

You are building MovePact for HackCamp 2026 (UBC, 24 hours, Nov 7 to 8, 2026). Operator: Yogya (human). Repo: https://github.com/silverslither/movepact

Devpost shows submission closing Nov 8, 2026, 12:15 p.m. MST. Confirm against organizer announcements. The final 4 hours are a feature freeze: fixes, rehearsal, README, video, Devpost only.

## Read first

- `context.md`: full background, user decisions, two independent reviews. Reference only.
- `AGENTS.proposed.md`: the team's draft rules. This file adopts them and resolves their open decisions. Where the two differ, this file wins.
- `packages/core/README.md`: tested logic package (from movepact-core.zip). Use it, don't rewrite it.

## Product

MovePact: Put your money where your movement is. Verified UBC students join a running pact, put in an equal commitment deposit (devnet SOL), and run toward a goal. People who reach the goal split the pool. Everyone succeeds or nobody does: everyone gets their deposit back. No platform fee.

Positioning for the pitch: apps like RunBet and StepBet prove people want this, but they keep 15 to 25% of the pot and rely on referees. MovePact takes 0%, checks runs automatically, keeps activity data private, and every deposit and payout is publicly verifiable on Solana.

Wording in the UI and pitch: "pact", "commitment deposit", "get your deposit back". Never "bet", "gamble", or "win money".

## Prize targets and the evidence each needs

| Target | Evidence |
| --- | --- |
| Overall | Working end-to-end demo, clear problem, real user research |
| Community Impact (our one superlative) | Opt in + impact statement built on real survey numbers |
| Best Use of Solana | Real devnet deposit and payout signatures, shown on Solana Explorer |
| Best Use of n8n | A real n8n execution that triggers settlement and posts a Discord summary |

## Decisions (defaults)

Confirm these with the operator in your first reply. If there's no answer, treat them as final.

| Decision | Default |
| --- | --- |
| Product pact | 20 km cumulative in 7 days, stake 0.1 devnet SOL (100_000_000 lamports) |
| Demo pacts | Same rules, goal 3 km, window covering this weekend, labelled "Demo" in the UI |
| Custody | One central devnet treasury keypair, server-only. UI says deposits are held in a MovePact devnet wallet. No escrow program |
| Funding cutoff | `funding_cutoff` per pact (product: = `starts_at`). Deposits confirmed after it are returned, never pooled |
| Activity rule | Activity must start and end inside `[starts_at, ends_at]` |
| Sync cutoff | `sync_cutoff` per pact (product: `ends_at` + 1 hour). Progress is frozen at this time |
| Settlement | Allowed only after `sync_cutoff`, once per pact, triggered by n8n |
| Remainder | Handled in `planSettlement` (1 lamport each to qualifiers in id order) |

## Stack and layout

Next.js (App Router) + TypeScript + Tailwind, Supabase Auth/Postgres, Strava OAuth/REST, Solana devnet (`@solana/web3.js` 1.x + wallet adapter), n8n Cloud, Vercel, pnpm workspaces. Pin exact versions.

```
apps/web/                 Next.js app (UI + server routes)
  lib/strava.ts           OAuth, token refresh, list activities, streams
  lib/solana.ts           connection, deposit verification, payouts
  lib/supabase/           server (service role) and browser clients
packages/core/            GPS checks, progress, settlement math (28 tests, keep green)
supabase/migrations/      schema + RLS
n8n/settlement.json       importable workflow
scripts/seed-demo.ts      creates demo pacts
scripts/make-treasury.ts  generates a throwaway devnet keypair
```

Wire core into the app: `"@movepact/core": "workspace:*"` and `transpilePackages: ["@movepact/core"]`.

## Data model (Supabase)

- `profiles`: id (= auth user), email (check constraint: ends with `@student.ubc.ca`), wallet_address unique, strava_athlete_id unique
- `strava_tokens`: user_id, access_token, refresh_token, expires_at, scope. RLS on with no client policies (service role only)
- `pacts`: id, title, is_demo, goal_meters, stake_lamports, starts_at, ends_at, funding_cutoff, sync_cutoff. Public read
- `memberships`: pact_id, user_id, joined_at, unique pair
- `deposits`: signature unique, pact_id, user_id, lamports, confirmed_at
- `activity_checks`: user_id, pact_id, strava_activity_id, verdict, reasons, accepted_meters, result jsonb, synced_at. Unique (pact_id, user_id, strava_activity_id)
- `sync_errors`: user_id, pact_id, kind, message, created_at
- `settlements`: pact_id primary key (one plan per pact), plan jsonb, status, created_at
- `payouts`: pact_id, participant_id, wallet, lamports, kind, status (pending | sending | sent | confirmed), signature, last_valid_block_height

RLS: users read only their own rows in memberships, deposits, activity_checks, sync_errors, payouts. All writes go through server routes with the service role. Add a test that user A can't read user B's `activity_checks` or `strava_tokens`.

## Server routes

- **Sign in**: Supabase email OTP. Reject non `@student.ubc.ca` addresses server-side before sending. Supabase's built-in email sender has a low rate limit; test early and ask the operator for custom SMTP if blocked.
- `GET /api/strava/connect`: redirect to `https://www.strava.com/oauth/authorize` with `scope=read,activity:read_all`, a CSRF state, `approval_prompt=auto`.
- `GET /api/strava/callback`: check state. Read the granted `scope` query param; if it lacks `activity:read_all`, show a permissions error (not a cheating result). Exchange the code at `https://www.strava.com/oauth/token`, store tokens server-only, save the athlete id (unique per account).
- `POST /api/wallet/link`: server issues a nonce, wallet signs it (`signMessage`), server verifies the ed25519 signature, stores the address (unique).
- `POST /api/pacts/[id]/join`: create membership.
- `POST /api/pacts/[id]/deposit { signature }`: `getParsedTransaction` (commitment confirmed). Require all of these:
  - the transaction succeeded
  - it contains a SystemProgram transfer from the member's linked wallet to the treasury for exactly `stake_lamports`
  - the signature hasn't been used before
  - `confirmed_at` comes from `blockTime`, never from the client
  - Never trust a client "success".
- `POST /api/pacts/[id]/sync`:
  - Refresh the token if it has expired.
  - List activities with after/before set to the pact window.
  - For each activity, fetch streams with `?keys=time,latlng,distance&key_by_type=true` and flatten each stream's `.data`.
  - Run `checkActivity`, then upsert into `activity_checks`.
  - Return private progress via `computeProgress(entries, sync_cutoff)`.
  - Strava 401/403/429/network failures go into `sync_errors` as retryable errors. Never call `checkActivity` with empty streams caused by an API failure.
- `POST /api/settlement/run`: requires `Authorization: Bearer $SETTLEMENT_API_SECRET`. For every pact where `now >= sync_cutoff`:
  - If no settlement exists, build inputs from the DB: frozen progress plus verified deposits with `confirmed_at`.
  - Run `planSettlement`.
  - Insert the `settlements` row and its `payouts` rows in one transaction. The primary key blocks a second plan.
  - Execute payouts (see the next section).
  - Return an aggregate only: outcome, counts, total lamports, signatures. No per-person fitness data.
  - Also resume any unfinished settlement.

## Payout idempotency (must hold under retries and concurrent n8n calls)

- Claim a row atomically: `UPDATE payouts SET status='sending' WHERE id=$1 AND status='pending' RETURNING *`.
- Build and sign the transfer, then save `signature` and `last_valid_block_height` with status `sent` before broadcasting.
- On retry, look up `sent` rows with `getSignatureStatuses`:
  - confirmed: mark the row `confirmed`
  - not found and the block height is past `last_valid_block_height`: safe to reset the row to `pending`
  - otherwise: wait

Unit-test this orchestration with a mocked RPC: a timeout followed by a retry must never pay twice.

## UI (mobile first)

- `/`: tagline, three-step "how it works", sign in.
- `/onboarding`: connect Strava, connect wallet (Phantom on devnet).
- `/pacts/[id]`:
  - rules, pool size and member count
  - join and deposit buttons
  - private progress bar
  - my activities, each with its verdict and `REASON_MESSAGES` text
  - a Sync button
  - Explorer links (`?cluster=devnet`) for my deposit and payout
  - Results state after settlement: outcome plus Explorer links.

## n8n workflow (`n8n/settlement.json`)

Manual Trigger + Schedule Trigger (every 15 min) → HTTP Request POST `{APP_URL}/api/settlement/run` with the Bearer secret → IF anything settled → Discord webhook message such as "Pact settled: 3 of 5 made it, 0.4 SOL paid out" plus Explorer links. n8n never receives fitness data. Give the operator import steps. Node parameters may need adjusting to their n8n version.

## Demo plan (everything real, replayable)

- Live pact: window open through judging. On stage: join, deposit, Explorer link, sync a real run, sync a real bus ride and show it rejected with `VEHICLE_SPEED`.
- Ended pacts A, B, C (rehearsal, judging, backup): created by `scripts/seed-demo.ts` with a window that has passed by judging time. Teammates make real devnet deposits into each tonight and sync real activities. Aim for mixed outcomes: two finish 3 km, one records a bus ride, one doesn't run. On stage: click the n8n Manual Trigger, payouts land, the Discord summary appears, show Explorer.
- Record a backup video of the full flow once it works.

## Real evidence (the pitch depends on it)

- GPS eval: in `packages/core`, run `pnpm fetch:strava` (or use GPX exports), have humans confirm the labels, then run `pnpm eval`. Put the resulting table on a slide. Never put generated activities in `data/real/`.
- Survey: humans ask about 20 students three questions:
  1. Did you set a fitness goal this term?
  2. Did you stick with it?
  3. Would you put $5 on yourself to stick with it?
- You may build a simple form. Never invent survey numbers.

## Privacy and honesty rules

- Strava data never goes to n8n, AI services, public views, Discord, or on-chain. Tokens stay server-only.
- Public devnet transfers can reveal who got paid. Don't promise more privacy than that.
- GPS checks are eligibility checks, not proof of cheating. Don't claim stronger verification. Known limits: slow cycling passes, and someone else carrying your phone passes.
- Label every fixture, mock and simulated integration. Never present a mock as live.
- Devnet only. No mainnet, no real funds.

## Out of scope (do not build)

Challenge editor, multiple sports or communities, social features, public profiles, moderation, review queues or appeals, Strava webhooks, ML fraud detection, custom tokens, Anchor escrow, mainnet, extra sponsor integrations, future roadmap features.

## Operator tasks

Send these in one batch in your first reply, each with:

- the dashboard URL
- the exact setting to change
- the env var names and where to put them
- how to verify it worked

Tasks:

- **Strava**: confirm someone has a Strava subscription (needed to create an API app). Create the app. Set the Authorization Callback Domain to the Vercel domain (localhost also works for development). Upgrade athlete capacity to 10 in API settings.
- **Supabase**: create the project, enable email OTP, and add keys to `.env.local` and Vercel.
- **Vercel**: link the repo and add env vars.
- **Solana**: you generate the treasury keypair with `scripts/make-treasury.ts`; the operator funds it at faucet.solana.com. Each teammate installs Phantom, switches to devnet and gets devnet SOL.
- **n8n Cloud**: create an account, import the workflow, and set the Bearer secret and Discord webhook.
- **Discord**: create a webhook in a team channel.

Env names for `.env.example`:

- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Strava: `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`
- App and Solana: `APP_URL`, `NEXT_PUBLIC_SOLANA_RPC_URL`, `NEXT_PUBLIC_TREASURY_ADDRESS`, `TREASURY_SECRET_KEY`
- n8n: `SETTLEMENT_API_SECRET`

Never ask for secrets in chat and never commit them.

## Build order

At the end of each phase: typecheck, run tests, commit, push.

0. pnpm workspace, `apps/web`, wire `packages/core`, `.env.example`, README run steps, deploy a skeleton to Vercel in the first hour. Send operator tasks immediately.
1. Migrations, RLS, UBC email OTP login, profiles. RLS test.
2. Strava connect, sync and private progress.
3. Wallet link and deposit verification.
4. Settlement endpoint, payouts, idempotency tests.
5. n8n workflow and Discord summary.
6. Seed script, demo pacts, results view, UI polish.
7. Freeze: README, video, Devpost (GitHub link, ≤4 min video, Community Impact opt-in and statement, Solana and n8n opt-ins with tx links and an n8n execution screenshot).

While you're blocked on an operator task, keep working with labelled fixtures. Keep handoffs short:

- what works live
- what's simulated
- what's blocked, and on whom
