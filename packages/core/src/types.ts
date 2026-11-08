/** Subset of Strava's SummaryActivity that the checks need. */
export interface StravaActivity {
  id: number | string;
  sport_type?: string;
  type?: string;
  manual: boolean;
  trainer?: boolean;
  /** ISO 8601 UTC, e.g. "2026-11-07T18:00:00Z" */
  start_date: string;
  /** Seconds */
  elapsed_time: number;
  moving_time?: number;
  /** Meters, as reported by Strava */
  distance: number;
}

/** Strava activity streams, flattened (use `key_by_type=true` and take `.data`). */
export interface ActivityStreams {
  /** Seconds since activity start */
  time?: number[];
  /** [lat, lng] pairs */
  latlng?: [number, number][];
  distance?: number[];
}

export interface ChallengeWindow {
  /** ISO 8601 UTC */
  startsAt: string;
  endsAt: string;
}

export const REASON_CODES = [
  "WRONG_SPORT_TYPE",
  "MANUAL_ENTRY",
  "OUTSIDE_WINDOW",
  "TOO_SHORT",
  "MISSING_GPS",
  "GPS_GAP",
  "NOISY_GPS",
  "VEHICLE_SPEED",
  "IMPLAUSIBLE_PACE",
  "TOO_SLOW",
  "DISTANCE_MISMATCH",
] as const;
export type ReasonCode = (typeof REASON_CODES)[number];

/** Participant-facing text. These describe eligibility, not proven cheating. */
export const REASON_MESSAGES: Record<ReasonCode, string> = {
  WRONG_SPORT_TYPE: "Only outdoor runs count toward this pact.",
  MANUAL_ENTRY: "Manually entered activities don't count. Record runs with GPS.",
  OUTSIDE_WINDOW: "This activity happened outside the pact dates.",
  TOO_SHORT: "Each run needs to be at least 1 km and 5 minutes.",
  MISSING_GPS: "We couldn't find usable GPS data for this activity.",
  GPS_GAP: "GPS stopped while you were moving, so we can't verify this run.",
  NOISY_GPS: "The GPS signal was too noisy to verify this run.",
  VEHICLE_SPEED: "Part of this activity moved at vehicle speed.",
  IMPLAUSIBLE_PACE: "The average pace is faster than we can verify for a run.",
  TOO_SLOW: "The average pace is slower than this pact's running minimum.",
  DISTANCE_MISMATCH: "The recorded distance doesn't match the GPS track.",
};

export interface CheckMetrics {
  samples: number;
  spikesRemoved: number;
  spikeFraction: number;
  reportedMeters: number;
  cleanPathMeters: number;
  avgMovingSpeedMps: number;
  maxWindowSpeedMps: number;
  largestGapS: number;
}

export interface CheckResult {
  activityId: string;
  verdict: "accepted" | "rejected";
  reasons: ReasonCode[];
  /** 0 unless accepted. Conservative: min(reported, cleaned GPS track). */
  acceptedMeters: number;
  metrics: CheckMetrics;
}
