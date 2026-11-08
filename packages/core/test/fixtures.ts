/**
 * SYNTHETIC, LABELLED TEST FIXTURES.
 * These are generated tracks for unit tests only. They do not show that the checks work on real
 * activities; use `pnpm fetch:strava` + `pnpm eval` on real data for that.
 */
import type { ActivityStreams, ChallengeWindow, StravaActivity } from "../src/types";

export const WINDOW: ChallengeWindow = { startsAt: "2026-11-07T00:00:00Z", endsAt: "2026-11-15T00:00:00Z" };
const START = "2026-11-07T18:00:00Z";
const UBC: [number, number] = [49.2606, -123.246];
const M_PER_DEG_LAT = 111_320;

export type Segment =
  | { kind: "move"; speedMps: number; durationS: number }
  | { kind: "gap"; durationS: number; displacementM: number };

export interface TrackOptions {
  sampleS?: number;
  /** Slow sideways wobble in meters, to look a bit like real GPS */
  wobbleM?: number;
  start?: string;
  id?: string;
}

/** Builds a northward track from a list of segments. Reported distance = true distance moved. */
export function makeTrack(segments: Segment[], opts: TrackOptions = {}): { activity: StravaActivity; streams: ActivityStreams } {
  const sampleS = opts.sampleS ?? 2;
  const wobbleM = opts.wobbleM ?? 1.5;
  const mPerDegLng = M_PER_DEG_LAT * Math.cos((UBC[0] * Math.PI) / 180);
  const time: number[] = [0];
  const north: number[] = [0];
  let t = 0;
  let n = 0;

  for (const seg of segments) {
    if (seg.kind === "gap") {
      t += seg.durationS;
      n += seg.displacementM;
      time.push(t);
      north.push(n);
      continue;
    }
    const steps = Math.round(seg.durationS / sampleS);
    for (let i = 0; i < steps; i++) {
      t += sampleS;
      n += seg.speedMps * sampleS;
      time.push(t);
      north.push(n);
    }
  }

  const latlng = time.map((ti, i) => {
    const east = wobbleM * Math.sin(ti / 45);
    return [UBC[0] + north[i] / M_PER_DEG_LAT, UBC[1] + east / mPerDegLng] as [number, number];
  });

  return {
    activity: {
      id: opts.id ?? "fixture",
      sport_type: "Run",
      manual: false,
      start_date: opts.start ?? START,
      elapsed_time: t,
      distance: north[north.length - 1],
    },
    streams: { time, latlng },
  };
}

/** Moves every `everyN`-th point sideways by `sizeM` meters (out-and-back spikes). */
export function addSpikes(streams: ActivityStreams, everyN: number, sizeM: number): ActivityStreams {
  const mPerDegLng = M_PER_DEG_LAT * Math.cos((UBC[0] * Math.PI) / 180);
  return {
    ...streams,
    latlng: streams.latlng!.map((p, i) => (i > 0 && i % everyN === 0 ? [p[0], p[1] + sizeM / mPerDegLng] : p)),
  };
}

/** 5:30/km easy run */
export const run = (km: number, opts?: TrackOptions) =>
  makeTrack([{ kind: "move", speedMps: 1000 / 330, durationS: km * 330 }], opts);
