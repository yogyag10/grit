/** Strava client tests with a mocked fetch. No network. */
import { describe, expect, it, vi } from "vitest";
import {
  authorizeUrl,
  flattenStreams,
  getStreams,
  hasRequiredScope,
  kindForStatus,
  listActivities,
  StravaError,
} from "../lib/strava";
import { isUbcStudentEmail, normalizeEmail } from "../lib/ubc";

function mockFetch(...responses: (Response | Error)[]) {
  const fn = vi.fn(async () => {
    const next = responses.shift();
    if (!next) throw new Error("unexpected fetch");
    if (next instanceof Error) throw next;
    return next;
  });
  return fn as unknown as typeof fetch & typeof fn;
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("authorizeUrl", () => {
  it("requests read,activity:read_all with state and approval_prompt=auto", () => {
    const url = new URL(authorizeUrl({ clientId: "123", redirectUri: "http://localhost:3000/api/strava/callback", state: "abc" }));
    expect(url.origin + url.pathname).toBe("https://www.strava.com/oauth/authorize");
    expect(url.searchParams.get("scope")).toBe("read,activity:read_all");
    expect(url.searchParams.get("state")).toBe("abc");
    expect(url.searchParams.get("approval_prompt")).toBe("auto");
    expect(url.searchParams.get("response_type")).toBe("code");
  });
});

describe("hasRequiredScope", () => {
  it("requires activity:read_all", () => {
    expect(hasRequiredScope("read,activity:read_all")).toBe(true);
    expect(hasRequiredScope("read,activity:read")).toBe(false);
    expect(hasRequiredScope(null)).toBe(false);
  });
});

describe("errors", () => {
  it("maps HTTP statuses to retryable kinds", () => {
    expect(kindForStatus(401)).toBe("auth");
    expect(kindForStatus(403)).toBe("permission");
    expect(kindForStatus(404)).toBe("not_found");
    expect(kindForStatus(429)).toBe("rate_limited");
    expect(kindForStatus(503)).toBe("server");
  });

  it("throws StravaError on 429 instead of returning empty streams", async () => {
    const f = mockFetch(json({ message: "Rate Limit Exceeded" }, 429));
    await expect(getStreams("t", 1, f)).rejects.toMatchObject({ name: "StravaError", kind: "rate_limited", status: 429 });
  });

  it("throws a network StravaError when fetch fails", async () => {
    const f = mockFetch(new TypeError("fetch failed"));
    const err = await getStreams("t", 1, f).catch((e) => e);
    expect(err).toBeInstanceOf(StravaError);
    expect(err.kind).toBe("network");
  });
});

describe("streams", () => {
  it("flattens key_by_type streams to .data arrays", () => {
    expect(
      flattenStreams({ time: { data: [0, 1] }, latlng: { data: [[49, -123], [49.0001, -123]] }, distance: { data: [0, 11] } }),
    ).toEqual({ time: [0, 1], latlng: [[49, -123], [49.0001, -123]], distance: [0, 11] });
  });

  it("requests time,latlng,distance keyed by type with the bearer token", async () => {
    const f = mockFetch(json({ time: { data: [0] } }));
    await getStreams("tok", 42, f);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://www.strava.com/api/v3/activities/42/streams?keys=time,latlng,distance&key_by_type=true");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok");
  });

  it("treats a successful empty-array response as no streams", async () => {
    expect(await getStreams("t", 1, mockFetch(json([])))).toEqual({});
  });
});

describe("listActivities", () => {
  it("pages until a short page and passes the window", async () => {
    const page = (n: number, from: number) => Array.from({ length: n }, (_, i) => ({ id: from + i }));
    const f = mockFetch(json(page(2, 1)), json(page(1, 3)));
    const out = await listActivities("t", { afterSec: 100, beforeSec: 200 }, { max: 2, fetchImpl: f });
    expect(out.map((a) => a.id)).toEqual([1, 2]);
    const firstUrl = new URL((f.mock.calls[0] as unknown as [string])[0]);
    expect(firstUrl.searchParams.get("after")).toBe("100");
    expect(firstUrl.searchParams.get("before")).toBe("200");
  });
});

describe("UBC email gate", () => {
  it("accepts only @student.ubc.ca", () => {
    expect(isUbcStudentEmail(normalizeEmail("  Jane.Doe@Student.UBC.ca "))).toBe(true);
    expect(isUbcStudentEmail("jane@ubc.ca")).toBe(false);
    expect(isUbcStudentEmail("jane@student.ubc.ca.evil.com")).toBe(false);
    expect(isUbcStudentEmail("jane@notstudent.ubc.ca")).toBe(false);
    expect(isUbcStudentEmail("a b@student.ubc.ca")).toBe(false);
  });
});
