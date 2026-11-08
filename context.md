# MovePact — project context and AGENTS.md review

This is a handoff document summarizing the product, the current instruction draft, the user's decisions, and two independent reviews. It is reference material, not an adopted replacement for `AGENTS.md`.

The current draft is [AGENTS.proposed.md](AGENTS.proposed.md). No active `AGENTS.md` was found during inspection. The workspace has planning documents but no application implementation from this session; Git commands did not recognize it as an initialized repository. No application tests have run.

## 1. Why this work exists

The user is participating in HackCamp 2026 and supplied a long AGENTS.md draft produced by another model. The original request was to:

1. Review the hackathon and sponsors first.
2. Look for poor LLM behavior, especially scope creep, arbitrary assumptions, and unnecessary process.
3. Propose improvements appropriate for this particular team and event.
4. Ask specific questions when important decisions are unclear.

Approximately **19 hours remained when the team discussed the plan**. This is historical context, not a live countdown. Four human teammates each have a coding agent. The user expects implementation to move quickly and does not want scope decisions based on conventional human-only coding throughput.

The main constraints are external account setup, shared interfaces, integration, and a reliable demonstration. The user does not want to read a massive active instruction file. This longer document preserves context so that the eventual AGENTS.md can stay concise.

## 2. HackCamp and sponsor context

HackCamp 2026 is a 24-hour event at UBC on November 7–8. Its challenge concerns solving a community problem. The published judging criteria cover problem/user research, innovation, technical implementation, design/UX, and presentation. [Official event page](https://hackcamp-2026.devpost.com/)

The user's chosen targets are:

| Target | Project relevance |
| --- | --- |
| Overall | Demonstrate a coherent, working product and explain the community problem. |
| Community Impact | Explain the intended benefit to the student community, grounded in actual feedback. |
| Best Use of Solana | Demonstrate actual devnet deposits and payouts. |
| Best Use of n8n | Demonstrate a useful, working automation in the application. |

Solana and n8n are explicit prize tracks. Their published descriptions do not require a custom escrow program, mainnet transactions, or an in-product LLM. Community Impact requires an opt-in and impact statement. [Prize descriptions](https://hackcamp-2026.devpost.com/#prizes)

Only one superlative may be selected; sponsor opt-ins are unrestricted. Community Impact is the intended superlative. [Official rules](https://hackcamp-2026.devpost.com/rules)

Submission calls for a GitHub link, Figma if applicable, and a recommended optional video of at most four minutes. [Submission requirements](https://hackcamp-2026.devpost.com/)

Devpost lists submission close as **November 8, 2026, 12:15 p.m. MST**. Reconcile that display with organizer announcements rather than assuming a local-time conversion. [Official schedule](https://hackcamp-2026.devpost.com/details/dates)

There is no reason to add another sponsor integration solely to increase the number of logos. Freebuff would be relevant if actually used as a build tool. Another auth service, database, analytics platform, or AI feature needs a concrete purpose before replacing or extending the current stack.

## 3. Product and economics

**MovePact — Put your money where your movement is.**

The product is a community fitness commitment app. Participants put equal stakes into a challenge and complete an exercise objective before its deadline.

The intended rules are:

- All successful participants qualify; there is no single winner or ranking-based payout.
- Successful participants split the contributed pool.
- Unsuccessful participants forfeit their stakes.
- If everyone succeeds, everyone gets their stake back.
- If nobody succeeds, refund everyone for the MVP.
- No platform rake or fee.

The intended first community is verified UBC email holders. Require verified `@student.ubc.ca` email, one linked Strava athlete, and one linked wallet per account. Email verification is a community gate, not proof of enrollment, age, or one-human-one-account identity. MovePact is not affiliated with UBC.

The hackathon uses **valueless Solana devnet funds only**. Real customer funds and mainnet are outside the task. Production legal/provider/security questions are not a hackathon implementation project.

## 4. Confirmed decisions versus proposed defaults

### Confirmed by the user

- Four humans, each working with a coding agent.
- UBC email community gate.
- Strava integration through each participant's own OAuth consent.
- Equal stakes and no rake.
- Solana and n8n award targets.
- Preserve activity privacy.
- **Mandatory automated GPS plausibility checks.**
- Those checks must use a **deterministic, non-LLM algorithm**.
- Public-profile requirements and human-review workarounds are removed from the MVP.
- Agents should forward necessary manual vendor/account/dashboard configuration to their human operators.
- Agents may propose changes to AGENTS.md, but proposals must not extend scope and require operator review before adoption.
- Workers must inspect AGENTS.md changes whenever starting or resuming work.

### Current draft choices that are still proposals

| Choice | Status |
| --- | --- |
| One predefined running challenge | Accepted as a reasonable demo simplification; do not build a challenge editor. |
| Cumulative 20 km within one week | Proposed default. The original model chose 5 km; the user suggested that 20 km across a week might make a better demo. Do not silently treat this as final. |
| Stake of 0.1 devnet SOL | Current proposed default, kept in seed/config data. |
| Central devnet treasury | Proposed minimal implementation. Escrow was introduced by the earlier model, not a requirement from the user. |
| n8n triggers backend settlement | Current draft adaptation after removing moderation. It preserves the n8n target without forwarding private activity evidence. |
| Short demo window or seeded ended state | Unresolved alternatives. Pick one before implementation. |

The implementation must settle these choices once instead of having different agents independently interpret them.

## 5. What was explicitly removed

The discussion briefly considered required human review of suspicious runs, making Strava profiles public, and sending reviewers to public Strava activity pages rather than forwarding API-derived evidence.

The user rejected that approach because the product should preserve privacy and the workaround was becoming excessive. The latest instruction keeps automated GPS checks and removes the human/public-data machinery.

**Do not bring back the following as MVP requirements:**

- Public Strava profiles or public submitted activities.
- Public activity links as review evidence.
- Reporting and moderation interfaces.
- Human approval queues or appeals.
- n8n human-review workflows.
- Settlement waiting indefinitely for a moderator.
- A new privacy-workaround architecture.

Other scope cuts remain: challenge creation, additional communities/sports, social features, automatic Strava webhooks, ML fraud detection, custom tokens, Anchor escrow, mainnet, extra sponsor integrations, and future-roadmap implementation.

## 6. Current intended MVP flow

1. Sign in with a verified UBC email.
2. Connect Strava through OAuth and connect a wallet.
3. Join the predefined challenge and deposit the required devnet stake.
4. Manually sync running activities.
5. Apply basic eligibility checks and mandatory deterministic GPS checks.
6. Display the participant's private accepted progress and reasons for activities that do not count.
7. At the agreed settlement point, n8n requests backend settlement.
8. The backend checks eligibility/accounting and sends devnet payouts or refunds.
9. Show actual transaction results.

Synthetic GPS fixtures are appropriate for normal, vehicle-like, noisy, and missing-data scenarios. They must be labeled. Fixtures do not establish that a live integration works.

## 7. Stack and ownership

| Layer | Current choice |
| --- | --- |
| Application | Next.js, TypeScript, Tailwind |
| Auth/database | Supabase |
| Fitness import | Strava OAuth and REST API |
| Automation | n8n |
| Funds | Solana devnet |
| Deployment | Vercel |
| Workspace | pnpm workspaces |

The intended structure is one web app with small shared TypeScript contracts. Avoid speculative services, generic engines, and abstraction layers.

| Team | Responsibility |
| --- | --- |
| UI | Pages/components, onboarding, challenge and private-progress UI |
| Core | Auth, profiles, membership, database migrations/policies, core APIs |
| Activity | Strava integration, GPS checks, private progress, activity fixtures, n8n settlement trigger |
| Finance | Wallet logic, verified deposits, pool accounting, settlement and payouts |

Each pair works in a separate branch/worktree. One human is the integration lead. The lead owns shared configuration, root layout, dependencies/lockfiles, and `packages/contracts/`. Core exclusively owns database migrations.

Agree on route ownership, types, statuses, and fixtures before parallel implementation. UI consumes domain interfaces instead of duplicating domain logic. The current proposal assigns conceptual areas but still needs concrete directory and route prefixes after bootstrap.

## 8. Agent autonomy and human operator handoffs

Agents independently implement code, run checks, and make routine reversible changes. Implementing and testing Solana devnet code is normal agent work; Solana alone is not a reason to stop for human approval. Dedicated throwaway devnet keys may be used within tool permissions.

Operators handle account creation, vendor dashboards, OAuth consent, credentials, signatures from human-controlled wallets, billing, and destructive changes to shared services. Mainnet and real funds remain excluded.

An operator request should contain:

- Service/dashboard URL.
- Exact setting or action required.
- Environment-variable names and where to configure them.
- A verification step.
- The specific work blocked by the missing setup.

Prepare the code and non-secret configuration first. Batch related setup requests. Continue independent fixture-based work while waiting. Never request secrets in chat or commit them. Record environment names in `.env.example` and working commands in README once established.

### Changes to AGENTS.md

Every worker may propose clarifications, conflict fixes, or scope cuts. Proposals must not extend product or technical scope.

Send an exact proposed diff and reason to the human operator for approval or feedback. Revise from feedback; apply/commit only after approval. Proposed instructions are not active instructions.

Whenever starting or resuming work, workers should read the current AGENTS.md and inspect:

```sh
git diff -- AGENTS.md
git diff --cached -- AGENTS.md
```

Also review committed changes since the last review; those commands only show uncommitted changes. Repeat after pulls/merges or context resets. The integration lead propagates approved edits across worktrees, and workers review them before continuing.

## 9. GPS and private Strava import

Every otherwise eligible run must pass deterministic GPS checks. Summary distance alone is insufficient.

The current proposal calls for:

- Correct running type and eligible activity window.
- No manual entries or duplicate counting.
- Valid time/location/distance samples with enough coverage.
- Checks for sustained vehicle-like speed and implausible movement.
- Time windows and minimum-duration/distance thresholds that tolerate isolated GPS spikes.
- Documented thresholds in server code/config, not an administrative tuning interface.

Only passing activities contribute accepted meters. Suspicious or insufficient evidence does not count; show the participant reason codes. API/auth/network failures are retryable sync errors, not cheating verdicts. There is no human-review dependency.

GPS plausibility is a heuristic eligibility check. It cannot guarantee detecting every bus trip or prove that someone ran. Do not advertise stronger verification than the implementation provides.

Private activities and hidden GPS portions may require `activity:read_all`. Check the scopes actually granted, because athletes can decline requested scopes. Missing permission must produce an authorization/sync error rather than a suspicious-activity classification. [Strava OAuth documentation](https://developers.strava.com/docs/authentication/)

Strava exposes activity streams for this processing. [Activity-stream reference](https://developers.strava.com/docs/reference/#api-Streams-getActivityStreams)

OAuth consent, app athlete capacity, and provider data-use restrictions are separate issues. Public visibility is not blanket permission to redistribute API data. No one established that the discarded public-review workaround was approved. Keep provider questions bounded; do not restart that abandoned design. [Strava access limits](https://developers.strava.com/docs/rate-limits/), [API policy](https://www.strava.com/legal/api_policy)

## 10. Finance and settlement requirements

Use UTC timestamps and integer lamports. Server-authorize mutations and verify wallet ownership and actual on-chain deposits. Client-supplied success messages or signatures alone are insufficient proof of payment.

Only verified contributions attributed to this challenge belong to its pool. Network fees should be funded separately. Define the rounding/remainder rule before implementing payouts.

For example, with four funded participants staking 0.1 devnet SOL each and two qualifying participants, the contributed pool is 0.4 SOL and each qualifier receives 0.2 SOL. This illustrates the economics; implementation uses integer amounts.

Persist settlement allocations and transaction signatures. If a request times out, verify the outcome before creating another payout. Repeated requests must not pay twice.

Two critical invariants need to be made explicit in the eventual instructions/contracts:

1. Only participants with a verified full stake before the funding cutoff can qualify for payouts.
2. Accepted progress and recipients are frozen for settlement after the chosen sync/submission cutoff.

The n8n workflow should request settlement through an authenticated backend endpoint and record the job result. The backend remains authoritative and must reject premature or duplicate settlement. n8n receives no fitness evidence or private progress.

## 11. Findings from the two independent reviews

Both reviewers independently checked the current proposal against the hackathon context. Both found little remaining outright scope creep. Their main concern was unresolved shared behavior inside an otherwise authoritative brief. Neither recommended removing mandatory private GPS checking or adding sponsors. Their reviews were read-only.

### A. Settlement can race the final sync — both reviewers

The draft schedules settlement at the challenge deadline but also permits retryable manual imports. A run can finish on time yet arrive after payout.

**Minimal fix:** define a final sync/submission cutoff and freeze progress/recipients before transfers. Decide whether syncing must complete by the exercise deadline or by a separate cutoff. Do not invent a reconciliation system before choosing that policy.

### B. Unpaid members might qualify — reviewer 1

The draft restricts pool accounting to verified deposits, but does not explicitly restrict recipients. Core may create membership before Finance verifies a deposit, while Activity independently marks the member successful.

**Minimal fix:** require a verified full stake before the funding cutoff for payout eligibility, and freeze that funded cohort.

### C. Privacy needs read-access rules — both reviewers

Private UI wording does not establish private database/API access. The draft explicitly authorizes mutations but does not state owner-only reads.

**Minimal fix:** owner-only activity/progress access, server-only Strava tokens, appropriate database policies, and a check that one user cannot read another's data. Specify OAuth scopes and classify denied access correctly. [Supabase RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)

Reviewer 1 also noted a wording limit: public devnet transfers can make success inferable even if raw fitness data remains private. Narrow the promise rather than adding privacy infrastructure. This is an inference from publicly retrievable transaction information. [Solana transaction RPC](https://solana.com/docs/rpc/http/gettransaction)

### D. Bound the GPS implementation — both reviewers

Terms such as “implausible movement” and “configurable” allow different interpretations and unnecessary work.

**Minimal fix:** a finite checklist, documented server constants/config, and agreed expected outcomes for normal, vehicle-like, noisy, and missing-data fixtures. No general verification engine or tuning UI.

### E. Ownership needs paths — reviewer 2

Conceptual ownership alone does not prevent four agents from colliding on scaffolding, routes, configuration, and fixtures.

**Minimal fix:** bootstrap once, then give each owner a directory/route prefix and identify shared contracts/fixtures. No separate architecture project is necessary.

### F. Demo choices and live evidence need clarity — both reviewers

The draft still offers a short window or seeded ended state. The goal and custody choice are also proposals. Agents may implement incompatible assumptions.

**Minimal fix:** choose one replayable scenario, resolve the proposed goal/custody once, and preserve explicit completion evidence: actual devnet deposit/payout signatures and an actual n8n execution. GPS fixtures may be synthetic.

Reviewer 1 additionally recommended assigning an operator to prepare and rehearse a verified UBC account, connected Strava account, funded devnet wallet, and deployed callbacks. This is a setup deliverable, not a new product feature.

## 12. Poor model behaviors identified in the original draft

| Pattern | Why it mattered | Direction taken |
| --- | --- | --- |
| Scope creep hidden behind optional upgrades | Anchor and GPS/other upgrades could consume integration time. | Remove speculative upgrades; retain GPS because the user explicitly requires it. |
| Arbitrary defaults treated as requirements | The fixed 5 km challenge came from the model. | Keep demo choices explicit and configurable in seed data. |
| Future roadmap inside active instructions | Unrequested future features can distract agents. | Remove roadmap implementation from scope. |
| Long independent build before integration | Four fast agents can produce incompatible modules quickly. | Bootstrap shared contracts and integrate working slices early. |
| Broad architecture autonomy | Agents could independently choose conflicting conventions. | Preserve internal autonomy within shared interfaces and ownership. |
| Repeated general slogans | Length hid unresolved decisions. | Prefer concrete invariants, handoffs, and completion evidence. |
| Privacy/moderation workaround growth | The public-profile and human-review design became excessive. | Remove it; keep private deterministic automation. |

Do not treat intentional features as mistakes merely because they require work. The user chose the community gate, stake economics, sponsor targets, and deterministic GPS checks. Coding throughput is not the primary reason to cut them.

## 13. Decisions still needed before parallel implementation

- Confirm the demo goal/aggregation rule and stake amount.
- Confirm treasury custody as the demo implementation.
- Choose the exercise window, funding cutoff, and final sync/submission cutoff.
- Define when and how the funded cohort and accepted progress are frozen.
- Choose one demo timing/reset scenario.
- Name the integration lead and assign concrete file/route ownership.
- Agree on the finite GPS checks, thresholds, and fixture expectations.
- Assign operator setup tasks and confirm actual service access.

These are decisions within the existing scope. This document does not resolve them by inventing requirements or authorize additional features.

## 14. Focused completion checks

- Verified UBC login, linked Strava account, and wallet connection.
- A real devnet deposit verified by the backend.
- Manual import with deterministic GPS checks and private progress.
- Normal, vehicle-like, noisy, missing-GPS, and sync-error scenarios.
- Repeated sync does not count distance twice.
- Unfunded membership cannot receive a payout.
- One account cannot read another's fitness data or tokens.
- Defined cutoff behavior and frozen settlement inputs.
- Some/all/no-success settlement cases, with correct accounting.
- Actual n8n execution and actual devnet payout/refund evidence.
- Settlement retries do not cause duplicate transfers.
- Labeled fixtures and an operator-prepared, rehearsed demo account.

Keep the final four hours for fixes, integration, rehearsal/recording, README, and submission. Do not silently count a mocked service as a working live integration.
