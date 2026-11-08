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
