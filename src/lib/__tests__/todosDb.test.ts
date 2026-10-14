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

import { deleteUserData, todos } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { TODO_HARD_LIMIT } from "@/lib/todos";

const last = () => calls[calls.length - 1];
const encrypted = (p: unknown) => typeof p === "string" && p.startsWith("enc:v1:");
beforeEach(() => { calls.length = 0; queue.v = []; });

describe("todos db layer", () => {
  it("add stores text encrypted, returns it decrypted, appends and enforces the per-day limit in one statement", async () => {
    queue.v = [[{ id: 1, date: "2026-10-14", text: encrypt("plain todo"), done: false, position: 0 }]];
    const row = await todos.add("me", { date: "2026-10-14", text: "plain todo" });
    expect(last().params.some(encrypted)).toBe(true);
    expect(last().params).not.toContain("plain todo");
    expect(row).toEqual({ id: 1, date: "2026-10-14", text: "plain todo", done: false, position: 0 });
    expect(last().text).toMatch(/INSERT INTO todo[\s\S]*SELECT[\s\S]*FROM todo WHERE "user"=\? AND date=\?[\s\S]*HAVING COUNT\(\*\) < \?::int/);
    expect(last().params).toContain(TODO_HARD_LIMIT);
    expect(calls).toHaveLength(1);
  });
  it("add returns null when the limit blocks the insert", async () => {
    expect(await todos.add("me", { date: "2026-10-14", text: "x" })).toBeNull();
  });
  it("range is user scoped, inclusive, ordered date/position/id, and decrypts", async () => {
    queue.v = [[{ id: 2, date: "2026-10-14", text: encrypt("a"), done: true, position: 1 }]];
    expect(await todos.range("me", "2026-10-01", "2026-10-31")).toEqual([{ id: 2, date: "2026-10-14", text: "a", done: true, position: 1 }]);
    expect(last().text).toMatch(/WHERE "user"=\? AND date >= \? AND date <= \?\s+ORDER BY date, position, id/);
    expect(last().params).toEqual(["me", "2026-10-01", "2026-10-31"]);
  });
  it("monthCounts is one user-scoped query that does not read the text column", async () => {
    queue.v = [[{ date: "2026-10-03", done: true }]];
    expect(await todos.monthCounts("me", "2026-10")).toEqual([{ date: "2026-10-03", done: true }]);
    expect(calls).toHaveLength(1);
    expect(last().text).toMatch(/SELECT date, done FROM todo\s+WHERE "user"=\? AND date BETWEEN \? AND \?/);
    expect(last().text).not.toMatch(/text/);
    expect(last().params).toEqual(["me", "2026-10-01", "2026-10-31"]);
  });
  it("update is filtered by id AND user and encrypts new text", async () => {
    queue.v = [[], []];
    expect(await todos.update("me", { id: 5, text: "new" })).toBeNull();
    expect(calls[0].text).toMatch(/WHERE id=\? AND "user"=\?/);
    expect(calls[0].params).toEqual(expect.arrayContaining([5, "me"]));
    expect(calls[0].params.some(encrypted)).toBe(true);
    expect(calls[0].params).not.toContain("new");
  });
  it("update returns the decrypted row", async () => {
    queue.v = [[{ id: 5, date: "2026-10-14", text: encrypt("new"), done: false, position: 0 }]];
    expect(await todos.update("me", { id: 5, text: "new" })).toEqual({ id: 5, date: "2026-10-14", text: "new", done: false, position: 0 });
    expect(calls).toHaveLength(1);
  });
  it("moving to a day applies the hard limit to that day; a miss on an owned row is reported as 'full', not null", async () => {
    queue.v = [[], [{ id: 5 }]];
    expect(await todos.update("me", { id: 5, date: "2026-10-20" })).toBe("full");
    expect(calls[0].text).toMatch(/SELECT COUNT\(\*\) FROM todo c WHERE c\."user"=\? AND c\.date=\?/);
    expect(calls[0].params).toContain(TODO_HARD_LIMIT);
    expect(calls[1].text).toMatch(/WHERE id=\? AND "user"=\?/); // ownership probe
    expect(calls[1].params).toEqual([5, "me"]);
  });
  it("a plain edit does not run the probe (no date given)", async () => {
    await todos.update("me", { id: 5, done: true });
    expect(calls).toHaveLength(1);
  });
  it("remove filters by id AND user", async () => {
    queue.v = [[{ id: 5 }]];
    expect(await todos.remove("me", 5)).toBe(true);
    expect(last().text).toMatch(/WHERE id=\? AND "user"=\?/);
    expect(last().params).toEqual([5, "me"]);
    expect(await todos.remove("me", 6)).toBe(false);
  });
  it("account deletion includes the todo table", async () => {
    await deleteUserData("me");
    expect(calls.some((c) => c.text.includes('DELETE FROM todo WHERE "user"='))).toBe(true);
  });
});
