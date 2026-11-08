/**
 * Runs the GPS checks over REAL, human-labelled activities and reports how well they work.
 *
 *   pnpm eval [--dir data/real] [--as-recorded] [--out eval-results.md]
 *
 * Inputs in --dir:
 *   *.json  from `pnpm fetch:strava` (label: "run" | "not_run", confirmed: true)
 *   *.gpx   exported from Strava; name them run__anything.gpx or notrun__anything.gpx
 *
 * By default every activity is checked AS IF it had been submitted as a GPS run inside the pact
 * window, so we measure the GPS rules alone: "would we catch a bike or bus ride uploaded as a run,
 * and would we wrongly reject real runs?" Use --as-recorded to apply sport type/manual/window too.
 *
 * Positive class = "not a real run" (what the checks are trying to catch).
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { checkActivity } from "../src/gps";
import { gpxToActivity } from "../src/gpx";
import type { ActivityStreams, CheckResult, StravaActivity } from "../src/types";

const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const dir = arg("dir", "data/real");
const outPath = arg("out", "eval-results.md");
const asRecorded = process.argv.includes("--as-recorded");
const OPEN_WINDOW = { startsAt: "1970-01-01T00:00:00Z", endsAt: "2100-01-01T00:00:00Z" };

type Label = "run" | "not_run";
interface Row {
  file: string;
  label: Label;
  note: string;
  result: CheckResult;
}

function wilson(k: number, n: number, z = 1.96): [number, number] {
  if (n === 0) return [NaN, NaN];
  const p = k / n;
  const denom = 1 + (z * z) / n;
  const center = (p + (z * z) / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denom;
  return [Math.max(0, center - half), Math.min(1, center + half)];
}
const pct = (x: number) => (Number.isFinite(x) ? `${(100 * x).toFixed(1)}%` : "n/a");
const rate = (k: number, n: number) => {
  const [lo, hi] = wilson(k, n);
  return `${k}/${n} = ${pct(n ? k / n : NaN)} (95% CI ${pct(lo)} to ${pct(hi)})`;
};

async function main() {
  const files = (await readdir(dir)).filter((f) => f.endsWith(".json") || f.endsWith(".gpx")).sort();
  const rows: Row[] = [];
  const unconfirmed: string[] = [];

  for (const file of files) {
    const text = await readFile(join(dir, file), "utf8");
    let label: Label;
    let note = "";
    let activity: StravaActivity;
    let streams: ActivityStreams;

    if (file.endsWith(".gpx")) {
      if (file.startsWith("run__")) label = "run";
      else if (file.startsWith("notrun__")) label = "not_run";
      else {
        console.warn(`skipping ${file}: name it run__*.gpx or notrun__*.gpx`);
        continue;
      }
      ({ activity, streams } = gpxToActivity(text, file));
      note = "GPX export";
    } else {
      const parsed = JSON.parse(text);
      if (parsed.label !== "run" && parsed.label !== "not_run") {
        console.warn(`skipping ${file}: label must be "run" or "not_run"`);
        continue;
      }
      if (parsed.confirmed !== true) unconfirmed.push(file);
      label = parsed.label;
      note = parsed.note ?? "";
      activity = parsed.activity;
      streams = parsed.streams;
    }

    const toCheck: StravaActivity = asRecorded ? activity : { ...activity, sport_type: "Run", manual: false };
    rows.push({ file, label, note, result: checkActivity(toCheck, streams, OPEN_WINDOW) });
  }

  if (rows.length === 0) {
    console.error(`No labelled activities found in ${dir}.`);
    process.exit(1);
  }

  const notRuns = rows.filter((r) => r.label === "not_run");
  const runs = rows.filter((r) => r.label === "run");
  const tp = notRuns.filter((r) => r.result.verdict === "rejected").length; // caught
  const fn = notRuns.length - tp; // slipped through
  const fp = runs.filter((r) => r.result.verdict === "rejected").length; // real run wrongly rejected
  const tn = runs.length - fp;
  const precision = tp + fp ? tp / (tp + fp) : NaN;
  const recall = tp + fn ? tp / (tp + fn) : NaN;
  const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : NaN;
  const accuracy = (tp + tn) / rows.length;

  const lines: string[] = [];
  lines.push(`# Oathmile GPS check evaluation`);
  lines.push("");
  lines.push(`Real, human-labelled activities: **${rows.length}** (${runs.length} real runs, ${notRuns.length} not runs).`);
  lines.push(asRecorded ? "Mode: as recorded (all rules)." : "Mode: every activity checked as if submitted as a GPS run (GPS rules only).");
  lines.push("");
  lines.push(`| | Rejected | Accepted |`);
  lines.push(`|---|---|---|`);
  lines.push(`| Not a real run | ${tp} (caught) | ${fn} (missed) |`);
  lines.push(`| Real run | ${fp} (wrongly rejected) | ${tn} (correct) |`);
  lines.push("");
  lines.push(`- Catch rate (recall) on non-runs: ${rate(tp, tp + fn)}`);
  lines.push(`- False rejection rate on real runs: ${rate(fp, fp + tn)}`);
  lines.push(`- Precision: ${pct(precision)}, F1: ${pct(f1)}, Accuracy: ${pct(accuracy)}`);
  lines.push("");
  lines.push(`Small samples give wide intervals. Report them as they are.`);
  lines.push("");
  lines.push(`## Mistakes`);
  const mistakes = rows.filter((r) => (r.label === "run") !== (r.result.verdict === "accepted"));
  if (mistakes.length === 0) lines.push("None.");
  for (const r of mistakes) {
    lines.push(`- ${r.file} (${r.note}): labelled ${r.label}, got ${r.result.verdict} [${r.result.reasons.join(", ") || "no reasons"}]; ` +
      `avg ${r.result.metrics.avgMovingSpeedMps} m/s, max 60s window ${r.result.metrics.maxWindowSpeedMps} m/s`);
  }
  lines.push("");
  lines.push(`## All activities`);
  lines.push(`| File | Label | Verdict | Reasons | Avg m/s | Max window m/s |`);
  lines.push(`|---|---|---|---|---|---|`);
  for (const r of rows) {
    lines.push(`| ${r.file} | ${r.label} | ${r.result.verdict} | ${r.result.reasons.join(", ")} | ${r.result.metrics.avgMovingSpeedMps} | ${r.result.metrics.maxWindowSpeedMps} |`);
  }

  const report = lines.join("\n");
  await writeFile(outPath, report + "\n");
  console.log(report);
  if (unconfirmed.length) {
    console.warn(`\nWARNING: ${unconfirmed.length} file(s) still have guessed labels (confirmed != true). Check them before quoting these numbers.`);
  }
  console.log(`\nSaved to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
