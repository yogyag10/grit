import { describe, expect, it } from "vitest";
import { checkActivity } from "../src/gps";
import { computeProgress } from "../src/progress";
import { makeTrack, run, WINDOW } from "./fixtures";

const CUTOFF = "2026-11-15T01:00:00Z";
const accepted = (id: string, km: number) => checkActivity(run(km, { id }).activity, run(km, { id }).streams, WINDOW);

describe("computeProgress", () => {
  it("counts an activity once even if synced repeatedly", () => {
    const r = accepted("a1", 5);
    const p = computeProgress(
      [
        { result: r, syncedAt: "2026-11-08T10:00:00Z" },
        { result: r, syncedAt: "2026-11-09T10:00:00Z" },
      ],
      CUTOFF,
    );
    expect(p.countedActivityIds).toEqual(["a1"]);
    expect(p.acceptedMeters).toBe(r.acceptedMeters);
  });

  it("ignores rejected activities", () => {
    const bus = makeTrack([{ kind: "move", speedMps: 11, durationS: 600 }], { id: "bus" });
    const p = computeProgress(
      [
        { result: accepted("a1", 5), syncedAt: "2026-11-08T10:00:00Z" },
        { result: checkActivity(bus.activity, bus.streams, WINDOW), syncedAt: "2026-11-08T11:00:00Z" },
      ],
      CUTOFF,
    );
    expect(p.countedActivityIds).toEqual(["a1"]);
  });

  it("freezes progress at the sync cutoff", () => {
    const p = computeProgress(
      [
        { result: accepted("a1", 5), syncedAt: "2026-11-08T10:00:00Z" },
        { result: accepted("late", 5), syncedAt: "2026-11-15T02:00:00Z" },
      ],
      CUTOFF,
    );
    expect(p.countedActivityIds).toEqual(["a1"]);
    expect(p.lateActivityIds).toEqual(["late"]);
  });
});
