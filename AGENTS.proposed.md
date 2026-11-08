# MovePact — HackCamp 2026

## Goal

Ship a working fitness commitment demo for verified UBC email holders.
Targets: Overall, Community Impact, Solana, and n8n. Devpost lists submission close as November 8, 2026, 12:15 p.m. MST; reconcile with organizer announcements.

## Product and demo scope

- Equal stakes; successful participants split the contributed pool. Refund everyone if all succeed or none succeed. No platform fee.
- Verified `@student.ubc.ca` email, one Strava athlete, and one wallet per account. Email verification is not enrollment or identity verification.
- Preserve Strava privacy settings; no public-profile or public-activity requirement. The MVP accepts GPS-recorded runs with enough data for automated eligibility checks. Activity evidence and progress stay private to the participant.
- One predefined running challenge. Proposed default, pending team confirmation: accumulate 20 km in one week; stake 0.1 devnet SOL. Store these values in seed/config data. No challenge editor or multiple goal modes.
- Journey: sign in → connect Strava/wallet → join/deposit → manual sync and deterministic GPS checks → private accepted progress → n8n-triggered backend settlement → devnet payout.
- Prepare a replayable demo with mixed outcomes and normal, vehicle-like, and missing/noisy GPS fixtures. Use a short demo window or labeled seeded ended state for settlement. Label all fixtures and simulated integrations.

## Stack and integration choices

- Next.js, TypeScript, Tailwind, Supabase Auth/Postgres, Strava OAuth/REST, n8n, Solana devnet, Vercel, pnpm workspaces.
- One web app and small shared TypeScript contracts; no speculative services or abstractions.
- Finance proposal: centrally controlled devnet treasury. Label custody accurately. No custom token or Anchor escrow program.
- One n8n workflow: challenge deadline → authenticated backend settlement request → record job outcome. Support a manual trigger for the demo. Backend checks the deadline and owns eligibility, accounting, and payout authorization; n8n receives no fitness evidence or private progress.
- Check Strava access, athlete capacity, and OAuth callbacks immediately. Request only the OAuth scopes needed for the participant's data. No Strava data in AI, public views, review notifications, or on-chain.

## Ownership and coordination

Four humans each direct one agent in separate branches/worktrees. Agree on routes, shared types, and statuses first.

| Area | Owner's scope |
| --- | --- |
| UI | Pages/components, onboarding, challenge/private-progress UI |
| Core | Auth, profiles, membership, migrations/policies, core APIs |
| Activity | Strava, deterministic GPS checks/private progress, n8n settlement trigger, activity fixtures |
| Finance | Wallet logic, deposits, pool accounting, settlement/payouts |

- Integration lead owns shared config, root layout, dependencies/lockfiles, and `packages/contracts/`. Core exclusively owns migrations.
- Stay within your area and agreed conventions; coordinate cross-area changes with the owner. Each route has one owner. UI consumes domain interfaces.
- Send schema, dependency, and environment requirements early. Mocks use shared contracts and fixtures.

## Changes to these instructions

- Whenever starting/resuming work, read `AGENTS.md`; check `git diff -- AGENTS.md`, `git diff --cached -- AGENTS.md`, and committed changes since your last review. Repeat after pulls/merges or context resets.
- Every worker may propose clarifications, conflict fixes, or scope cuts. Proposals must not extend product or technical scope.
- Send the exact proposed diff and reason to your operator for approval or feedback. Revise from feedback; apply/commit only after operator approval. Proposals are not active instructions.
- Lead propagates approved edits to every worktree; workers review the diff before continuing.

## Agent and operator responsibilities

- Agents independently implement/test code, including devnet transactions with dedicated throwaway keys, within tool permissions.
- Operators handle account/dashboard setup, OAuth consent, credentials, human-wallet signatures, billing, and destructive shared-service changes. Real funds/mainnet are out of scope.
- Batch operator tasks with dashboard URL, exact settings, environment-variable names/destination, and verification steps. Prepare code/non-secret config first; continue independent fixture-based work while waiting. Report blockers promptly.
- Put environment names in `.env.example` and established setup/run/build commands in README. Never commit secrets, request them in chat, or silently present mocks as live.

## Essential correctness

- Server-authorize mutations/settlement; verify wallet ownership and on-chain deposits.
- Agree once on aggregation, join/funding cutoff, activity window, and settlement trigger.
- Validate run type/window, reject manual entries, deduplicate IDs. Every otherwise eligible run must pass deterministic, non-LLM GPS checks using time/location/distance streams; summary distance alone is insufficient.
- Check sample validity/coverage, sustained vehicle-like speeds, and implausible movement. Use time windows and minimum-duration/distance thresholds to tolerate isolated GPS spikes. Keep thresholds explicit, configurable, and documented; no ML or external transport-data service.
- Only passing runs contribute accepted meters. Suspicious or insufficient GPS data does not count; show the participant reason codes. API failures are retryable sync errors and never count unvalidated distance. No human-review queue or manual approval dependency. Describe failures as eligibility results, not proven cheating; GPS heuristics cannot guarantee transport detection.
- UTC timestamps, integer lamports, challenge-attributed verified deposits only. Define rounding/remainders; fund fees separately.
- Persist settlement allocations/signatures; check uncertain outcomes before retrying. Test normal/vehicle-like/missing/noisy GPS, retryable sync errors, repeated sync/settlement, some/all/no-success payouts, and the complete journey.

## Delivery

- Deploy a building skeleton early; integrate working slices throughout development.
- If service access/permitted use is unavailable, report it and use labeled synthetic fixtures.
- Final four hours: fixes, rehearsal/recording, README, submission. No new features.
- Use actual user feedback for the community problem/impact statement; never invent research.
- Submit GitHub, Figma if applicable, recommended ≤4-minute video, Community Impact opt-in/statement, and Solana/n8n opt-ins with actual-use evidence.
- Handoff: working/simulated status, checks, interface changes, operator actions.
- No public-profile requirement, reports/moderation/human review, other sports/communities, challenge editor, social features, automatic Strava webhooks, advanced GPS/ML fraud detection, extra sponsor integrations, or future-roadmap implementation. Deterministic GPS checks are required.

Official references: [event and prizes](https://hackcamp-2026.devpost.com/), [opt-in rules](https://hackcamp-2026.devpost.com/rules), [submission schedule](https://hackcamp-2026.devpost.com/details/dates), [Strava access](https://developers.strava.com/docs/getting-started/), [Strava activity streams](https://developers.strava.com/docs/reference/#api-Streams-getActivityStreams), [Strava policy](https://www.strava.com/legal/api_policy).
