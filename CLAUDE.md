# Oathmile: instructions for Claude Code (v2)

v2 replaces v1. What changed: the scope now matches the core feature set of Renno, an existing
running-stakes app, plus Oathmile's own differentiators, in strict priority tiers. Where this file
conflicts with v1, `AGENTS.proposed.md` or `context.md`, this file wins. The operator (Yogya) approved
these changes.

> **Brand update:** the product's display name in the UI is **Grit** (logo, tagline, copy). The repo, package names and browser storage keys keep the `oathmile` name. The design handoff lives in `design/` (screenshots, reference HTML, tokens).

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

## Design system (Grit)

Every screen uses these rules. Reuse `apps/web/components/ui/*` before making anything new.
If the Figma and this section disagree, ask the frontend owner; don't invent a third style.

### Feel
Dark, outdoorsy and trustworthy: near-black background, lime accent, big photos of real UBC run spots with a small route map in the corner, rounded cards. Our own design, not a copy of any trail app. It handles people's money, so it should look like a clean finance app
that happens to be about running, not a betting app. No confetti-casino styling, no neon gradients.

### Brand: Grit
- Name: **Grit** (display name everywhere in the UI; package names can stay as they are).
- Logo = the wordmark: lowercase "grit", Inter ExtraBold (800), letter-spacing -0.05em. The dot on the i is replaced by a solid
  arrowhead pointing up (forward + your money coming back up). Build it as `components/brand/GritLogo.tsx`: render "gr", a
  dotless ı (U+0131) with the arrow absolutely positioned above it, then "t". Wrap it with `role="img" aria-label="Grit"`.
- Arrow SVG (viewBox 0 0 100 100): `<path d="M50 8 L96 90 L50 62 L4 90 Z" stroke-width="6" stroke-linejoin="round"/>`, fill and
  stroke the same colour. Arrow width ≈ 0.34 × font size, sitting about 0.2 × font size above the i.
- Colours: on dark, letters `ink` (#F4F5F2) + arrow `oath` lime (#B6EA8C). On light, letters #0E0F0E + arrow #2F8F2A. On lime, all #0E0F0E.
- App icon / favicon: the arrow alone, lime on a near-black rounded square (`app/icon.svg`):
  `<svg viewBox="0 0 100 100"><rect width="100" height="100" rx="24" fill="#0E0F0E"/><path d="M50 22 L76 70 L50 54 L24 70 Z" fill="#B6EA8C" stroke="#B6EA8C" stroke-width="4" stroke-linejoin="round"/></svg>`
- Tagline: "Show up. Get paid back."

### Tokens (dark theme, defined in `apps/web/app/globals.css` with Tailwind v4 `@theme`)
| Token | Tailwind class | Use |
| --- | --- | --- |
| `canvas` #0E0F0E | `bg-canvas` | page background |
| `card` #1A1C1A | `bg-card` | cards, inputs, chips, list rows |
| `line` #2C2F2C | `border-line` | borders, dividers, progress track |
| `ink` #F4F5F2 | `text-ink` | main text |
| `muted` #A3A8A3 | `text-muted` | secondary text, labels |
| `oath` #B6EA8C | `bg-oath`, `text-oath` | lime accent: primary buttons (with `text-oath-ink`), progress fill, links, "Counted" badge |
| `oath-ink` #0E0F0E | `text-oath-ink` | text on lime |
| `oath-soft` #1F2E17 | `bg-oath-soft` | lime-tinted panels ("Payouts equal the pool") |
| `missed` #FCA5A5 / `missed-soft` #3A1A1A | | "Not counted" badge |
| `demo` #FCD34D / `demo-soft` #3A2F10 | | "Demo data" badge |

- Font: Inter via `next/font/google`, variable `--font-inter`. Numbers use `tabular-nums`.
- Type: page title `text-[28px] font-bold tracking-tight`, card title `text-xl font-bold`, body `text-base`, meta `text-sm text-muted`. Big stats `text-4xl font-extrabold tabular-nums`.
- Radius: photo cards `rounded-[20px]`, cards `rounded-[18px]`, buttons, chips, search and nav `rounded-full`.
- Layout: mobile first at 390 px, `mx-auto w-full max-w-md`, page padding `px-4`. Floating bottom nav (pill, `bg-[#202220]/95`, `border-[#383B38]`), 5 items: Explore, My pacts, Create (lime round button), Activity, Me. Leave `pb-28` so content clears it.

### Signature pattern: photo card with map inset
Every pact (Explore list, pact page hero, results) shows a big photo of the run spot (`h-[220px]`, hero `h-[300px]`) with:
- a small route map in the bottom-right corner (80–96 px square, `rounded-2xl`, 3 px white border), drawn with Leaflet or a static SVG of the pact area
- round dark icon buttons top-right (`bg-[#0E0F0E]/80`, 44 px): share, save
- a status pill top-left ("● Live" in lime, "Starts Mon" in amber)
- on hero images, a bottom gradient to `canvas` with the title on top
Photos: our own photos of UBC spots in `apps/web/public/spots/` (wreck-beach.jpg, pacific-spirit.jpg, thunderbird-track.jpg). Never use photos from other apps or the web.

### Components (`apps/web/components/ui/`)
- `Button`: variants `primary` (bg-oath text-oath-ink), `secondary` (bg-card border-line text-ink),
  `ghost`. Sizes `md` (h-12) and `sm` (h-10). Full width by default on mobile. Shows a spinner + disabled when loading.
- `Card`: bg-card, rounded-[18px], no shadow, p-4 or p-5.
- `Badge`: `counted` (bg-oath text-oath-ink) / `missed` (bg-missed-soft text-missed) / `demo` / `neutral`. Always icon + word, never colour alone
  (e.g. ✓ Accepted, ✕ Rejected, ⟳ Syncing).
- `ProgressRing` (or bar): shows km done / goal and %; uses `oath`, stays lime at 100% and shows a check.
- `StatTile`: label (text-sm text-muted) over a big number.
- `ExplorerLink`: truncated signature (first 4…last 4) + external-link icon, opens Solana Explorer (devnet) in a new tab.
- `ReasonNote`: shows `REASON_MESSAGES[code]` from `@oathmile/core` under a rejected activity. Neutral tone.
- `DevnetBanner`: thin top banner "Devnet only · no real money" on every page.
- `EmptyState`: icon, one line, one action.
Icons: `lucide-react` only.

### Copy rules
- Words: "pact", "commitment deposit", "clear the goal", "get your deposit back", "pool". Never "bet",
  "gamble", "win money", "jackpot".
- Show money as SOL with 2–3 decimals plus "devnet", e.g. `0.10 SOL (devnet)`.
- Sentence case everywhere. Buttons start with a verb: "Join pact", "Connect Strava", "Sync runs".
- Every mock or fixture on screen carries a small "Demo data" badge.

### Accessibility (non-negotiable)
- Text contrast ≥ 4.5:1 (all token pairs above pass on white/canvas).
- Every interactive element is a real `<button>` or `<a>`, has a visible label or `aria-label`, and a
  visible focus ring (`focus-visible:ring-2 ring-oath ring-offset-2`).
- Tap targets ≥ 44 px tall.
- Status is never colour-only: icon + word.
- Progress has text too ("12.4 of 20 km · 62%") and `role="progressbar"` with aria values.
- Animations respect `motion-reduce:` (no movement when the user prefers reduced motion).
- Images and icons that carry meaning have `alt` / `aria-label`; decorative ones `aria-hidden`.
- Forms: every input has a `<label>`; errors appear as text next to the field.

### Signature moments (polish these first)
1. **Pact page hero**: photo + map inset, then a big progress bar, "X of N have cleared", pool size, days left.
2. **"Where the money goes" panel**: a simple 3-row breakdown with this pact's real numbers and "Fee: 0".
3. **Results state**: cleared → lime card "That’s grit. +0.166 SOL sent to your wallet" with Explorer link;
   missed → calm, kind message, no shaming.
4. **Pool Receipt**: clean ledger table, totals row, and a ✓ "Payouts equal the pool" check.

## Community (added by the operator, beyond the v2 tiers)

Campus-wide chat, groups with their own chat, and private groups joined by shareable invite code. Routes under `/community`, API under `/api/community`, tables `groups`, `group_members`, `messages` (migration `0003_community.sql`).

- Server-only data: RLS on with no client policies. Every read and write goes through a route that checks the signed-in user and, for groups, membership.
- Private groups are invisible without the code (404). Codes are 8 characters from an alphabet without look-alike letters.
- Chat is plain text (500 characters), polled every few seconds, rate limited to 20 messages a minute. Members pick a chat name first; emails are never shown.
- There is no report or moderation tooling. Don't claim any. The UI says only that everyone is a verified UBC student and can see what is written.

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
