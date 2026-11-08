# @oathmile/core

Pure TypeScript logic for Grit's activity checks, progress tracking, and settlement calculations. The package has no network, database, or UI dependencies.

## Modules

| Module | Purpose |
| --- | --- |
| `src/gps.ts` | Check Strava activity eligibility and return reason codes |
| `src/config.ts` | Activity profiles and GPS thresholds |
| `src/progress.ts` | Deduplicate activity syncs and aggregate progress at the cutoff |
| `src/settlement.ts` | Calculate allocations from progress and verified deposits |
| `src/gpx.ts` | Convert GPX tracks into activity inputs |

The web app imports this package as `@oathmile/core`. Public exports are defined in [`src/index.ts`](src/index.ts).

## Checks

From the repository root:

```sh
pnpm --filter @oathmile/core typecheck
pnpm --filter @oathmile/core test
```

## Activity evaluation

The evaluation utilities accept Strava activities or GPX exports with confirmed labels.

```sh
STRAVA_ACCESS_TOKEN=<token> pnpm --filter @oathmile/core fetch:strava --max 40
pnpm --filter @oathmile/core eval
```

Store local samples under `data/real/` and confirm their labels before evaluating. Activity data and evaluation reports are gitignored. The evaluation prints a confusion matrix, precision, recall, F1, and confidence intervals.

GPS checks are eligibility heuristics: they cannot establish who carried a device or distinguish every form of transport. Activity-specific thresholds are defined in [`src/config.ts`](src/config.ts).
