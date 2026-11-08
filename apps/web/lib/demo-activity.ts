import { REASON_MESSAGES, type ReasonCode } from "@oathmile/core";
import type { ActivityView } from "./sync";

/**
 * Hard-coded Activity page for members of the demo pact, so the demo video has something to show.
 * These are fixtures, not real runs, and the page labels them as demo data.
 */
interface DemoRun {
  daysAgo: number;
  name: string;
  pact: string;
  km: number;
  reason?: ReasonCode;
}

interface DemoActivity {
  kept: number;
  total: number;
  earnedLamports: number;
  runs: DemoRun[];
}

const SPOT = { wreck: "Wreck Beach run", spirit: "Pacific Spirit trail run", banks: "Spanish Banks seawall run", rose: "UBC Rose Garden loop" } as const;
const DAY_MS = 86_400_000;

const PROFILES: DemoActivity[] = [
  {
    kept: 3,
    total: 4,
    earnedLamports: 210_000_000,
    runs: [
      { daysAgo: 1, name: "Morning run", pact: SPOT.wreck, km: 3.2 },
      { daysAgo: 3, name: "Evening run", pact: SPOT.spirit, km: 6.1 },
      { daysAgo: 5, name: "Lunch run", pact: SPOT.banks, km: 5.0 },
      { daysAgo: 8, name: "Afternoon ride", pact: SPOT.rose, km: 9.8, reason: "VEHICLE_SPEED" },
      { daysAgo: 9, name: "Morning run", pact: SPOT.wreck, km: 4.4 },
      { daysAgo: 15, name: "Evening run", pact: SPOT.spirit, km: 7.2 },
      { daysAgo: 16, name: "Easy run", pact: SPOT.rose, km: 5.5 },
      { daysAgo: 22, name: "Long run", pact: SPOT.banks, km: 10.1 },
    ],
  },
  {
    kept: 2,
    total: 3,
    earnedLamports: 120_000_000,
    runs: [
      { daysAgo: 0, name: "Morning run", pact: SPOT.spirit, km: 5.6 },
      { daysAgo: 2, name: "Evening run", pact: SPOT.wreck, km: 3.0 },
      { daysAgo: 4, name: "Tempo run", pact: SPOT.rose, km: 6.4 },
      { daysAgo: 9, name: "Lunch run", pact: SPOT.banks, km: 4.8 },
      { daysAgo: 10, name: "Evening run", pact: SPOT.spirit, km: 8.3 },
      { daysAgo: 17, name: "Morning run", pact: SPOT.wreck, km: 3.7 },
    ],
  },
  {
    kept: 4,
    total: 5,
    earnedLamports: 330_000_000,
    runs: [
      { daysAgo: 1, name: "Evening run", pact: SPOT.banks, km: 7.5 },
      { daysAgo: 2, name: "Morning run", pact: SPOT.wreck, km: 3.4 },
      { daysAgo: 6, name: "Long run", pact: SPOT.spirit, km: 12.2 },
      { daysAgo: 7, name: "Bus to campus", pact: SPOT.rose, km: 8.9, reason: "VEHICLE_SPEED" },
      { daysAgo: 10, name: "Lunch run", pact: SPOT.rose, km: 5.2 },
      { daysAgo: 13, name: "Evening run", pact: SPOT.wreck, km: 3.9 },
      { daysAgo: 20, name: "Morning run", pact: SPOT.spirit, km: 6.8 },
    ],
  },
  {
    kept: 1,
    total: 2,
    earnedLamports: 60_000_000,
    runs: [
      { daysAgo: 2, name: "Evening run", pact: SPOT.wreck, km: 3.1 },
      { daysAgo: 4, name: "Morning run", pact: SPOT.banks, km: 4.2 },
      { daysAgo: 8, name: "Lunch run", pact: SPOT.spirit, km: 5.9 },
      { daysAgo: 12, name: "Easy run", pact: SPOT.rose, km: 4.0 },
      { daysAgo: 19, name: "Evening run", pact: SPOT.wreck, km: 6.6 },
    ],
  },
];

/** Position of the user among the demo pact's members by join order, or -1 if they aren't one. */
export function demoMemberIndex(members: { user_id: string; joined_at: string }[], userId: string): number {
  return [...members].sort((a, b) => a.joined_at.localeCompare(b.joined_at) || a.user_id.localeCompare(b.user_id)).findIndex((m) => m.user_id === userId);
}

export function demoActivityFor(index: number, now = new Date()) {
  const profile = PROFILES[index % PROFILES.length];
  const recent = profile.runs.map((r, i): ActivityView & { pact: string } => ({
    id: `demo-${index}-${i}`,
    name: r.name,
    startDate: new Date(now.getTime() - r.daysAgo * DAY_MS).toISOString(),
    sportType: "Run",
    verdict: r.reason ? "rejected" : "accepted",
    acceptedMeters: r.reason ? 0 : Math.round(r.km * 1000),
    counted: !r.reason,
    late: false,
    reasons: r.reason ? [{ code: r.reason, message: REASON_MESSAGES[r.reason] }] : [],
    pact: r.pact,
  }));
  const counted = recent.filter((a) => a.counted);
  return {
    recent,
    countedRuns: counted.length,
    countedMeters: counted.reduce((sum, a) => sum + a.acceptedMeters, 0),
    runDates: counted.map((a) => a.startDate),
    kept: profile.kept,
    total: profile.total,
    earnedLamports: profile.earnedLamports,
  };
}
