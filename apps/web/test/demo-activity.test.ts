import { describe, expect, it } from "vitest";
import { demoActivityFor, demoMemberIndex } from "../lib/demo-activity";
import { weeklyStreak } from "../lib/streak";

describe("demo activity page", () => {
  const now = new Date("2026-11-08T20:00:00Z");
  it("finds a member's place by join order", () => {
    const members = [
      { user_id: "b", joined_at: "2026-11-08T02:00:00Z" },
      { user_id: "a", joined_at: "2026-11-08T01:00:00Z" },
    ];
    expect(demoMemberIndex(members, "a")).toBe(0);
    expect(demoMemberIndex(members, "b")).toBe(1);
    expect(demoMemberIndex(members, "z")).toBe(-1);
  });
  it("gives every profile runs, kilometres, kept pacts and a streak", () => {
    for (let i = 0; i < 4; i++) {
      const d = demoActivityFor(i, now);
      expect(d.countedRuns).toBeGreaterThan(0);
      expect(d.countedMeters).toBeGreaterThan(0);
      expect(d.kept).toBeLessThanOrEqual(d.total);
      expect(weeklyStreak(d.runDates, now)).toBeGreaterThan(0);
      expect(d.recent.every((a) => a.counted === (a.verdict === "accepted"))).toBe(true);
    }
  });
});
