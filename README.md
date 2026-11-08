# Oathmile

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

```sh
pnpm make-treasury
```

Prints the public address and writes the secret to `scripts/.treasury-secret.json` (gitignored). Fund the address at https://faucet.solana.com, and put the values in `NEXT_PUBLIC_TREASURY_ADDRESS` and `TREASURY_SECRET_KEY`.

## Status

Phase 0 skeleton. See `CLAUDE.md` for the build order.
