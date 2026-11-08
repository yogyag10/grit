# Grit

**Show up. Get paid back.**

Grit is a fitness pact app for UBC students. Set a distance goal with friends, make an equal commitment deposit, and track your progress through Strava. Everyone who clears the goal splits the pool. If everyone or nobody clears it, everyone gets their deposit back. There is no platform fee.

Live: https://gritubc.vercel.app · Built for **HackCamp 2026** (UBC, Nov 7-8, 2026).

## The problem

HackCamp's theme: *identify a problem facing a community and build a solution that makes a meaningful difference.* Our community is UBC students. Fitness goals are easy to set and easy to drop, especially during term, and apps that put money behind a goal usually take a cut, keep forfeited money when nobody finishes, or aren't built around a campus.

Grit makes the commitment social and fair:

- **Only verified UBC students** can join (`@student.ubc.ca` email codes).
- **0% fee.** Forfeited deposits go to the people who showed up. Nobody clears it? Everyone is refunded.
- **Payouts go straight to your wallet**, and every transfer is verifiable on Solana.
- **Community:** campus chat, open groups, and private groups with shareable invite codes, so a floor, club or friend group can hold each other to it.

## Features

- UBC student email sign-in
- Explore with search, Live / Upcoming / Ended filters, and sorting by start time or joining fee
- Create a pact: name, activity, goal, deposit, dates, public or invite-only
- Nine activities: run, trail run, walk, hike, ride, mountain bike, swim, row, sail, each with its own GPS rules
- A photo and a recommended-trail map for each spot
- Strava activity sync with GPS eligibility checks
- Browser wallets, verified deposits, and transaction receipts on Solana devnet, with amounts also shown in CAD
- A public Pool Receipt per pact: every deposit and payout, the $0 fee, and a check that payouts equal the pool
- Private activity history; a leaderboard where people appear by name, with their km toward the goal, only if they opt in
- Campus chat, groups with their own chat, and private groups joined by an 8-character code or invite link
- Settlement through n8n, with results on the public `/results` page
- Disconnect Strava at any time

The current app uses Solana devnet and free test SOL, with no real money involved.

## How it works

```
Strava ──► sync + GPS checks (packages/core) ──► private progress per member
Wallet ──► deposit ──► verified on Solana devnet ──► pool
n8n ──► POST /api/settlement/run ──► settlement plan (packages/core) ──► devnet payouts ──► Pool Receipt + /results
```

- **GPS checks** are deterministic and unit-tested: sport type, window, minimum length, missing or noisy GPS, GPS gaps, vehicle-speed windows, implausible pace, distance mismatch. They are eligibility checks, not proof of cheating.
- **Settlement** handles remainders, refunds and the no-winner and all-winners cases. Payouts are idempotent, so a retry never pays twice.
- **Data** is in Supabase Postgres with row-level security. Strava tokens and community data are server-only, and Strava data never goes to n8n.

## Prize tracks

| Track | Evidence |
| --- | --- |
| Community Impact | A campus-only accountability tool with groups and chat, built around a survey of UBC students (results on the Devpost) |
| Best Use of Solana | Real devnet deposits and payouts, verified on-chain, with Explorer links and the public Pool Receipt |
| Best Use of n8n | A real n8n workflow that settles pacts; results appear on `/results` |

## What's real and what's demo

**Real:** UBC email sign-in, Strava OAuth and GPS checks, devnet deposits verified on-chain, settlement and devnet payouts, the n8n workflow, the Pool Receipt.

**Demo data, labelled in the app:**
- The **Wreck Beach run** demo pact shows 22 sample people with fixed distances, and fixed distances for its real members. The Activity page of demo members shows a fixed set of runs, streak and totals. None of this is real running and none of it moves money: pools, deposits and payouts come only from real memberships and verified deposits.
- SOL has no value on devnet. CAD amounts use a fixed rate (C$125.68 per SOL, Nov 8 2026; override with `NEXT_PUBLIC_SOL_CAD_RATE`).
- Trail maps show a **suggested** route from OpenStreetMap path data, not a measured course.

**Known limits:**
- Our GPS checks are weaker than a full run-verification system: a slow bike ride can pass as a run, and someone else carrying your phone passes.
- The run rules came first. The thresholds for the other eight activities are sensible guesses tested on synthetic tracks, **not yet tuned on real swims, rows or sails.** Pool swims and indoor rowing have no GPS and can't be verified, and a speed check can't tell a sailboat from a motorboat.
- Chat has rate limits but **no report or moderation tools.**
- Deposits sit in one central devnet treasury wallet, not an on-chain escrow program.
- Tested by hand with a handful of accounts, not at scale.

## How we used AI

Much of this code was written with **Claude Code** (Anthropic's coding agent) under the team's direction. The team chose what to build, reviewed the output, ran it against real Strava, Supabase, Solana and n8n accounts, and set the product and privacy rules. The money and GPS logic has unit tests, and the database rules have a real-Postgres test.

## Getting started

Requires Node.js 22+ and pnpm 11.

```sh
pnpm install
cp apps/web/.env.example apps/web/.env.local
```

Configure the services in `apps/web/.env.local`:

1. **Supabase:** apply [`supabase/migrations/`](supabase/migrations) in filename order (`0001` through `0005_pact_activity`), enable email sign-in, and configure email delivery with the [sign-in template](supabase/templates/sign_in.html). Add the project URL, anon key, and service-role key. Allow `http://localhost:3000/auth/callback` as an auth redirect.
2. **Strava:** add the client ID and secret. Set the callback domain to `localhost`; the app handles OAuth at `/api/strava/callback`.
3. **Solana:** run `pnpm make-treasury`, fund the generated address with [free devnet SOL](https://faucet.solana.com/), and set `NEXT_PUBLIC_TREASURY_ADDRESS` and `TREASURY_SECRET_KEY`. The keypair is saved locally in the gitignored `scripts/.treasury-secret.json`.
4. **App:** set `APP_URL=http://localhost:3000`. For scheduled settlement, set `SETTLEMENT_API_SECRET` and import the [n8n workflow](n8n/README.md).

```sh
pnpm seed  # optional sample pact
pnpm dev   # http://localhost:3000
```

Sign in with a `@student.ubc.ca` email address. Set up a browser wallet and connect Strava from the account setup page.

## Development

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm start
```

`pnpm test:rls` checks database policies in a disposable Postgres container and requires Docker. `pnpm demo:solana` runs a standalone devnet deposit/refund check using the configured treasury.

## Project structure

| Path | Purpose |
| --- | --- |
| [`apps/web/`](apps/web) | Next.js application and server routes |
| [`packages/core/`](packages/core) | GPS checks, progress, and settlement calculations |
| [`supabase/`](supabase) | Database migrations, access policies, and email template |
| [`n8n/`](n8n) | Settlement workflow |
| [`scripts/`](scripts) | Development and verification utilities |

Built with Next.js, React, TypeScript, Tailwind CSS, Supabase, Strava, Solana, and n8n. The application is named Grit; workspace packages use the `@oathmile` namespace.

## Credits

Thank you to **HackCamp 2026 and nwPlus**, and to the sponsors named in the Hacker Package: **Freebuff, Databricks, Intern Insider, DeepSpace and Maritime**, along with every sponsor and mentor who supported the weekend. We did not build with those five. We built with Solana, n8n, Supabase, Vercel, Strava, OpenStreetMap and Leaflet.

Photo and map attribution is in [`apps/web/public/spots/CREDITS.md`](apps/web/public/spots/CREDITS.md). Grit is not affiliated with UBC.
