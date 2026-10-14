import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SearchCandidate } from "@/lib/search";

const { getUser, store } = vi.hoisted(() => ({
  getUser: vi.fn(),
  store: { rows: [] as (SearchCandidate & { user: string })[], fail: false },
}));
vi.mock("@/lib/auth", () => ({ getUser }));
// Per-user fake: like the real queries, it only ever returns the caller's rows (already decrypted).
vi.mock("@/lib/db", () => ({
  search: {
    candidates: vi.fn(async (user: string) => {
      if (store.fail) throw new Error("boom: secret query text");
      return store.rows.filter((r) => r.user === user).map(({ user: _u, ...c }) => c);
    }),
  },
}));

import { GET } from "@/app/api/search/route";
import { search } from "@/lib/db";

// Each helper call moves the clock past the per-user rate limit window.
const get = (q?: string) => (vi.advanceTimersByTime(1000), GET(new Request(`http://x/api/search${q === undefined ? "" : `?q=${encodeURIComponent(q)}`}`)));

let clock = Date.parse("2026-10-14T00:00:00Z");
beforeEach(() => {
  vi.useFakeTimers();
  // The limiter is module state shared across tests, so the clock must only move forward.
  clock += 3_600_000;
  vi.setSystemTime(clock);
  store.fail = false;
  store.rows = [
    { user: "me", type: "diary", date: "2026-10-14", text: "오늘 한강에서 러닝을 했다" },
    { user: "me", type: "goal", date: "2026-10-12", text: "주간 러닝 3회", scope: "week" },
    { user: "me", type: "todo", date: "2026-10-13", text: "러닝화 사기" },
    { user: "other", type: "todo", date: "2026-10-14", text: "러닝 비밀 할 일" },
    { user: "other", type: "diary", date: "2026-10-14", text: "러닝 비밀 일기" },
  ];
  vi.clearAllMocks();
  getUser.mockReset().mockResolvedValue({ id: "me", accessToken: "t" });
});

describe("GET /api/search", () => {
  it("401 before the query is looked at or the db is touched", async () => {
    getUser.mockResolvedValue(null);
    expect((await get("러닝")).status).toBe(401);
    expect((await get()).status).toBe(401);
    expect(search.candidates).not.toHaveBeenCalled();
  });
  it("400 on missing, blank, too short and too long q", async () => {
    for (const q of [undefined, "", "   ", "a", "a".repeat(51)]) {
      const res = await get(q);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "bad query" });
    }
    expect(search.candidates).not.toHaveBeenCalled();
  });
  it("matches decrypted text and returns the contract shape, newest first", async () => {
    const res = await get("러닝");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      results: [
        { type: "diary", date: "2026-10-14", title: "오늘 한강에서 러닝을 했다" },
        { type: "todo", date: "2026-10-13", title: "러닝화 사기" },
        { type: "goal", date: "2026-10-12", title: "주간 러닝 3회", scope: "week" },
      ],
    });
  });
  it("only queries as the signed-in user and never exposes another user's rows", async () => {
    const body = JSON.stringify(await (await get("러닝")).json());
    expect(search.candidates).toHaveBeenCalledWith("me");
    expect(body).not.toContain("비밀");
  });
  it("returns an empty list when nothing matches", async () => {
    expect(await (await get("zzzz")).json()).toEqual({ results: [] });
  });
  it("500 with a fixed message that leaks neither error nor query", async () => {
    store.fail = true;
    const res = await get("러닝");
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ error: "search failed" });
    expect(text).not.toContain("secret");
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
  });
  it("429 + Retry-After when the same user calls again within 300ms, and recovers after", async () => {
    expect((await get("러닝")).status).toBe(200);
    const res = await GET(new Request("http://x/api/search?q=%EB%9F%AC%EB%8B%9D"));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("1");
    expect(await res.json()).toEqual({ error: "too many requests" });
    expect(search.candidates).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(300);
    expect((await GET(new Request("http://x/api/search?q=%EB%9F%AC%EB%8B%9D"))).status).toBe(200);
  });
  it("rate limit is per user and runs after auth", async () => {
    expect((await get("러닝")).status).toBe(200);
    getUser.mockResolvedValue({ id: "someone-else", accessToken: "t" });
    expect((await GET(new Request("http://x/api/search?q=%EB%9F%AC%EB%8B%9D"))).status).toBe(200);
    getUser.mockResolvedValue(null);
    expect((await GET(new Request("http://x/api/search?q=%EB%9F%AC%EB%8B%9D"))).status).toBe(401);
  });
  it("does not let browsers or proxies cache decrypted results", async () => {
    expect((await get("러닝")).headers.get("Cache-Control")).toBe("private, no-store");
  });
});
