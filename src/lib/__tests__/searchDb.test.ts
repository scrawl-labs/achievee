import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { calls, tables } = vi.hoisted(() => {
  process.env.ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  return { calls: [] as { text: string; params: unknown[] }[], tables: { v: {} as Record<string, unknown[]> } };
});
vi.mock("@neondatabase/serverless", () => ({
  neon: () => Object.assign(
    (strings: TemplateStringsArray, ...params: unknown[]) => {
      const text = strings.join("?");
      calls.push({ text, params });
      const name = /FROM (\w+)/.exec(text)?.[1] ?? "";
      return Promise.resolve(tables.v[name] ?? []);
    },
    { transaction: async () => [] },
  ),
}));

import { search } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { SEARCH_ROW_LIMIT } from "@/lib/search";

beforeEach(() => { calls.length = 0; tables.v = {}; });
afterEach(() => { vi.restoreAllMocks(); });

describe("search.candidates", () => {
  it("runs one user-scoped, bounded, recent-first query per table", async () => {
    await search.candidates("me");
    const sel = calls.filter((c) => c.text.includes("SELECT"));
    expect(sel.map((c) => /FROM (\w+)/.exec(c.text)![1]).sort()).toEqual(["diary", "expense", "goal", "income", "saving", "todo", "workout"]);
    for (const c of sel) {
      expect(c.text).toMatch(/"user"=\?/);
      expect(c.text).toMatch(/ORDER BY \w+ DESC/);
      expect(c.text).toMatch(/LIMIT \?/);
      expect(c.params).toEqual(expect.arrayContaining(["me", SEARCH_ROW_LIMIT]));
    }
  });
  it("decrypts text, tags the type, and keeps goal scope + period_start as the date", async () => {
    tables.v = {
      diary: [{ date: "2026-10-14", text: encrypt("일기 본문") }],
      expense: [{ date: "2026-10-13", text: encrypt("커피") }],
      income: [{ date: "2026-10-12", text: "plain memo" }],
      saving: [{ date: "2026-10-11", text: encrypt("적금") }],
      workout: [{ date: "2026-10-10", text: encrypt("러닝") }],
      goal: [{ scope: "week", period_start: "2026-10-12", text: encrypt("주간 목표") }],
      todo: [{ date: "2026-10-09", text: encrypt("우유 사기") }],
    };
    const out = await search.candidates("me");
    expect(out).toEqual(expect.arrayContaining([
      { type: "diary", date: "2026-10-14", text: "일기 본문" },
      { type: "expense", date: "2026-10-13", text: "커피" },
      { type: "income", date: "2026-10-12", text: "plain memo" },
      { type: "saving", date: "2026-10-11", text: "적금" },
      { type: "workout", date: "2026-10-10", text: "러닝" },
      { type: "goal", date: "2026-10-12", text: "주간 목표", scope: "week" },
      { type: "todo", date: "2026-10-09", text: "우유 사기" },
    ]));
    expect(out).toHaveLength(7);
  });
  it("skips rows whose decryption yields nothing or fails (tampered ciphertext)", async () => {
    const tampered = encrypt("x").replace(/^(enc:v1:)(.)/, (_m, p: string, c: string) => p + (c === "A" ? "B" : "A"));
    tables.v = { diary: [{ date: "2026-10-14", text: "" }, { date: "2026-10-13", text: tampered }, { date: "2026-10-12", text: encrypt("ok") }] };
    expect(await search.candidates("me")).toEqual([{ type: "diary", date: "2026-10-12", text: "ok" }]);
  });
  it("warns once with a fixed message and the skipped count only, never the text", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const bad = encrypt("SECRET-BODY").replace(/^(enc:v1:)(.)/, (_m, p: string, c: string) => p + (c === "A" ? "B" : "A"));
    tables.v = { diary: [{ date: "2026-10-14", text: bad }, { date: "2026-10-13", text: bad }], expense: [{ date: "2026-10-13", text: bad }] };
    expect(await search.candidates("me")).toEqual([]);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith("search: skipped undecryptable rows", 3);
  });
  it("does not warn when nothing was skipped", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    tables.v = { diary: [{ date: "2026-10-14", text: encrypt("fine") }] };
    await search.candidates("me");
    expect(warn).not.toHaveBeenCalled();
  });
  it("todo: skips a tampered row but keeps the others, and the warning counts it", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const bad = encrypt("SECRET-TODO").replace(/^(enc:v1:)(.)/, (_m, p: string, c: string) => p + (c === "A" ? "B" : "A"));
    tables.v = { todo: [{ date: "2026-10-14", text: bad }, { date: "2026-10-13", text: encrypt("fine") }] };
    expect(await search.candidates("me")).toEqual([{ type: "todo", date: "2026-10-13", text: "fine" }]);
    expect(warn).toHaveBeenCalledWith("search: skipped undecryptable rows", 1);
  });
  it("does not select emotions or body (inbody) data", async () => {
    await search.candidates("me");
    expect(calls.some((c) => /emotions|FROM body/.test(c.text))).toBe(false);
  });
});
