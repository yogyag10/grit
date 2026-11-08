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
