import { GPS_RULES, type GpsRules } from "./config";
import { haversineM } from "./geo";
import {
  REASON_CODES,
  type ActivityStreams,
  type ChallengeWindow,
  type CheckMetrics,
  type CheckResult,
  type ReasonCode,
  type StravaActivity,
} from "./types";

interface Point {
  t: number;
  p: [number, number];
}

/**
 * Deterministic, non-ML eligibility check for one Strava activity.
 *
 * Same input always gives the same output. Every failed rule is reported (not just the first),
 * so the participant sees all reasons. API/auth/network failures must be handled by the caller
 * as retryable sync errors; this function only judges data it was given.
 */
export function checkActivity(
  activity: StravaActivity,
  streams: ActivityStreams | null | undefined,
  window: ChallengeWindow,
  rules: GpsRules = GPS_RULES,
): CheckResult {
  const reasons = new Set<ReasonCode>();
  const reportedMeters = Number.isFinite(activity.distance) ? activity.distance : 0;

  // 1. Activity-level rules
  const sport = activity.sport_type ?? activity.type ?? "Unknown";
  if (!rules.allowedSportTypes.includes(sport)) reasons.add("WRONG_SPORT_TYPE");
  if (activity.manual) reasons.add("MANUAL_ENTRY");

  const startMs = Date.parse(activity.start_date);
  const endMs = startMs + activity.elapsed_time * 1000;
  if (
    !Number.isFinite(startMs) ||
    startMs < Date.parse(window.startsAt) ||
    endMs > Date.parse(window.endsAt)
  ) {
    reasons.add("OUTSIDE_WINDOW");
  }
  if (reportedMeters < rules.minDistanceM || activity.elapsed_time < rules.minDurationS) {
    reasons.add("TOO_SHORT");
  }

  // 2. GPS evidence
  const raw = readTrack(streams);
  const metrics: CheckMetrics = {
    samples: raw?.length ?? 0,
    spikesRemoved: 0,
    spikeFraction: 0,
    reportedMeters,
    cleanPathMeters: 0,
    avgMovingSpeedMps: 0,
    maxWindowSpeedMps: 0,
    largestGapS: 0,
  };

  if (!raw || raw.length < rules.minSamples) {
    reasons.add("MISSING_GPS");
    return finish(activity, reasons, metrics);
  }

  // 3. Drop isolated out-and-back spikes (GPS noise), keep consistent fast motion (vehicles).
  const keep = raw.map(() => true);
  for (let i = 1; i < raw.length - 1; i++) {
    const a = raw[i - 1], b = raw[i], c = raw[i + 1];
    const vIn = haversineM(a.p, b.p) / Math.max(b.t - a.t, 1);
    const vOut = haversineM(b.p, c.p) / Math.max(c.t - b.t, 1);
    const vAcross = haversineM(a.p, c.p) / Math.max(c.t - a.t, 1);
    if (vIn > rules.spikeSpeedMps && vOut > rules.spikeSpeedMps && vAcross <= rules.spikeSpeedMps) {
      keep[i] = false;
    }
  }
  const pts = raw.filter((_, i) => keep[i]);
  metrics.spikesRemoved = raw.length - pts.length;
  metrics.spikeFraction = metrics.spikesRemoved / raw.length;
  if (metrics.spikeFraction > rules.maxSpikeFraction) reasons.add("NOISY_GPS");

  // 4. Segment pass: path distance, moving speed, gaps
  const cum: number[] = [0];
  let movingDist = 0;
  let movingTime = 0;
  for (let i = 1; i < pts.length; i++) {
    const dt = pts[i].t - pts[i - 1].t;
    const d = haversineM(pts[i - 1].p, pts[i].p);
    cum.push(cum[i - 1] + d);
    metrics.largestGapS = Math.max(metrics.largestGapS, dt);
    if (dt > rules.maxGapS) {
      if (d > rules.maxGapDisplacementM) reasons.add("GPS_GAP");
    } else {
      movingDist += d;
      movingTime += dt;
    }
  }
  metrics.cleanPathMeters = cum[cum.length - 1];
  metrics.avgMovingSpeedMps = movingTime > 0 ? movingDist / movingTime : 0;

  // 5. Sustained speed over rolling windows of at least vehicleWindowS seconds
  let left = 0;
  for (let right = 1; right < pts.length; right++) {
    while (left + 1 < right && pts[right].t - pts[left + 1].t >= rules.vehicleWindowS) left++;
    const span = pts[right].t - pts[left].t;
    if (span >= rules.vehicleWindowS) {
      metrics.maxWindowSpeedMps = Math.max(metrics.maxWindowSpeedMps, (cum[right] - cum[left]) / span);
    }
  }
  if (metrics.maxWindowSpeedMps > rules.vehicleSpeedMps) reasons.add("VEHICLE_SPEED");

  // 6. Whole-activity pace and distance consistency
  if (metrics.avgMovingSpeedMps > rules.maxAvgSpeedMps) reasons.add("IMPLAUSIBLE_PACE");
  if (rules.minAvgSpeedMps > 0 && metrics.avgMovingSpeedMps < rules.minAvgSpeedMps) reasons.add("TOO_SLOW");
  if (
    reportedMeters > 0 &&
    Math.abs(metrics.cleanPathMeters - reportedMeters) / reportedMeters > rules.maxDistanceMismatch
  ) {
    reasons.add("DISTANCE_MISMATCH");
  }

  return finish(activity, reasons, metrics);
}

function finish(activity: StravaActivity, reasons: Set<ReasonCode>, metrics: CheckMetrics): CheckResult {
  const ordered = REASON_CODES.filter((r) => reasons.has(r));
  const accepted = ordered.length === 0;
  return {
    activityId: String(activity.id),
    verdict: accepted ? "accepted" : "rejected",
    reasons: ordered,
    acceptedMeters: accepted ? Math.floor(Math.min(metrics.reportedMeters, metrics.cleanPathMeters)) : 0,
    metrics: {
      ...metrics,
      cleanPathMeters: round(metrics.cleanPathMeters, 1),
      avgMovingSpeedMps: round(metrics.avgMovingSpeedMps, 3),
      maxWindowSpeedMps: round(metrics.maxWindowSpeedMps, 3),
      spikeFraction: round(metrics.spikeFraction, 4),
    },
  };
}

/** Validates and zips the time and latlng streams. Returns null if they are unusable. */
function readTrack(streams: ActivityStreams | null | undefined): Point[] | null {
  const time = streams?.time;
  const latlng = streams?.latlng;
  if (!Array.isArray(time) || !Array.isArray(latlng) || time.length !== latlng.length || time.length === 0) {
    return null;
  }
  const pts: Point[] = [];
  for (let i = 0; i < time.length; i++) {
    const t = time[i];
    const p = latlng[i];
    if (
      !Number.isFinite(t) ||
      (i > 0 && t < time[i - 1]) ||
      !Array.isArray(p) ||
      !Number.isFinite(p[0]) ||
      !Number.isFinite(p[1]) ||
      Math.abs(p[0]) > 90 ||
      Math.abs(p[1]) > 180
    ) {
      return null;
    }
    pts.push({ t, p: [p[0], p[1]] });
  }
  return pts;
}

const round = (x: number, digits: number) => Math.round(x * 10 ** digits) / 10 ** digits;
