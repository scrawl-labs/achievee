import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GoalRow } from "@/lib/goals";

const { getUser, store } = vi.hoisted(() => ({ getUser: vi.fn(), store: { rows: [] as (GoalRow & { user: string })[], next: 1 } }));
vi.mock("@/lib/auth", () => ({ getUser }));
// In-memory stand-in for the db module that scopes every operation by user, like the real WHERE clauses.
vi.mock("@/lib/db", () => ({
  goals: {
    range: vi.fn(async (user: string, scope: string, from: string, to: string) =>
      store.rows.filter((r) => r.user === user && r.scope === scope && r.period_start >= from && r.period_start <= to)),
    add: vi.fn(async (user: string, g: { scope: GoalRow["scope"]; period_start: string; text: string }) => {
      const row = { ...g, id: store.next++, user, done: false, position: 0 };
      store.rows = [...store.rows, row];
      return row;
    }),
    update: vi.fn(async (user: string, p: { id: number; done?: boolean }) => {
      const hit = store.rows.find((r) => r.id === p.id && r.user === user);
      if (!hit) return null;
      const next = { ...hit, ...p };
      store.rows = store.rows.map((r) => (r === hit ? next : r));
      return next;
    }),
    remove: vi.fn(async (user: string, id: number) => {
      const n = store.rows.length;
      store.rows = store.rows.filter((r) => !(r.id === id && r.user === user));
      return store.rows.length < n;
    }),
  },
}));

import { DELETE, GET, PATCH, POST } from "@/app/api/goals/route";
import { goals } from "@/lib/db";

const json = (method: string, body: string, url = "http://x/api/goals") => new Request(url, { method, body });
const goal = { scope: "day", period_start: "2026-10-14", text: "run" };

beforeEach(() => {
  store.rows = [{ id: 100, user: "other", scope: "day", period_start: "2026-10-14", text: "secret", done: false, position: 0 }];
  store.next = 1;
  getUser.mockReset().mockResolvedValue({ id: "me", accessToken: "t" });
  vi.clearAllMocks();
});

describe("auth first", () => {
  it("401 on every handler, before the body is read or parsed", async () => {
    getUser.mockResolvedValue(null);
    const bodyRead = vi.fn();
    const req = new Request("http://x/api/goals?id=1", { method: "POST", body: "{not json" });
    req.json = bodyRead;
    expect((await GET(new Request("http://x/api/goals"))).status).toBe(401);
    expect((await POST(req)).status).toBe(401);
    expect((await PATCH(req)).status).toBe(401);
    expect((await DELETE(new Request("http://x/api/goals?id=1", { method: "DELETE" }))).status).toBe(401);
    expect(bodyRead).not.toHaveBeenCalled();
    expect(goals.add).not.toHaveBeenCalled();
  });
});

describe("bad input", () => {
  it("400 on malformed JSON without leaking details", async () => {
    for (const h of [POST, PATCH]) {
      const res = await h(json("POST", "{oops"));
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "bad json" });
    }
  });
  it("400 on invalid payloads and queries", async () => {
    expect((await POST(json("POST", JSON.stringify({ ...goal, text: " " })))).status).toBe(400);
    expect((await POST(json("POST", JSON.stringify({ ...goal, scope: "week" })))).status).toBe(400); // Wednesday
    expect((await PATCH(json("PATCH", JSON.stringify({ id: 1 })))).status).toBe(400);
    expect((await DELETE(new Request("http://x/api/goals?id=abc", { method: "DELETE" }))).status).toBe(400);
    expect((await GET(new Request("http://x/api/goals?scope=day&from=2026-10-01"))).status).toBe(400);
  });
});

describe("happy path and ownership", () => {
  it("creates for the signed-in user and lists only their goals", async () => {
    const res = await POST(json("POST", JSON.stringify(goal)));
    expect(res.status).toBe(201);
    expect(goals.add).toHaveBeenCalledWith("me", goal);
    const list = await (await GET(new Request("http://x/api/goals?scope=day&from=2026-10-14&to=2026-10-14"))).json();
    expect(list.map((g: GoalRow) => g.text)).toEqual(["run"]);
  });
  it("cannot PATCH or DELETE another user's goal (404, row untouched)", async () => {
    expect((await PATCH(json("PATCH", JSON.stringify({ id: 100, done: true })))).status).toBe(404);
    expect((await DELETE(new Request("http://x/api/goals?id=100", { method: "DELETE" }))).status).toBe(404);
    expect(store.rows.find((r) => r.id === 100)?.done).toBe(false);
    expect(goals.update).toHaveBeenCalledWith("me", { id: 100, done: true });
    expect(goals.remove).toHaveBeenCalledWith("me", 100);
  });
  it("patches and deletes one's own goal", async () => {
    await POST(json("POST", JSON.stringify(goal)));
    expect((await (await PATCH(json("PATCH", JSON.stringify({ id: 1, done: true })))).json()).done).toBe(true);
    expect((await DELETE(new Request("http://x/api/goals?id=1", { method: "DELETE" }))).status).toBe(200);
  });
  it("400 when the db reports the hard limit", async () => {
    vi.mocked(goals.add).mockResolvedValueOnce(null);
    const res = await POST(json("POST", JSON.stringify(goal)));
    expect(res.status).toBe(400);
  });
});
