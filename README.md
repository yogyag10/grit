# Grit

**Put your money where your movement is.**

Grit is a fitness pact app for UBC students. Set a distance goal with friends, make an equal commitment deposit, and track your progress through Strava. Everyone who clears the goal splits the pool. If everyone or nobody clears it, everyone gets their deposit back. There is no platform fee.

## Features

- UBC student email sign-in
- Public and invite-only pacts across running, cycling, walking, and other activities
- Strava activity sync with GPS eligibility checks
- Browser wallets, verified deposits, and transaction receipts on Solana devnet
- Private activity history and optional shared standings
- Campus chat and community groups
- Scheduled settlement through n8n

The current app uses Solana devnet and free test SOL, with no real money involved.

## Getting started

Requires Node.js 22+ and pnpm 11.

```sh
pnpm install
cp apps/web/.env.example apps/web/.env.local
```

Configure the services in `apps/web/.env.local`:

1. **Supabase:** apply [`supabase/migrations/`](supabase/migrations) in filename order, enable email sign-in, and configure email delivery with the [sign-in template](supabase/templates/sign_in.html). Add the project URL, anon key, and service-role key. Allow `http://localhost:3000/auth/callback` as an auth redirect.
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

Photo and map attribution is in [`apps/web/public/spots/CREDITS.md`](apps/web/public/spots/CREDITS.md). Grit is not affiliated with UBC.
