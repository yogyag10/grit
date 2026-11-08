# Oathmile: instructions for Claude Code (v2)

v2 replaces v1. What changed: the scope now matches the core feature set of Renno, an existing
running-stakes app, plus Oathmile's own differentiators, in strict priority tiers. Where this file
conflicts with v1, `AGENTS.proposed.md` or `context.md`, this file wins. The operator (Yogya) approved
these changes.

You are building **Oathmile** for HackCamp 2026 (UBC, 24 hours, Nov 7 to 8, 2026).
Repo: https://github.com/yogyag10/oathmile

Devpost shows submission closing **Nov 8, 2026, 12:15 p.m. MST**. Confirm against organizer
announcements. The **final 4 hours are a feature freeze**: fixes, rehearsal, README, video, Devpost only.

## Read first

1. `context.md`: background, decisions, reviewer findings. Reference only.
2. `AGENTS.proposed.md`: team rules on coordination, operator handoffs and honesty still apply. Its
   scope cuts are replaced by the tiers below.
3. `packages/core/README.md`: tested GPS checks, progress and settlement math. Use it, don't rewrite it.

## Renno is a reference for WHAT to build, never for HOW it looks or reads

Mechanics and features aren't ownable, but Renno's expression is. Use Oathmile's own name, visual design,
layouts and copy. Write our own pact rules in our own words.

**Never copy any of these from Renno:**
- screenshots, UI layouts or icons
- wording, App Store text, Official Rules or Terms
- branding or logo

Don't name Renno inside the app. Competitor comparisons belong in the pitch and Devpost only.

## Positioning (for pitch and Devpost; verify facts before quoting)

Renno (iOS, from Renno's own rules, version effective Nov 5, 2026) and RunBet already run this mechanic,
which proves demand. Where they differ from Oathmile:
- **Fee on failures:** Renno takes 15% of forfeited stakes, and keeps everything if nobody finishes.
- **Fee on everyone:** every entry pays a non-refundable processing fee.
- **Winnings:** paid as points that expire after 12 months of inactivity, then are forfeited.
- **Android:** paid races aren't offered there.
- **Currency:** charges are in USD.

**Oathmile has no house:**
- 0% fee
- full refunds if nobody finishes
- payouts straight to your wallet
- every transaction verifiable on Solana
- only verified UBC students can join

Renno's run verification (route recompute plus phone motion data, plus in-app review) is stronger than
ours. Never claim otherwise.

UI and pitch wording: "pact", "commitment deposit", "get your deposit back". Never "bet", "gamble",
or "win money".

## Prize targets and evidence

| Target | Evidence |
|---|---|
| Overall | Working end-to-end demo, clear problem, real user research |
| Community Impact (our one superlative) | Opt in + impact statement on real survey numbers |
| Best Use of Solana | Real devnet deposit/payout signatures + the public Pool Receipt page |
| Best Use of n8n | Real n8n execution that settles pacts; results appear on the public `/results` page |

## Feature scope in tiers

**Rule: finish P0 and rehearse the demo end to end before starting P1. P2 only if P1 is done with time
left. Nothing new in the final 4 hours.**

### P0: the working core (needed for any demo)

| Feature | Renno has it | Oathmile twist |
|---|---|---|
| Pact with total-distance goal, start/end dates, stake, all shown before joining | Yes | Devnet SOL, plain-language rules |
| Join with a commitment deposit | Yes | Deposit verified on-chain; Explorer link shown |
| Only verified runs inside the window count, and only runs started after you joined | Yes | Strava GPS checks from `packages/core`, private reason codes |
| Clear the goal: full deposit back + equal share of forfeits; rank never matters | Yes | **0% fee** |
| Nobody clears | Renno keeps it | **Everyone refunded** |
| Payouts | Points that expire | **Straight to your wallet** |
| UBC email gate | No | Verified `@student.ubc.ca` only |
| Settlement trigger | Automatic | n8n workflow; settled public pacts published on `/results` |

### P1: makes it feel like a real product (do after P0 works)

| Feature | Notes |
|---|---|
| **Explore** page | Lists public pacts in Live / Upcoming / Ended tabs, each with goal, dates, stake, members, pool |
| **Create a pact** (minimal) | Title, goal from presets (5, 10, 20, 42 km), start/end, stake from presets (0.05, 0.1, 0.25 devnet SOL), visibility public or invite-only (default invite-only). No other options |
| **Invite link** | `/join/[code]` for invite-only pacts. This is the community angle: pacts for a floor, club or friend group |
| **Standings, privacy-first** | Always show "X of N have cleared" and the pool. Members can **opt in** to show their display name and % of goal. Never show distances, routes or activities. Non-opted members show nothing individually |
| **Pool Receipt page** (public, per pact) | Every deposit and payout with truncated wallet, amount, Explorer link; totals for pool, fee ($0), paid out, refunded; a check that payouts equal the pool. No names. This is the Solana story |
| **"Where the money goes"** panel on each pact | Worked example with this pact's numbers: pool, 0% fee, what each person who clears gets |

### P2: only if P1 is done

| Feature | Notes |
|---|---|
| Practice entry | Join a pact with no deposit to try it. Not funded, so `planSettlement` already excludes it. Shown as "practice" |
| Leave before start | Refund the deposit through the payouts machinery (kind `leave_refund`). After start, leaving forfeits like missing the goal |
| Host cancels before start | All deposits refunded, pact marked cancelled |

### Deliberately NOT built (and why)

| Renno feature | Why we skip it |
|---|---|
| In-app GPS run tracking, Apple Watch, Apple Health import | Web app can't read HealthKit; Strava covers recording |
| Points wallet, cash-outs, cash-out fees | Payouts go straight to the wallet; that's a differentiator |
| Service fee, host bonus, paid subscription | No house |
| Human run review and appeals | Operator removed human review; reason codes instead |
| Friends lists, report/block | Invite links cover groups; no social moderation in 24 h |
| Repeating pacts, auto-rollover | Not needed for the demo |
| Leaderboard of distances | Privacy decision: progress stays private unless opted in, and only as % |

Also out of scope: multiple sports, Strava webhooks, ML fraud detection, custom tokens, Anchor escrow,
mainnet, extra sponsor integrations.

## Decisions (defaults; confirm in your first reply, then treat as final)

| Decision | Default |
|---|---|
| Official product pact | 20 km in 7 days, 0.1 devnet SOL |
| Demo pacts | Same rules, 3 km goal, labelled "Demo" |
| Custody | One central devnet treasury keypair, server-only. UI says deposits are held in an Oathmile devnet wallet |
| Funding cutoff | `funding_cutoff` = `starts_at` for hosted pacts. Late deposits are returned, never pooled |
| Counting window per member | From `max(starts_at, joined_at)` to `ends_at`. Pass this window to `checkActivity` |
| Sync cutoff | `ends_at` + 1 hour; progress frozen then |
| Settlement | After `sync_cutoff`, once per pact, triggered by n8n |
| Remainder | Handled by `planSettlement` |

## Stack and layout

Next.js (App Router) + TypeScript + Tailwind, Supabase Auth/Postgres, Strava OAuth/REST, Solana devnet
(`@solana/web3.js` 1.x + wallet adapter), n8n Cloud, Vercel, pnpm workspaces. Pin exact versions.

```
apps/web/                 Next.js app (UI + server routes)
  lib/strava.ts           OAuth, token refresh, list activities, streams
  lib/solana.ts           connection, deposit verification, payouts
  lib/supabase/           server (service role) and browser clients
packages/core/            GPS checks, progress, settlement (28 tests, keep green)
supabase/migrations/      schema + RLS
n8n/settlement.json       importable workflow
scripts/seed-demo.ts      creates official and demo pacts
scripts/make-treasury.ts  throwaway devnet keypair
```

Wire core: `"@oathmile/core": "workspace:*"` and `transpilePackages: ["@oathmile/core"]`.

## Data model (Supabase)

- `profiles`: `id` (= auth user), `email` (check: ends with `@student.ubc.ca`), `display_name`,
  `wallet_address` unique, `strava_athlete_id` unique
- `strava_tokens`: `user_id`, `access_token`, `refresh_token`, `expires_at`, `scope`. RLS on, no client
  policies
- `pacts`: `id`, `title`, `host_id` (null = official), `visibility` (`public` | `invite`),
  `invite_code` unique, `is_demo`, `goal_meters`, `stake_lamports`, `starts_at`, `ends_at`,
  `funding_cutoff`, `sync_cutoff`, `cancelled_at`. Public pacts readable by all signed-in users; invite
  pacts readable by members and by holders of the code (server route)
- `memberships`: `pact_id`, `user_id`, `joined_at`, `mode` (`staked` | `practice`), `left_at`,
  `show_in_standings` boolean default false. Unique pair
- `deposits`: `signature` unique, `pact_id`, `user_id`, `lamports`, `confirmed_at`
- `activity_checks`: `user_id`, `pact_id`, `strava_activity_id`, `verdict`, `reasons`, `accepted_meters`,
  `result` jsonb, `synced_at`. Unique (`pact_id`, `user_id`, `strava_activity_id`)
- `sync_errors`: `user_id`, `pact_id`, `kind`, `message`, `created_at`
- `settlements`: `pact_id` primary key, `plan` jsonb, `status`, `created_at`
- `payouts`: `pact_id`, `participant_id`, `wallet`, `lamports`, `kind` (`payout` | `refund` |
  `return_unfunded` | `leave_refund`), `status` (`pending` | `sending` | `sent` | `confirmed`),
  `signature`, `last_valid_block_height`

**Read access (RLS):**
- Users read only their own `memberships`, `deposits`, `activity_checks`, `sync_errors` and `payouts`.
- Public views (standings, Pool Receipt) are served by server routes that return aggregates or opted-in
  fields only.

Add a test that user A can't read user B's `activity_checks` or `strava_tokens`.

## Server routes

**Accounts and connections**

- **Sign in**: Supabase email OTP. Reject non `@student.ubc.ca` addresses server-side. Built-in email
  has a low rate limit; test early, ask the operator for custom SMTP if blocked.
- **`/api/strava/connect`**: redirect to `https://www.strava.com/oauth/authorize` with
  `scope=read,activity:read_all`, CSRF `state` and `approval_prompt=auto`.
- **`/api/strava/callback`**:
  1. Check `state` and the granted `scope`. A missing `activity:read_all` is a permissions error, not a
     cheating result.
  2. Exchange the code at `https://www.strava.com/oauth/token`.
  3. Store the tokens server-only.
- **`POST /api/wallet/link`**: nonce, `signMessage`, verify the ed25519 signature, store the address.

**Pacts**

- **`POST /api/pacts`** (P1): create a pact from presets only. Generate `invite_code` for invite pacts.
- **`GET /api/pacts/explore`** (P1): public pacts with aggregate counts.
- **`POST /api/pacts/[id]/join`**: `staked` or `practice` (P2). Invite pacts require the code.
- **`POST /api/pacts/[id]/deposit`** `{ signature }`: verify with `getParsedTransaction` (commitment
  `confirmed`). Require all of these:
  - the transaction succeeded
  - a SystemProgram transfer from the member's linked wallet to the treasury for exactly
    `stake_lamports`
  - the signature hasn't been used before
  - `confirmed_at` comes from `blockTime`

  Never trust a client "success".
- **`POST /api/pacts/[id]/sync`**:
  1. Refresh the token if it has expired.
  2. List activities in the member's counting window.
  3. Fetch streams with `?keys=time,latlng,distance&key_by_type=true` and flatten each stream's `.data`.
  4. Run `checkActivity` with the member window and upsert the result.
  5. Return private progress via `computeProgress(entries, sync_cutoff)`.

  Strava failures go into `sync_errors` as retryable. Never check empty streams caused by an API failure.
- **`GET /api/pacts/[id]/standings`** (P1): `{ cleared, members, poolLamports }` plus opted-in
  `{ display_name, percent }` only.
- **`GET /api/pacts/[id]/receipt`** (P1): all deposit and payout signatures, truncated wallets, amounts,
  totals, and the payouts-equal-pool check.

**Settlement**

- **`POST /api/settlement/run`** (`Authorization: Bearer $SETTLEMENT_API_SECRET`): for every pact past
  `sync_cutoff` with no settlement:
  1. Build inputs from frozen progress and verified deposits.
  2. Run `planSettlement`.
  3. Insert `settlements` and `payouts` rows in one transaction.
  4. Execute the payouts.
  5. Return an aggregate only.

  Also resume any unfinished settlement.

### Payout idempotency (must hold under retries and concurrent n8n calls)

1. Claim a row atomically: `UPDATE payouts SET status='sending' WHERE id=$1 AND status='pending' RETURNING *`.
2. Build and sign the transfer, then save `signature` and `last_valid_block_height` with status `sent`
   **before** broadcasting.
3. On retry, look up `sent` rows with `getSignatureStatuses`:
   - confirmed: mark the row `confirmed`
   - not found and the block height is past `last_valid_block_height`: reset the row to `pending`
   - otherwise: wait

Unit-test with a mocked RPC: a timeout followed by a retry must never pay twice.

## UI (mobile first, our own design)

**Core screens**

- `/`: tagline "Put your money where your movement is", three-step how-it-works, sign in.
- `/onboarding`: connect Strava, connect Phantom (devnet).

**Pacts**

- `/pacts/[id]`:
  - plain-language rules and the "Where the money goes" panel
  - join and deposit buttons
  - **private** progress bar
  - my activities, each with its verdict and `REASON_MESSAGES` text
  - a Sync button
  - standings (P1)
  - Explorer links for my deposit and payout
  - a results state after settlement
- `/pacts/[id]/receipt` (P1): the public Pool Receipt.
- `/explore` (P1), `/pacts/new` (P1), `/join/[code]` (P1), `/me`: my pacts.

## n8n workflow (`n8n/settlement.json`)

1. Manual Trigger, plus a Schedule Trigger every 15 min.
2. HTTP Request: `POST {APP_URL}/api/settlement/run` with the Bearer secret.
3. A summary node that formats the aggregate, e.g. "Pact settled: 3 of 5 made it, 0.4 SOL paid out,
   $0 in fees", for the execution log. No Discord (operator decision, Nov 7): results are published on
   the website instead, at `/results` (settled public pacts) and each pact's public Pool Receipt.

n8n never receives fitness data. Give the operator import steps.

## Demo plan (everything real, replayable)

- **Live pact**, open through judging. On stage:
  1. Create an invite-only pact and show the invite link (P1).
  2. Join and deposit, then show the Explorer link.
  3. Sync a real run.
  4. Sync a real bus ride and show it rejected with `VEHICLE_SPEED`.
- **Ended pacts A, B, C** (rehearsal, judging, backup) from `scripts/seed-demo.ts`. Teammates make
  **real** devnet deposits tonight and sync **real** activities, aiming for mixed outcomes. On stage:
  1. Trigger n8n.
  2. Show the payouts landing and the pact appearing on `/results`.
  3. Open the Pool Receipt to show fee $0 and payouts equal to the pool.
- Record a backup video once it works.

## Real evidence

- **GPS eval**: in `packages/core`, run `pnpm fetch:strava` or use GPX exports, have humans confirm the
  labels, then run `pnpm eval` and put the table on a slide. Never put generated activities in
  `data/real/`.
- **Survey**: humans ask about 20 students three questions:
  - Did you set a fitness goal this term?
  - Did you stick with it?
  - Would you put $5 on yourself to stick with it?

  Never invent numbers.

## Privacy and honesty rules

- Strava data never goes to n8n, AI services, public views or on-chain. Tokens stay server-only.
- Standings show only "X of N cleared" plus opted-in names and percentages.
- Public transfers can reveal who got paid. Don't promise more privacy than that.
- GPS checks are eligibility checks, not proof of cheating. Known limits: slow cycling passes, and
  someone else carrying your phone passes.
- Label every fixture, mock and simulation. Never present a mock as live.
- Devnet only. No mainnet, no real funds.

## Operator tasks

Send these in one batch in your first reply, each with:
- the dashboard URL
- the exact setting to change
- the env var names and where to put them
- how to verify it worked

1. **Strava**: subscription on the app owner's account (the trial works; cancel after judging). Create
   the API app, set the callback domain to the Vercel domain, and upgrade capacity to 10.
2. **Supabase**: create the project, enable email OTP, and add keys to `.env.local` and Vercel.
3. **Vercel**: link the repo and add env vars.
4. **Solana**: you generate the treasury with `scripts/make-treasury.ts`; the operator funds it at
   faucet.solana.com. Teammates install Phantom on devnet and get devnet SOL.
5. **n8n Cloud**: import the workflow, set the app URL and the Bearer secret.

Env names for `.env.example`:
- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Strava: `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`
- App and Solana: `APP_URL`, `NEXT_PUBLIC_SOLANA_RPC_URL`, `NEXT_PUBLIC_TREASURY_ADDRESS`,
  `TREASURY_SECRET_KEY`
- n8n: `SETTLEMENT_API_SECRET`

Never ask for secrets in chat or commit them.

## Build order

At the end of each phase: typecheck, run tests, commit, push.

0. Workspace, `apps/web`, wire core, `.env.example`, README, deploy a skeleton to Vercel in the first
   hour. Send operator tasks.
1. Migrations, RLS, UBC email OTP, profiles. RLS test.
2. Strava connect, sync with the member window, private progress.
3. Wallet link, deposit verification.
4. Settlement endpoint, payouts, idempotency tests, n8n workflow, public `/results` page.
5. Seed script, official and demo pacts, results state. **P0 done: rehearse the full demo now.**
6. P1: Pool Receipt, "Where the money goes", standings, Explore, Create pact, invite links.
7. P2 if time: practice entry, leave before start, host cancel.
8. Freeze: README, video, Devpost (GitHub link, ≤4 min video, Community Impact opt-in and statement,
   Solana and n8n opt-ins with tx links and an n8n execution screenshot).

While you're blocked on an operator task, keep working with labelled fixtures. Keep handoffs short:
- what works live
- what's simulated
- what's blocked, and on whom
