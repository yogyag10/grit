import { describe, expect, it } from "vitest";
import { checkActivity } from "../src/gps";
import { addSpikes, makeTrack, run, WINDOW } from "./fixtures";

describe("checkActivity (synthetic fixtures)", () => {
  it("accepts a normal 5 km run", () => {
    const { activity, streams } = run(5);
    const r = checkActivity(activity, streams, WINDOW);
    expect(r.verdict).toBe("accepted");
    expect(r.reasons).toEqual([]);
    expect(r.acceptedMeters).toBeGreaterThan(4900);
    expect(r.acceptedMeters).toBeLessThanOrEqual(5000);
  });

  it("rejects a run with a bus segment in the middle", () => {
    const { activity, streams } = makeTrack([
      { kind: "move", speedMps: 3, durationS: 400 },
      { kind: "move", speedMps: 11, durationS: 300 }, // ~40 km/h
      { kind: "move", speedMps: 3, durationS: 400 },
    ]);
    const r = checkActivity(activity, streams, WINDOW);
    expect(r.verdict).toBe("rejected");
    expect(r.reasons).toContain("VEHICLE_SPEED");
    expect(r.acceptedMeters).toBe(0);
  });

  it("does not let a single short sprint trigger the vehicle check", () => {
    const { activity, streams } = makeTrack([
      { kind: "move", speedMps: 3, durationS: 600 },
      { kind: "move", speedMps: 8, durationS: 20 }, // 20 s burst, shorter than the 60 s window
      { kind: "move", speedMps: 3, durationS: 600 },
    ]);
    expect(checkActivity(activity, streams, WINDOW).verdict).toBe("accepted");
  });

  it("tolerates occasional GPS spikes", () => {
    const { activity, streams } = run(5);
    const r = checkActivity(activity, addSpikes(streams, 50, 80), WINDOW);
    expect(r.verdict).toBe("accepted");
    expect(r.metrics.spikesRemoved).toBeGreaterThan(0);
  });

  it("rejects a track that is mostly noise", () => {
    const { activity, streams } = run(5);
    const r = checkActivity(activity, addSpikes(streams, 8, 80), WINDOW);
    expect(r.reasons).toContain("NOISY_GPS");
  });

  it("rejects missing GPS (treadmill or GPS off)", () => {
    const { activity } = run(5);
    expect(checkActivity(activity, { time: [], latlng: [] }, WINDOW).reasons).toContain("MISSING_GPS");
    expect(checkActivity(activity, null, WINDOW).reasons).toContain("MISSING_GPS");
  });

  it("rejects malformed streams instead of crashing", () => {
    const { activity, streams } = run(5);
    const broken = { ...streams, time: streams.time!.slice(0, -1) };
    expect(checkActivity(activity, broken, WINDOW).reasons).toContain("MISSING_GPS");
  });

  it("rejects a GPS gap that covered distance (paused, moved, resumed)", () => {
    const { activity, streams } = makeTrack([
      { kind: "move", speedMps: 3, durationS: 600 },
      { kind: "gap", durationS: 300, displacementM: 2000 },
      { kind: "move", speedMps: 3, durationS: 600 },
    ]);
    expect(checkActivity(activity, streams, WINDOW).reasons).toContain("GPS_GAP");
  });

  it("allows a pause at a red light (gap without movement)", () => {
    const { activity, streams } = makeTrack([
      { kind: "move", speedMps: 3, durationS: 600 },
      { kind: "gap", durationS: 120, displacementM: 5 },
      { kind: "move", speedMps: 3, durationS: 600 },
    ]);
    expect(checkActivity(activity, streams, WINDOW).verdict).toBe("accepted");
  });

  it("rejects a 20 km/h bike ride uploaded as a run", () => {
    const { activity, streams } = makeTrack([{ kind: "move", speedMps: 5.56, durationS: 1200 }]);
    expect(checkActivity(activity, streams, WINDOW).reasons).toContain("IMPLAUSIBLE_PACE");
  });

  it("KNOWN LIMIT: a slow 18 km/h bike ride uploaded as a run is NOT caught", () => {
    // Documented on purpose so nobody claims stronger verification than we have.
    const { activity, streams } = makeTrack([{ kind: "move", speedMps: 5.0, durationS: 1200 }]);
    expect(checkActivity(activity, streams, WINDOW).verdict).toBe("accepted");
  });

  it("rejects manual entries and wrong sport types", () => {
    const { activity, streams } = run(5);
    expect(checkActivity({ ...activity, manual: true }, streams, WINDOW).reasons).toContain("MANUAL_ENTRY");
    expect(checkActivity({ ...activity, sport_type: "Ride" }, streams, WINDOW).reasons).toContain("WRONG_SPORT_TYPE");
    expect(checkActivity({ ...activity, sport_type: "VirtualRun" }, streams, WINDOW).reasons).toContain("WRONG_SPORT_TYPE");
  });

  it("rejects activities outside the pact window", () => {
    const { activity, streams } = run(5, { start: "2026-11-06T23:50:00Z" });
    expect(checkActivity(activity, streams, WINDOW).reasons).toContain("OUTSIDE_WINDOW");
  });

  it("rejects runs that are too short", () => {
    const { activity, streams } = run(0.8);
    expect(checkActivity(activity, streams, WINDOW).reasons).toContain("TOO_SHORT");
  });

  it("rejects a reported distance that the GPS track does not support", () => {
    const { activity, streams } = run(5);
    expect(checkActivity({ ...activity, distance: 10_000 }, streams, WINDOW).reasons).toContain("DISTANCE_MISMATCH");
  });

  it("reports every failed rule, not just the first", () => {
    const { activity, streams } = makeTrack([{ kind: "move", speedMps: 11, durationS: 600 }]);
    const r = checkActivity({ ...activity, manual: true }, streams, WINDOW);
    expect(r.reasons).toEqual(expect.arrayContaining(["MANUAL_ENTRY", "VEHICLE_SPEED", "IMPLAUSIBLE_PACE"]));
  });

  it("is deterministic", () => {
    const { activity, streams } = run(5);
    expect(checkActivity(activity, streams, WINDOW)).toEqual(checkActivity(activity, streams, WINDOW));
  });
});
