# Grit

Put your money where your movement is. Verified UBC students join a pact, put in an equal commitment deposit (devnet SOL), and run toward a goal. Everyone who reaches it splits the pool. If everyone or no one makes it, everyone gets their deposit back. No platform fee.

Devnet only. No real funds.

## Layout

```
apps/web/            Next.js app (UI + server routes)
packages/core/       GPS checks, progress, settlement math (tested)
scripts/             make-treasury.ts (more to come)
```

## Run it

Needs Node 22+ and pnpm 11.

```sh
pnpm install
cp apps/web/.env.example apps/web/.env.local   # then fill in the values
pnpm --filter @oathmile/web dev                # http://localhost:3000
```

Checks:

```sh
pnpm typecheck
pnpm test
pnpm --filter @oathmile/web build
```

## Treasury keypair (devnet)

The app uses browser demo wallets. On the setup page, choose **Use demo wallet**; the key is
saved in that browser for the signed-in account. Deposits are funded with free test SOL from
the treasury, signed in the browser, and verified on-chain by the existing deposit endpoint.
Payouts go back to the same demo wallet. A browser extension is not required.

Configure the treasury locally and on Vercel before trying deposits:

```sh
pnpm make-treasury
```

Prints the public address and writes the secret to `scripts/.treasury-secret.json` (gitignored). Fund the address at https://faucet.solana.com, and put the values in `NEXT_PUBLIC_TREASURY_ADDRESS` and `TREASURY_SECRET_KEY`.

## Live Solana Devnet demo (no browser wallet required)

Use `NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com` in `apps/web/.env.local`.
After configuring and funding the treasury above, run:

```sh
pnpm demo:solana
```

The script checks that the RPC is on Devnet, funds a dedicated test wallet, sends a real
0.001 test SOL deposit, verifies it with the app's deposit verifier, and refunds it using the
settlement math and live transfer adapter. The test wallet's private key is saved in the
gitignored `scripts/.devnet-demo-participant.json`.

Transaction signatures, confirmation status, and Explorer links are saved under
`artifacts/solana-devnet/`. Open the deposit and refund links to screenshot the Devnet network,
confirmed status, and transferred amounts. This is a live Solana integration test with test
wallets; it does not exercise Supabase, Strava, n8n, or prove the complete application flow.
If a run fails after sending a transfer, check its saved signatures before running again.

## Status

Demo pacts (`is_demo=true`) include a stable crowd of 20–30 labelled sample pledges on
Explore, pact details, and the leaderboard. These are display fixtures, so existing demo
pacts pick them up on deployment without reseeding. Real app memberships are added to the
pledged count; pool receipts and settlement use only real memberships and verified deposits.

See `CLAUDE.md` for the project requirements and build order.
