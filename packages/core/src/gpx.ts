import { haversineM } from "./geo";
import type { ActivityStreams, StravaActivity } from "./types";

/**
 * Minimal GPX reader for activities exported from Strava ("Export GPX" on your own activity page).
 * Used by the eval script so teammates can test the checks on real past activities.
 * Returns a Run-typed activity because the eval asks: "if this had been submitted as a run,
 * would the GPS checks accept it?"
 */
export function gpxToActivity(gpx: string, id: string): { activity: StravaActivity; streams: ActivityStreams } {
  const trkpt = /<trkpt\b[^>]*?\blat="([-\d.]+)"[^>]*?\blon="([-\d.]+)"[^>]*>([\s\S]*?)<\/trkpt>/g;
  const trkptLonFirst = /<trkpt\b[^>]*?\blon="([-\d.]+)"[^>]*?\blat="([-\d.]+)"[^>]*>([\s\S]*?)<\/trkpt>/g;
  const points: { lat: number; lon: number; ms: number }[] = [];

  const collect = (re: RegExp, latFirst: boolean) => {
    for (const m of gpx.matchAll(re)) {
      const time = /<time>([^<]+)<\/time>/.exec(m[3]);
      if (!time) continue;
      const lat = Number(latFirst ? m[1] : m[2]);
      const lon = Number(latFirst ? m[2] : m[1]);
      points.push({ lat, lon, ms: Date.parse(time[1]) });
    }
  };
  collect(trkpt, true);
  if (points.length === 0) collect(trkptLonFirst, false);
  if (points.length === 0) throw new Error(`no timed track points found in GPX ${id}`);

  const t0 = points[0].ms;
  const latlng = points.map((p) => [p.lat, p.lon] as [number, number]);
  const time = points.map((p) => Math.round((p.ms - t0) / 1000));
  let distance = 0;
  for (let i = 1; i < latlng.length; i++) distance += haversineM(latlng[i - 1], latlng[i]);

  return {
    activity: {
      id,
      sport_type: "Run",
      manual: false,
      start_date: new Date(t0).toISOString(),
      elapsed_time: time[time.length - 1],
      distance,
    },
    streams: { time, latlng },
  };
}
