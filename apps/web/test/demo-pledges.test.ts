import { describe, expect, it } from "vitest";
import { demoCleared, demoPledges } from "../lib/demo-pledges";

const demo = { id: "10000000-0000-4000-8000-0000000000d0", is_demo: true, goal_meters: 3000 };

describe("demo crowd", () => {
  it("is 22 fixed people on a demo pact and nobody on a real one", () => {
    expect(demoPledges(demo)).toHaveLength(22);
    expect(demoPledges({ ...demo, is_demo: false })).toEqual([]);
  });
  it("is the same every time, with distances capped at the goal", () => {
    expect(demoPledges(demo)).toEqual(demoPledges(demo));
    expect(Math.max(...demoPledges(demo).map((p) => p.meters))).toBe(3000);
  });
  it("counts the people who reached the goal", () => {
    expect(demoCleared(demo)).toBe(demoPledges(demo).filter((p) => p.meters === 3000).length);
    expect(demoCleared(demo)).toBeGreaterThan(0);
  });
});

import { demoMemberMeters } from "../lib/demo-pledges";

describe("demo member distances", () => {
  const members = [
    { user_id: "c", joined_at: "2026-11-08T03:00:00Z" },
    { user_id: "a", joined_at: "2026-11-08T01:00:00Z" },
    { user_id: "b", joined_at: "2026-11-08T02:00:00Z" },
    { user_id: "d", joined_at: "2026-11-08T04:00:00Z" },
  ];
  it("gives each real member a fixed distance by join order, capped at the goal", () => {
    const m = demoMemberMeters({ is_demo: true, goal_meters: 3000 }, members);
    expect([m.get("a"), m.get("b"), m.get("c"), m.get("d")]).toEqual([3000, 2000, 3000, 1500]);
  });
  it("does nothing on a real pact", () => {
    expect(demoMemberMeters({ is_demo: false, goal_meters: 3000 }, members).size).toBe(0);
  });
});
