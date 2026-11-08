# @oathmile/core

Pure TypeScript logic for Oathmile: deterministic GPS checks, progress, and settlement math.
No network, no database, no UI. 28 unit tests.

| File | What it does | Who uses it |
|---|---|---|
| `src/gps.ts` | `checkActivity()` decides if a Strava activity counts, with reason codes | Activity |
| `src/progress.ts` | `computeProgress()` dedupes syncs and freezes at the sync cutoff | Activity, Finance |
| `src/settlement.ts` | `planSettlement()` turns frozen progress + verified deposits into payouts | Finance |
| `src/config.ts` | Every GPS threshold, documented | Everyone |
| `scripts/fetch-strava.ts` | Downloads your real activities for testing | Whoever runs the eval |
| `scripts/eval.ts` | Scores the GPS checks on real, labelled activities | Pitch slide |

## Drop it into the monorepo

Copy this folder to `packages/core/`, then:

```sh
pnpm install
pnpm --filter @oathmile/core test
```

In the Next.js app: add `"@oathmile/core": "workspace:*"` to its dependencies and
`transpilePackages: ["@oathmile/core"]` to `next.config`.

## How the app should call it

**Activity sync** (server only):

1. `GET /api/v3/activities/{id}` and `GET /api/v3/activities/{id}/streams?keys=time,latlng,distance&key_by_type=true`
2. Flatten streams: `{ time: s.time?.data, latlng: s.latlng?.data, distance: s.distance?.data }`
3. `checkActivity(activity, streams, { startsAt, endsAt })`
4. Store the result with `syncedAt`. Show `REASON_MESSAGES[code]` to the participant only.

If the Strava call fails (401, 403, 429, network), record a retryable sync error. Do not call
`checkActivity` with empty streams, or a permissions problem will look like `MISSING_GPS`.

**Settlement** (server only, triggered by n8n):

1. Load frozen `acceptedMeters` via `computeProgress(entries, syncCutoff)` per participant.
2. Load verified deposits (amount + confirmation time) per participant.
3. `planSettlement(...)`, then save the plan keyed by `challengeId` **before** sending anything.
4. Send each allocation, save each signature. If a send times out, check the chain for it before retrying.
5. If a plan already exists for the challenge, never create a second one.

## Test the checks on REAL activities (the RedFlag It lesson)

The unit tests use synthetic fixtures. They prove the code does what it says, not that it works on real
GPS. For the pitch, run the checks on real activities:

**Option A: Strava API.** Get a token for your own account:

1. Open (replace `YOUR_ID` with the app's client ID):
   `https://www.strava.com/oauth/authorize?client_id=YOUR_ID&response_type=code&redirect_uri=http://localhost/exchange_token&approval_prompt=force&scope=read,activity:read_all`
2. Approve, then copy `code=...` from the URL it redirects to (the page itself will fail to load; that's fine).
3. Exchange it:
   `curl -X POST https://www.strava.com/oauth/token -d client_id=YOUR_ID -d client_secret=YOUR_SECRET -d code=THE_CODE -d grant_type=authorization_code`
4. `STRAVA_ACCESS_TOKEN=<access_token> pnpm fetch:strava --max 40`

Each teammate who does this uses one of the app's athlete slots (1 by default, 10 after upgrading in
the Strava API settings page).

**Option B: GPX files.** On strava.com, open your own activity, choose "Export GPX", and save it into
`data/real/` as `run__name.gpx` or `notrun__name.gpx`. No API slots used.

Then:

1. Open every JSON file in `data/real/`, check `label` is right, set `"confirmed": true`.
   A "Run" that included a bus ride is `not_run`.
2. Record at least one real bus or car ride as a "Run" on Strava this weekend. Label it `not_run`.
3. `pnpm eval` prints a confusion matrix, precision, recall, F1 and Wilson 95% intervals, and
   writes `eval-results.md` for your slide.

Never add generated or made-up activities to `data/real/`.

## Thresholds (src/config.ts)

| Rule | Value | Why |
|---|---|---|
| Sport type | Per activity (see `ACTIVITY_PROFILES`): Run + TrailRun, TrailRun, Walk, Hike, Ride + GravelRide, MountainBikeRide, Swim, Rowing, Sail | Virtual and e-bike activities excluded |
| Minimum | 1 km and 5 min | Ignore accidental recordings |
| Spike filter | out-and-back jumps over 12 m/s | Drops single bad GPS points, not steady vehicle motion |
| Noisy track | over 5% spikes | Not enough clean evidence |
| GPS gap | over 60 s gap that moved over 200 m | GPS stopped while moving |
| Vehicle speed | any 60 s window over 7.0 m/s (about 25 km/h) | Bus, car, e-bike segments |
| Pace ceiling | average over 5.5 m/s (about 3:02/km) | Faster than we can verify; may reject elite runners |
| Distance mismatch | reported vs GPS track differs over 30% | Edited distances |

## Known limits (say these out loud if asked)

- A slow bike ride (about 18 km/h or less) uploaded as a run passes. There is a test that documents this.
- Someone else running with your phone passes. GPS proves a phone moved, not who carried it.
- Very fast runners (sub-3:02/km average) are rejected by the pace ceiling.

These are eligibility checks, not proof of cheating. Messages to participants say so.
