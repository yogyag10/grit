/**
 * Downloads YOUR OWN recent Strava activities + GPS streams into data/real/ for labelling.
 *
 *   STRAVA_ACCESS_TOKEN=... pnpm fetch:strava [--max 60] [--out data/real]
 *
 * Needs a token with activity:read_all (see README, "Get a token"). Each file is written with a
 * GUESSED label from Strava's sport type. A human must open each file and confirm or fix the label,
 * e.g. a "Run" that included a bus ride is "not_run". Set "confirmed": true when checked.
 *
 * NOTE: untested against the live API from the environment this was written in (no network access
 * to strava.com there). Run it once and fix anything that breaks.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const API = "https://www.strava.com/api/v3";
const token = process.env.STRAVA_ACCESS_TOKEN;
const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const max = Number(arg("max", "60"));
const outDir = arg("out", "data/real");

if (!token) {
  console.error("Set STRAVA_ACCESS_TOKEN first (see README).");
  process.exit(1);
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 429) throw new Error("Strava rate limit hit (429). Wait 15 minutes and re-run with a smaller --max.");
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${path}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

interface Summary {
  id: number;
  name: string;
  sport_type: string;
  manual: boolean;
  trainer: boolean;
  start_date: string;
  elapsed_time: number;
  moving_time: number;
  distance: number;
}
type StreamSet = Record<string, { data: unknown[] }>;

const RUN_TYPES = new Set(["Run", "TrailRun"]);

async function main() {
  await mkdir(outDir, { recursive: true });
  const activities: Summary[] = [];
  for (let page = 1; activities.length < max; page++) {
    const batch = await get<Summary[]>(`/athlete/activities?per_page=${Math.min(100, max)}&page=${page}`);
    if (batch.length === 0) break;
    activities.push(...batch);
  }
  const chosen = activities.slice(0, max);
  console.log(`Fetching streams for ${chosen.length} activities...`);

  let written = 0;
  for (const a of chosen) {
    let streams: StreamSet = {};
    try {
      streams = await get<StreamSet>(`/activities/${a.id}/streams?keys=time,latlng,distance&key_by_type=true`);
    } catch (err) {
      console.warn(`  ${a.id} (${a.name}): no streams (${(err as Error).message.slice(0, 80)})`);
    }
    const file = {
      label: RUN_TYPES.has(a.sport_type) ? "run" : "not_run",
      confirmed: false,
      note: `${a.sport_type}: ${a.name}`,
      activity: {
        id: a.id,
        sport_type: a.sport_type,
        manual: a.manual,
        trainer: a.trainer,
        start_date: a.start_date,
        elapsed_time: a.elapsed_time,
        moving_time: a.moving_time,
        distance: a.distance,
      },
      streams: {
        time: streams.time?.data ?? [],
        latlng: streams.latlng?.data ?? [],
        distance: streams.distance?.data ?? [],
      },
    };
    await writeFile(join(outDir, `${a.id}.json`), JSON.stringify(file));
    written++;
  }
  console.log(`Wrote ${written} files to ${outDir}. Now confirm each label by hand, then run: pnpm eval`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
