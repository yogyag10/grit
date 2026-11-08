/**
 * GPS eligibility thresholds. These are documented constants, not an admin UI.
 * Change them here, re-run `pnpm test` and `pnpm eval`, and note the change in the README.
 */
export interface GpsRules {
  /** Strava sport_type values that count as a run. */
  allowedSportTypes: readonly string[];
  /** A single activity must be at least this long to count. */
  minDistanceM: number;
  minDurationS: number;
  /** Fewer GPS samples than this = not enough evidence. */
  minSamples: number;
  /** A point that jumps out and back faster than this (m/s) is treated as a GPS spike and dropped. */
  spikeSpeedMps: number;
  /** If more than this fraction of points are spikes, the track is too noisy to verify. */
  maxSpikeFraction: number;
  /** A time gap longer than this (s) that also moved more than maxGapDisplacementM = GPS stopped while moving. */
  maxGapS: number;
  maxGapDisplacementM: number;
  /** Rolling window (s) used for sustained speed, so single spikes cannot trigger it. */
  vehicleWindowS: number;
  /** Any rolling window faster than this (m/s) = vehicle-like. 7.0 m/s is about 25 km/h. */
  vehicleSpeedMps: number;
  /** Whole-activity moving average faster than this (m/s) is not verifiable as a run. 5.5 m/s is about 3:02/km. */
  maxAvgSpeedMps: number;
  /** Optional floor on average moving speed to exclude walks. 0 disables it. */
  minAvgSpeedMps: number;
  /** Max relative difference between Strava's reported distance and the cleaned GPS track. */
  maxDistanceMismatch: number;
}

export const GPS_RULES: GpsRules = {
  allowedSportTypes: ["Run", "TrailRun"],
  minDistanceM: 1000,
  minDurationS: 300,
  minSamples: 30,
  spikeSpeedMps: 12,
  maxSpikeFraction: 0.05,
  maxGapS: 60,
  maxGapDisplacementM: 200,
  vehicleWindowS: 60,
  vehicleSpeedMps: 7.0,
  maxAvgSpeedMps: 5.5,
  minAvgSpeedMps: 0,
  maxDistanceMismatch: 0.3,
};

export const ACTIVITY_KINDS = ["run", "trail_run", "walk", "hike", "ride", "mountain_bike", "swim", "row", "sail"] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

export interface ActivityProfile {
  /** Shown on pact cards and chips. */
  label: string;
  /** Plain-language name for the rules list: "outdoor runs". */
  plural: string;
  /** Extra caution shown when creating or reading a pact. */
  note?: string;
  rules: GpsRules;
}

/**
 * Per-activity thresholds. Speeds are in m/s (7 m/s is about 25 km/h). The vehicle checks are only
 * as good as the speed gap between the activity and a car or motorboat, so they are loosest for
 * rides and sailing. Not tuned on real data yet: run `pnpm eval` before trusting a new activity.
 */
export const ACTIVITY_PROFILES: Record<ActivityKind, ActivityProfile> = {
  run: { label: "Run", plural: "outdoor runs", rules: GPS_RULES },
  trail_run: { label: "Trail run", plural: "outdoor trail runs", rules: { ...GPS_RULES, allowedSportTypes: ["TrailRun"] } },
  walk: {
    label: "Walk",
    plural: "outdoor walks",
    rules: { ...GPS_RULES, allowedSportTypes: ["Walk"], vehicleSpeedMps: 4.5, maxAvgSpeedMps: 2.8 },
  },
  hike: {
    label: "Hike",
    plural: "hikes",
    rules: { ...GPS_RULES, allowedSportTypes: ["Hike"], vehicleSpeedMps: 4.5, maxAvgSpeedMps: 2.8 },
  },
  ride: {
    label: "Ride",
    plural: "outdoor rides",
    note: "A fast ride and a car in town can look alike to a speed check.",
    rules: { ...GPS_RULES, allowedSportTypes: ["Ride", "GravelRide"], spikeSpeedMps: 30, vehicleSpeedMps: 15, maxAvgSpeedMps: 11 },
  },
  mountain_bike: {
    label: "Mountain bike",
    plural: "mountain bike rides",
    rules: { ...GPS_RULES, allowedSportTypes: ["MountainBikeRide"], spikeSpeedMps: 25, vehicleSpeedMps: 14, maxAvgSpeedMps: 8 },
  },
  swim: {
    label: "Swim",
    plural: "open-water swims",
    note: "Only open-water swims have GPS. Pool swims can't be verified.",
    rules: {
      ...GPS_RULES,
      allowedSportTypes: ["Swim"],
      minDistanceM: 250,
      spikeSpeedMps: 5,
      maxSpikeFraction: 0.15,
      maxGapS: 120,
      maxGapDisplacementM: 100,
      vehicleSpeedMps: 2.5,
      maxAvgSpeedMps: 1.8,
      maxDistanceMismatch: 0.35,
    },
  },
  row: {
    label: "Row",
    plural: "outdoor rows",
    note: "Indoor rowing has no GPS and can't be verified.",
    rules: { ...GPS_RULES, allowedSportTypes: ["Rowing"], spikeSpeedMps: 10, vehicleSpeedMps: 8, maxAvgSpeedMps: 6 },
  },
  sail: {
    label: "Sail",
    plural: "sails",
    note: "A speed check can't tell a sailboat from a motorboat.",
    rules: {
      ...GPS_RULES,
      allowedSportTypes: ["Sail"],
      minDistanceM: 2000,
      minDurationS: 600,
      spikeSpeedMps: 20,
      vehicleSpeedMps: 13,
      maxAvgSpeedMps: 9,
    },
  },
};

export const isActivityKind = (value: unknown): value is ActivityKind => ACTIVITY_KINDS.includes(value as ActivityKind);

/** Rules for a pact's activity; unknown values fall back to running so old pacts keep working. */
export function rulesFor(kind: string | null | undefined): GpsRules {
  return isActivityKind(kind) ? ACTIVITY_PROFILES[kind].rules : GPS_RULES;
}
