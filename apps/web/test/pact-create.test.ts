import { describe, expect, it } from "vitest";
import { parseNewPact } from "../lib/pact-create";

const NOW = Date.parse("2026-11-08T18:00:00Z");
const HOUR = 3600_000;
const base = {
  title: "Brock floor 5K",
  goalKm: 5,
  stakeSol: 0.1,
  visibility: "invite",
  startsAt: new Date(NOW + HOUR).toISOString(),
  endsAt: new Date(NOW + 8 * 24 * HOUR).toISOString(),
};

describe("parseNewPact", () => {
  it("builds a pact with joining closing at the start and a one hour sync grace", () => {
    const r = parseNewPact(base, NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.pact).toMatchObject({ goal_meters: 5000, stake_lamports: 100_000_000, visibility: "invite" });
    expect(r.pact.funding_cutoff).toBe(r.pact.starts_at);
    expect(Date.parse(r.pact.sync_cutoff) - Date.parse(r.pact.ends_at)).toBe(HOUR);
  });
  it("rejects values outside the presets", () => {
    expect(parseNewPact({ ...base, goalKm: 0.5 }, NOW).ok).toBe(false);
    expect(parseNewPact({ ...base, goalKm: 101 }, NOW).ok).toBe(false);
    expect(parseNewPact({ ...base, goalKm: 7.25 }, NOW).ok).toBe(false);
    expect(parseNewPact({ ...base, stakeSol: 5 }, NOW).ok).toBe(false);
    expect(parseNewPact({ ...base, stakeSol: 0.0005 }, NOW).ok).toBe(false);
    expect(parseNewPact({ ...base, goalKm: "7" }, NOW).ok).toBe(false);
    expect(parseNewPact({ ...base, visibility: "secret" }, NOW).ok).toBe(false);
  });
  it("accepts custom distances and deposits inside the limits", () => {
    const r = parseNewPact({ ...base, goalKm: 7.5, stakeSol: 0.015 }, NOW);
    expect(r.ok && r.pact.goal_meters).toBe(7500);
    expect(r.ok && r.pact.stake_lamports).toBe(15_000_000);
    expect(parseNewPact({ ...base, goalKm: 100, stakeSol: 0.25 }, NOW).ok).toBe(true);
  });
  it("rejects bad titles", () => {
    expect(parseNewPact({ ...base, title: "ab" }, NOW).ok).toBe(false);
    expect(parseNewPact({ ...base, title: "<script>" }, NOW).ok).toBe(false);
  });
  it("needs a future start and a sensible length", () => {
    expect(parseNewPact({ ...base, startsAt: new Date(NOW).toISOString() }, NOW).ok).toBe(false);
    expect(parseNewPact({ ...base, endsAt: new Date(NOW + HOUR + 60_000).toISOString() }, NOW).ok).toBe(false);
    expect(parseNewPact({ ...base, endsAt: new Date(NOW + 60 * 24 * HOUR).toISOString() }, NOW).ok).toBe(false);
    expect(parseNewPact({ ...base, startsAt: "nope" }, NOW).ok).toBe(false);
  });
  it("tolerates a missing body", () => expect(parseNewPact(undefined, NOW).ok).toBe(false));
});
