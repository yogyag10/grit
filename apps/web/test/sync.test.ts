/**
 * Unit tests for the sync orchestration. Tracks are SYNTHETIC fixtures from packages/core/test;
 * Strava is a mocked in-memory source. Nothing here touches the network or a database.
 */
import type { ActivityStreams } from "@oathmile/core";
import { describe, expect, it, vi } from "vitest";
import { makeTrack, run } from "../../../packages/core/test/fixtures";
import { StravaError, type StravaSummaryActivity } from "../lib/strava";
import { buildProgressView, memberWindow, runSync, syncPhase, type SyncSource } from "../lib/sync";

const PACT = {
  starts_at: "2026-11-07T00:00:00Z",
  ends_at: "2026-11-14T00:00:00Z",
  sync_cutoff: "2026-11-14T01:00:00Z",
  goal_meters: 10_000,
};
const NOW = new Date("2026-11-10T12:00:00Z");

let nextId = 1000;
function activity(track: ReturnType<typeof makeTrack>, extra: Partial<StravaSummaryActivity> = {}) {
  const id = nextId++;
  return { a: { ...track.activity, id, name: `Activity ${id}`, ...extra } as StravaSummaryActivity, s: track.streams };
}

function source(items: { a: StravaSummaryActivity; s: ActivityStreams }[], failStreamsFor = new Set<number>()) {
  const streams = new Map(items.map((i) => [i.a.id, i.s]));
  const src: SyncSource = {
    listActivities: vi.fn(async () => items.map((i) => i.a)),
    getStreams: vi.fn(async (id: number) => {
      if (failStreamsFor.has(id)) throw new StravaError("rate_limited", 429, "Strava responded 429");
      return streams.get(id) ?? {};
    }),
  };
  return src;
}

describe("memberWindow", () => {
  it("starts at the pact start for members who joined early", () => {
    expect(memberWindow(PACT, "2026-11-05T09:00:00Z")).toEqual({
      startsAt: "2026-11-07T00:00:00.000Z",
      endsAt: "2026-11-14T00:00:00.000Z",
    });
  });
  it("starts at joined_at for members who joined after the start", () => {
    expect(memberWindow(PACT, "2026-11-09T15:30:00Z").startsAt).toBe("2026-11-09T15:30:00.000Z");
  });
});

describe("syncPhase", () => {
  const w = memberWindow(PACT, "2026-11-01T00:00:00Z");
  it("is not_started before the window", () => expect(syncPhase(PACT, w, new Date("2026-11-06T00:00:00Z"))).toBe("not_started"));
  it("is open during the pact and up to the sync cutoff", () => {
    expect(syncPhase(PACT, w, NOW)).toBe("open");
    expect(syncPhase(PACT, w, new Date("2026-11-14T00:30:00Z"))).toBe("open");
  });
  it("is frozen after the sync cutoff", () => expect(syncPhase(PACT, w, new Date("2026-11-14T01:00:01Z"))).toBe("frozen"));
});

describe("runSync", () => {
  const window = memberWindow(PACT, "2026-11-01T00:00:00Z");

  it("asks Strava only for the member's window, capped at now", async () => {
    const src = source([]);
    await runSync({ source: src, window: memberWindow(PACT, "2026-11-09T00:00:00Z"), now: NOW, alreadyChecked: new Set() });
    expect(src.listActivities).toHaveBeenCalledWith({
      afterSec: Date.parse("2026-11-09T00:00:00Z") / 1000 - 1,
      beforeSec: NOW.getTime() / 1000,
    });
  });

  it("accepts a real-looking run and rejects a vehicle-speed activity", async () => {
    const good = activity(run(5, { start: "2026-11-08T17:00:00Z" }));
    const bus = activity(makeTrack([{ kind: "move", speedMps: 12, durationS: 900 }], { start: "2026-11-09T08:00:00Z" }));
    const out = await runSync({ source: source([good, bus]), window, now: NOW, alreadyChecked: new Set() });

    expect(out.error).toBeNull();
    const byId = new Map(out.checked.map((c) => [c.strava_activity_id, c]));
    expect(byId.get(good.a.id)?.verdict).toBe("accepted");
    expect(byId.get(good.a.id)?.accepted_meters).toBeGreaterThan(4900);
    expect(byId.get(bus.a.id)?.verdict).toBe("rejected");
    expect(byId.get(bus.a.id)?.reasons).toContain("VEHICLE_SPEED");
    expect(byId.get(bus.a.id)?.result.summary.name).toBe(bus.a.name);
  });

  it("passes the member window to checkActivity, so runs before joining are rejected", async () => {
    const lateJoiner = memberWindow(PACT, "2026-11-09T00:00:00Z");
    const before = activity(run(5, { start: "2026-11-08T17:00:00Z" }));
    const out = await runSync({ source: source([before]), window: lateJoiner, now: NOW, alreadyChecked: new Set() });
    expect(out.checked[0].reasons).toContain("OUTSIDE_WINDOW");
    expect(out.checked[0].accepted_meters).toBe(0);
  });

  it("never checks an activity whose streams failed to load, and keeps the ones already done", async () => {
    const first = activity(run(5, { start: "2026-11-08T07:00:00Z" }));
    const second = activity(run(5, { start: "2026-11-09T07:00:00Z" }));
    const third = activity(run(5, { start: "2026-11-10T07:00:00Z" }));
    const out = await runSync({
      source: source([first, second, third], new Set([second.a.id])),
      window,
      now: NOW,
      alreadyChecked: new Set(),
    });
    expect(out.checked.map((c) => c.strava_activity_id)).toEqual([first.a.id]);
    expect(out.checked.some((c) => c.reasons.includes("MISSING_GPS"))).toBe(false);
    expect(out.error?.kind).toBe("rate_limited");
    expect(out.remaining).toBe(2);
  });

  it("returns a listing failure as a retryable error with nothing checked", async () => {
    const src: SyncSource = {
      listActivities: async () => {
        throw new StravaError("auth", 401, "Strava responded 401");
      },
      getStreams: async () => ({}),
    };
    const out = await runSync({ source: src, window, now: NOW, alreadyChecked: new Set() });
    expect(out).toEqual({ checked: [], remaining: 0, error: expect.objectContaining({ kind: "auth" }) });
  });

  it("does not fetch streams for manual entries and rejects them", async () => {
    const manual = activity(run(5, { start: "2026-11-08T07:00:00Z" }), { manual: true });
    const src = source([manual]);
    const out = await runSync({ source: src, window, now: NOW, alreadyChecked: new Set() });
    expect(src.getStreams).not.toHaveBeenCalled();
    expect(out.checked[0].reasons).toContain("MANUAL_ENTRY");
  });

  it("skips activities already checked and caps new checks per sync", async () => {
    const items = [1, 2, 3, 4].map((d) => activity(run(2, { start: `2026-11-0${d + 6}T07:00:00Z` })));
    const out = await runSync({
      source: source(items),
      window,
      now: NOW,
      alreadyChecked: new Set([String(items[0].a.id)]),
      maxNew: 2,
    });
    expect(out.checked.map((c) => c.strava_activity_id)).toEqual([items[1].a.id, items[2].a.id]);
    expect(out.remaining).toBe(1);
  });

  it("does nothing before the window opens", async () => {
    const src = source([]);
    const out = await runSync({ source: src, window, now: new Date("2026-11-06T00:00:00Z"), alreadyChecked: new Set() });
    expect(src.listActivities).not.toHaveBeenCalled();
    expect(out.checked).toEqual([]);
  });
});

describe("buildProgressView", () => {
  it("sums accepted meters, caps percent at 100 and ignores syncs after the cutoff", async () => {
    const window = memberWindow(PACT, "2026-11-01T00:00:00Z");
    const a = activity(run(6, { start: "2026-11-08T07:00:00Z" }));
    const b = activity(run(6, { start: "2026-11-09T07:00:00Z" }));
    const c = activity(run(6, { start: "2026-11-10T07:00:00Z" }));
    const out = await runSync({ source: source([a, b, c]), window, now: NOW, alreadyChecked: new Set() });
    const rows = out.checked.map((r, i) => ({
      result: r.result,
      synced_at: i === 2 ? "2026-11-14T02:00:00Z" : r.synced_at, // third one synced after the cutoff
    }));

    const view = buildProgressView(rows, PACT);
    expect(view.acceptedMeters).toBeGreaterThan(11_800);
    expect(view.cleared).toBe(true);
    expect(view.percent).toBe(100);
    expect(view.activities.find((x) => x.id === String(c.a.id))?.late).toBe(true);
    expect(view.activities.find((x) => x.id === String(c.a.id))?.counted).toBe(false);
    expect(view.activities[0].id).toBe(String(c.a.id)); // newest first
  });

  it("shows reason messages for rejected activities", async () => {
    const window = memberWindow(PACT, "2026-11-01T00:00:00Z");
    const bus = activity(makeTrack([{ kind: "move", speedMps: 12, durationS: 900 }], { start: "2026-11-09T08:00:00Z" }));
    const out = await runSync({ source: source([bus]), window, now: NOW, alreadyChecked: new Set() });
    const view = buildProgressView(out.checked, PACT);
    expect(view.acceptedMeters).toBe(0);
    expect(view.cleared).toBe(false);
    expect(view.activities[0].reasons.find((r) => r.code === "VEHICLE_SPEED")?.message).toMatch(/vehicle speed/);
  });
});
