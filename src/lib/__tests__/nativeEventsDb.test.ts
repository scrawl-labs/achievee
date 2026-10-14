import { beforeEach, describe, expect, it, vi } from "vitest";

const { calls, queue } = vi.hoisted(() => {
  process.env.ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  return { calls: [] as { text: string; params: unknown[] }[], queue: { v: [] as unknown[][] } };
});
vi.mock("@neondatabase/serverless", () => ({
  neon: () => Object.assign(
    (strings: TemplateStringsArray, ...params: unknown[]) => {
      const text = strings.join("?");
      if (/^\s*(CREATE|ALTER)\b/.test(text)) return Promise.resolve([]); // schema bootstrap is not part of what is asserted
      calls.push({ text, params });
      return Promise.resolve(queue.v.shift() ?? []);
    },
    { transaction: async () => [] },
  ),
}));

import { deleteUserData, nativeEvents } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { NATIVE_EVENT_HARD_LIMIT } from "@/lib/nativeEvents";

const last = () => calls[calls.length - 1];
const encrypted = (p: unknown) => typeof p === "string" && p.startsWith("enc:v1:");
const dbRow = (title: string, over: Record<string, unknown> = {}) => ({ id: 1, date: "2026-10-14", start_min: 600, end_min: 660, title: encrypt(title), ...over });
beforeEach(() => { calls.length = 0; queue.v = []; });

describe("nativeEvents db layer", () => {
  it("add stores the title encrypted, returns it decrypted, and applies the per-day limit in the same statement", async () => {
    queue.v = [[dbRow("plain title")]];
    const row = await nativeEvents.add("me", { date: "2026-10-14", startMin: 600, endMin: 660, title: "plain title" });
    expect(row).toEqual({ id: 1, date: "2026-10-14", startMin: 600, endMin: 660, title: "plain title" });
    const c = last();
    expect(c.text).toContain("INSERT INTO native_event");
    expect(c.text).toContain("HAVING COUNT(*) <");
    expect(c.params).toContain(NATIVE_EVENT_HARD_LIMIT);
    expect(c.params.some(encrypted)).toBe(true);
    expect(c.params).not.toContain("plain title");
    expect(c.params).toContain("me");
  });

  it("add returns null when the limit blocks the insert", async () => {
    queue.v = [[]];
    expect(await nativeEvents.add("me", { date: "2026-10-14", startMin: 600, endMin: 660, title: "x" })).toBeNull();
  });

  it("range is [from, to) for one user, ordered, and decrypts titles", async () => {
    queue.v = [[dbRow("a"), dbRow("b", { id: 2, start_min: 700, end_min: 760 })]];
    const rows = await nativeEvents.range("me", "2026-10-14", "2026-10-15");
    expect(rows.map((r) => r.title)).toEqual(["a", "b"]);
    const c = last();
    expect(c.text).toContain("date >=");
    expect(c.text).toMatch(/date < \?/);
    expect(c.text).toContain("ORDER BY date, start_min, id");
    expect(c.params).toEqual(["me", "2026-10-14", "2026-10-15"]);
  });

  it("month reads the calendar month of one user", async () => {
    queue.v = [[dbRow("m")]];
    expect((await nativeEvents.month("me", "2026-10")).map((r) => r.title)).toEqual(["m"]);
    expect(last().params).toEqual(["me", "2026-10-01", "2026-10-31"]);
  });

  it("update only touches rows of the same user, encrypts a new title, and is null for someone else's id", async () => {
    queue.v = [[dbRow("renamed")], []];
    expect((await nativeEvents.update("me", { id: 1, title: "renamed" }))?.title).toBe("renamed");
    expect(last().text).toContain('"user"=');
    expect(last().params.some(encrypted)).toBe(true);
    expect(last().params).not.toContain("renamed");
    expect(await nativeEvents.update("me", { id: 99, title: "x" })).toBeNull();
  });

  it("remove is scoped to the user and reports whether a row went away", async () => {
    queue.v = [[{ id: 1 }], []];
    expect(await nativeEvents.remove("me", 1)).toBe(true);
    expect(last().text).toContain('"user"=');
    expect(await nativeEvents.remove("me", 2)).toBe(false);
  });

  it("account deletion includes the native_event table", async () => {
    await deleteUserData("me");
    expect(calls.some((c) => c.text.includes('DELETE FROM native_event WHERE "user"='))).toBe(true);
  });
});
