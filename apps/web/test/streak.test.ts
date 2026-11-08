import { describe, expect, it } from "vitest";
import { weekStart, weeklyRuns, weeklyStreak } from "../lib/streak";

// Nov 7 2026 is a Saturday; its Vancouver week starts Monday Nov 2.
const NOW = new Date("2026-11-07T20:00:00Z");

describe("weekly streak", () => {
  it("starts weeks on Monday in Vancouver time", () => {
    expect(weekStart(new Date("2026-11-02T09:00:00Z"))).toBe(Date.UTC(2026, 10, 2));
    expect(weekStart(new Date("2026-11-08T05:00:00Z"))).toBe(Date.UTC(2026, 10, 2)); // still Saturday night in Vancouver
    expect(weekStart(new Date("2026-11-09T09:00:00Z"))).toBe(Date.UTC(2026, 10, 9));
  });
  it("is zero with no runs", () => expect(weeklyStreak([], NOW)).toBe(0));
  it("counts this week and the weeks before it", () => {
    expect(weeklyStreak(["2026-11-05T18:00:00Z", "2026-10-28T18:00:00Z", "2026-10-21T18:00:00Z"], NOW)).toBe(3);
  });
  it("keeps last week's streak while this week is still open", () => {
    expect(weeklyStreak(["2026-10-28T18:00:00Z", "2026-10-21T18:00:00Z"], NOW)).toBe(2);
  });
  it("breaks on a missed week", () => {
    expect(weeklyStreak(["2026-11-05T18:00:00Z", "2026-10-21T18:00:00Z"], NOW)).toBe(1);
  });
  it("lists five weeks ending this week", () => {
    const cells = weeklyRuns(["2026-11-03T18:00:00Z", "2026-11-04T18:00:00Z", "2026-10-28T18:00:00Z"], NOW);
    expect(cells.map((c) => c.runs)).toEqual([0, 0, 0, 1, 2]);
    expect(cells[4].current).toBe(true);
  });
});
