import { beforeEach, describe, expect, it, vi } from "vitest";

const { calls, txn } = vi.hoisted(() => {
  process.env.ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  return { calls: [] as { text: string; params: unknown[] }[], txn: { batches: [] as string[][] } };
});
vi.mock("@neondatabase/serverless", () => ({
  neon: () => Object.assign(
    (strings: TemplateStringsArray, ...params: unknown[]) => {
      const q = { text: strings.join("?"), params };
      calls.push(q);
      return q;
    },
    { transaction: async (qs: { text: string }[]) => { txn.batches.push(qs.map((q) => q.text)); return []; } },
  ),
}));

import { deleteUserData, identity, integrations } from "@/lib/db";

beforeEach(() => { calls.length = 0; });

describe("identity tables", () => {
  it("ensure() is an idempotent insert of users and accounts, keyed by the Google id", async () => {
    await identity.ensure("sub-1", "google", "sub-1");
    const batch = txn.batches.at(-1)!;
    expect(batch).toHaveLength(2);
    expect(batch.every((t) => t.includes("ON CONFLICT DO NOTHING"))).toBe(true);
    expect(calls.at(-2)!.params).toEqual(["sub-1"]);
    expect(calls.at(-1)!.params).toEqual(["google", "sub-1", "sub-1"]);
  });
  it("creates both tables on first use", async () => {
    await identity.ensure("a", "google", "a");
    const ddl = txn.batches.flat().join("\n"); // the schema batch runs once per module, whichever test comes first
    expect(ddl).toContain("CREATE TABLE IF NOT EXISTS users");
    expect(ddl).toContain("CREATE TABLE IF NOT EXISTS accounts");
  });
  it("deleteUserData removes users and accounts too", async () => {
    await deleteUserData("sub-1");
    const del = txn.batches.at(-1)!.join("\n");
    expect(del).toContain("DELETE FROM accounts WHERE user_id=");
    expect(del).toContain("DELETE FROM users WHERE id=");
  });
});

describe("integrations.get", () => {
  it("is scoped by user and provider with bound parameters", async () => {
    await integrations.get("me", "google").catch(() => undefined);
    const q = calls.at(-1)!;
    expect(q.text).toContain('"user"=?');
    expect(q.params).toEqual(["me", "google"]);
  });
});

describe("integrations.list", () => {
  it("never selects the google row (it holds the refresh token)", async () => {
    await integrations.list("me").catch(() => undefined); // the fake driver returns the query, not rows
    const q = calls.at(-1)!;
    expect(q.text).toContain("provider NOT IN ('google', 'google_disconnected')");
    expect(q.text).toContain('"user"=?');
    expect(q.params).toEqual(["me"]);
  });
});
