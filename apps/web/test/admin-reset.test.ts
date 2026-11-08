import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { adminResetResponse, resetAppDatabase } from "../lib/admin-reset";
import { DEMO_PACT_ID, demoPactSeed, isRetiredSeedPact } from "../lib/demo-pact";
import type { Database } from "../lib/supabase/database.types";

const secret = "test-only-reset-secret";
const request = (body?: string, authorization = `Bearer ${secret}`) => new Request("http://localhost/api/admin/reset", {
  method: "POST", headers: { authorization }, body,
});
function database() {
  const operations: string[] = [];
  const rpc = vi.fn();
  const deleteTable = vi.fn().mockImplementation(async (table: string) => {
    operations.push(`delete:${table}`);
    return { error: null };
  });
  const insert = vi.fn().mockImplementation(async () => { operations.push("seed"); return { error: null }; });
  const from = vi.fn().mockImplementation((table: string) => ({
    delete: () => ({ not: (column: string, op: string, value: unknown) => deleteTable(table, column, op, value) }),
    insert,
  }));
  const listUsers = vi.fn().mockResolvedValue({ data: { users: [] }, error: null });
  const deleteUser = vi.fn().mockImplementation(async (id: string) => { operations.push(`auth:${id}`); return { error: null }; });
  const admin = { from, rpc, auth: { admin: { listUsers, deleteUser } } } as unknown as SupabaseClient<Database>;
  return { admin, rpc, from, deleteTable, insert, listUsers, deleteUser, operations };
}

describe("operator reset authorization", () => {
  it.each(["", "Bearer wrong", secret])("rejects invalid authorization before touching data: %s", async header => {
    const reset = vi.fn();
    expect((await adminResetResponse(request(undefined, header), { secret, reset })).status).toBe(401);
    expect(reset).not.toHaveBeenCalled();
  });
  it("is disabled without a configured reset secret", async () => {
    const reset = vi.fn();
    expect((await adminResetResponse(request(), { secret: undefined, reset })).status).toBe(404);
    expect(reset).not.toHaveBeenCalled();
  });
  it("never resets through GET", async () => {
    const reset = vi.fn();
    expect((await adminResetResponse(new Request("http://localhost/api/admin/reset"), { secret, reset })).status).toBe(405);
    expect(reset).not.toHaveBeenCalled();
  });
  it("accepts a full reset with the correct bearer secret", async () => {
    const reset = vi.fn().mockResolvedValue({ ok: true });
    expect((await adminResetResponse(request(), { secret, reset })).status).toBe(200);
    expect(reset).toHaveBeenCalledWith(false);
  });
  it("accepts keeping sign-in accounts when explicitly requested", async () => {
    const reset = vi.fn().mockResolvedValue({ ok: true });
    await adminResetResponse(request('{"keepAccounts":true}'), { secret, reset });
    expect(reset).toHaveBeenCalledWith(true);
  });
  it.each(['{"keepAccounts":"false"}', 'null', '[]', '{invalid'])('rejects malformed options: %s', async body => {
    const reset = vi.fn();
    expect((await adminResetResponse(request(body), { secret, reset })).status).toBe(400);
    expect(reset).not.toHaveBeenCalled();
  });
});

describe("database and account reset", () => {
  it("clears pact data and rebuilds one Demo while preserving sign-ins when requested", async () => {
    const db = database();
    const result = await resetAppDatabase(db.admin, true);
    expect(result.scope).toBe("pact-data");
    expect(db.insert).toHaveBeenCalledWith(expect.objectContaining({ id: DEMO_PACT_ID, title: "Demo", is_demo: true }));
    expect(db.rpc).not.toHaveBeenCalled();
    expect(db.deleteTable.mock.calls.some(call => ["profiles", "strava_tokens", "groups"].includes(call[0]))).toBe(false);
    expect(db.listUsers).not.toHaveBeenCalled();
    expect(db.deleteUser).not.toHaveBeenCalled();
  });
  it("deletes every auth account without skipping users as pages shrink", async () => {
    const db = database();
    db.listUsers.mockResolvedValueOnce({ data: { users: [{ id: "a" }, { id: "b" }] }, error: null })
      .mockResolvedValueOnce({ data: { users: [{ id: "c" }] }, error: null });
    const result = await resetAppDatabase(db.admin, false);
    expect(result.usersDeleted).toBe(3);
    expect(db.deleteUser.mock.calls.map(call => call[0])).toEqual(["a", "b", "c"]);
    expect(db.listUsers.mock.calls.every(call => call[0].page === 1)).toBe(true);
    expect(db.operations.indexOf("delete:messages")).toBeLessThan(db.operations.indexOf("delete:groups"));
    expect(db.operations.indexOf("delete:groups")).toBeLessThan(db.operations.indexOf("delete:profiles"));
    expect(db.operations.indexOf("delete:payouts")).toBeLessThan(db.operations.indexOf("delete:settlements"));
    expect(db.operations.indexOf("delete:deposits")).toBeLessThan(db.operations.indexOf("delete:memberships"));
    expect(db.operations.indexOf("delete:profiles")).toBeLessThan(db.operations.indexOf("auth:a"));
    expect(db.operations.at(-1)).toBe("seed");
    expect(db.rpc).not.toHaveBeenCalled();
    expect(db.deleteTable.mock.calls.every(call => call[2] === "is" && call[3] === null)).toBe(true);
  });
  it("does not clear app data if the initial auth-account check fails", async () => {
    const db = database();
    db.listUsers.mockResolvedValue({ data: null, error: { message: "unavailable" } });
    await expect(resetAppDatabase(db.admin, false)).rejects.toThrow("Reset did not start");
    expect(db.from).not.toHaveBeenCalled();
  });
  it("reports a partially completed account wipe instead of claiming success", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const db = database();
    db.listUsers.mockResolvedValueOnce({ data: { users: [{ id: "a" }, { id: "b" }] }, error: null });
    db.deleteUser.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: { message: "failed" } });
    const response = await adminResetResponse(request(), { secret, reset: keep => resetAppDatabase(db.admin, keep) });
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ partial: true, usersDeleted: 1 });
    log.mockRestore();
  });
  it("stops on a failed table delete and allows a successful retry without an RPC", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const db = database();
    db.deleteTable.mockResolvedValueOnce({ error: { message: "unavailable" } });
    const response = await adminResetResponse(request(), { secret, reset: keep => resetAppDatabase(db.admin, keep) });
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ partial: true });
    expect(db.insert).not.toHaveBeenCalled();
    expect(db.deleteUser).not.toHaveBeenCalled();
    expect((await resetAppDatabase(db.admin, false)).ok).toBe(true);
    expect(db.rpc).not.toHaveBeenCalled();
    log.mockRestore();
  });
  it("reports failure when recreating Demo fails after the wipe", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const db = database();
    db.insert.mockResolvedValueOnce({ error: { message: "unavailable" } });
    const response = await adminResetResponse(request(), { secret, reset: keep => resetAppDatabase(db.admin, keep) });
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ partial: true, error: expect.stringContaining("creating Demo") });
    log.mockRestore();
  });
});

describe("single Demo seed", () => {
  it("opens a fresh 3 km Demo with a stable ID and 48-hour window", () => {
    const now = Date.parse("2026-11-08T06:00:00Z");
    const seed = demoPactSeed(now);
    expect(seed.title).toBe("Demo");
    expect(seed.id).toBe(DEMO_PACT_ID);
    expect(seed.goal_meters).toBe(3000);
    expect(Date.parse(seed.ends_at) - now).toBe(48 * 3600_000);
    expect(Date.parse(seed.starts_at)).toBeLessThan(now);
    expect(seed.funding_cutoff).toBe(seed.ends_at);
    expect(isRetiredSeedPact(DEMO_PACT_ID)).toBe(false);
    expect(isRetiredSeedPact("10000000-0000-4000-8000-0000000000da")).toBe(true);
  });
  it("rejects invalid or expired demo end times", () => {
    expect(() => demoPactSeed(Date.now(), "invalid")).toThrow("future ISO date");
    expect(() => demoPactSeed(Date.now(), "2020-01-01T00:00:00Z")).toThrow("future ISO date");
  });
});
