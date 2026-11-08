import { describe, expect, it } from "vitest";
import { ACTIVITY_KINDS, ACTIVITY_PROFILES, rulesFor } from "../src/config";
import { checkActivity } from "../src/gps";
import { makeTrack, WINDOW } from "./fixtures";

/** SYNTHETIC tracks: they test the per-activity thresholds, not real-world accuracy. */
function track(sport: string, speedMps: number, durationS: number) {
  const { activity, streams } = makeTrack([{ kind: "move", speedMps, durationS }]);
  return { activity: { ...activity, sport_type: sport }, streams };
}

describe("per-activity rules", () => {
  it("has a profile for every kind and falls back to running for unknown values", () => {
    for (const kind of ACTIVITY_KINDS) expect(rulesFor(kind)).toBe(ACTIVITY_PROFILES[kind].rules);
    expect(rulesFor("nonsense")).toBe(ACTIVITY_PROFILES.run.rules);
    expect(rulesFor(null)).toBe(ACTIVITY_PROFILES.run.rules);
  });

  it("accepts a steady ride under ride rules but calls it vehicle speed under run rules", () => {
    const { activity, streams } = track("Ride", 8, 900); // 28.8 km/h
    expect(checkActivity(activity, streams, WINDOW, rulesFor("ride")).verdict).toBe("accepted");
    expect(checkActivity({ ...activity, sport_type: "Run" }, streams, WINDOW, rulesFor("run")).reasons).toContain("VEHICLE_SPEED");
  });

  it("rejects car speed on a ride", () => {
    const { activity, streams } = track("Ride", 20, 600); // 72 km/h
    expect(checkActivity(activity, streams, WINDOW, rulesFor("ride")).reasons).toContain("VEHICLE_SPEED");
  });

  it("only counts the sport type the pact asks for", () => {
    const { activity, streams } = track("Run", 3, 900);
    expect(checkActivity(activity, streams, WINDOW, rulesFor("ride")).reasons).toContain("WRONG_SPORT_TYPE");
    expect(checkActivity({ ...activity, sport_type: "TrailRun" }, streams, WINDOW, rulesFor("trail_run")).verdict).toBe("accepted");
    expect(checkActivity({ ...activity, sport_type: "Run" }, streams, WINDOW, rulesFor("trail_run")).reasons).toContain("WRONG_SPORT_TYPE");
  });

  it("walks and hikes reject running pace", () => {
    const { activity, streams } = track("Walk", 4, 900); // 14 km/h
    expect(checkActivity(activity, streams, WINDOW, rulesFor("walk")).reasons).toContain("IMPLAUSIBLE_PACE");
    const slow = track("Hike", 1.3, 1500);
    expect(checkActivity(slow.activity, slow.streams, WINDOW, rulesFor("hike")).verdict).toBe("accepted");
  });

  it("accepts a slow open-water swim and a 600 m one is long enough only for swims", () => {
    const { activity, streams } = track("Swim", 1.0, 600); // 600 m in 10 min
    expect(checkActivity(activity, streams, WINDOW, rulesFor("swim")).verdict).toBe("accepted");
    expect(checkActivity({ ...activity, sport_type: "Run" }, streams, WINDOW, rulesFor("run")).reasons).toContain("TOO_SHORT");
  });

  it("accepts a rowing session and a sail at plausible speeds", () => {
    const row = track("Rowing", 4, 900);
    expect(checkActivity(row.activity, row.streams, WINDOW, rulesFor("row")).verdict).toBe("accepted");
    const sail = track("Sail", 3, 1800);
    expect(checkActivity(sail.activity, sail.streams, WINDOW, rulesFor("sail")).verdict).toBe("accepted");
  });
});
