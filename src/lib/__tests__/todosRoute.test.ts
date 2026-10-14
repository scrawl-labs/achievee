import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TodoRow } from "@/lib/todos";

type Stored = TodoRow & { user: string };
const { getUser, store } = vi.hoisted(() => ({ getUser: vi.fn(), store: { rows: [] as Stored[], next: 1 } }));
vi.mock("@/lib/auth", () => ({ getUser }));
const LIMIT = 2; // stand-in for the DB-side per-day limit
const strip = ({ user: _u, ...r }: Stored): TodoRow => r;
// In-memory stand-in for the db module that scopes every operation by user, like the real WHERE clauses.
vi.mock("@/lib/db", () => ({
  todos: {
    range: vi.fn(async (user: string, from: string, to: string) =>
      store.rows.filter((r) => r.user === user && r.date >= from && r.date <= to)
        .sort((a, b) => a.date.localeCompare(b.date) || a.position - b.position || a.id - b.id).map(strip)),
    add: vi.fn(async (user: string, t: { date: string; text: string }) => {
      if (store.rows.filter((r) => r.user === user && r.date === t.date).length >= LIMIT) return null;
      const row = { ...t, id: store.next++, user, done: false, position: 0 };
      store.rows = [...store.rows, row];
      return strip(row);
    }),
    update: vi.fn(async (user: string, p: { id: number; date?: string }) => {
      const hit = store.rows.find((r) => r.id === p.id && r.user === user);
      if (!hit) return null;
      if (p.date && p.date !== hit.date && store.rows.filter((r) => r.user === user && r.date === p.date).length >= LIMIT) return "full";
      const next = { ...hit, ...p };
      store.rows = store.rows.map((r) => (r === hit ? next : r));
      return strip(next);
    }),
    remove: vi.fn(async (user: string, id: number) => {
      const n = store.rows.length;
      store.rows = store.rows.filter((r) => !(r.id === id && r.user === user));
      return store.rows.length < n;
    }),
  },
}));

import { DELETE, GET, PATCH, POST } from "@/app/api/todos/route";
import { todos } from "@/lib/db";

const json = (method: string, body: string, url = "http://x/api/todos") => new Request(url, { method, body });
const todo = { date: "2026-10-14", text: "milk" };
const list = (qs: string) => GET(new Request(`http://x/api/todos?${qs}`));

beforeEach(() => {
  store.rows = [{ id: 100, user: "other", date: "2026-10-14", text: "secret", done: false, position: 0 }];
  store.next = 1;
  getUser.mockReset().mockResolvedValue({ id: "me", accessToken: "t" });
  vi.clearAllMocks();
});

describe("auth first", () => {
  it("401 on every handler, before the body is read or parsed", async () => {
    getUser.mockResolvedValue(null);
    const bodyRead = vi.fn();
    const req = new Request("http://x/api/todos?id=1", { method: "POST", body: "{not json" });
    req.json = bodyRead;
    expect((await GET(new Request("http://x/api/todos"))).status).toBe(401);
    expect((await POST(req)).status).toBe(401);
    expect((await PATCH(req)).status).toBe(401);
    expect((await DELETE(new Request("http://x/api/todos?id=1", { method: "DELETE" }))).status).toBe(401);
    expect(bodyRead).not.toHaveBeenCalled();
    expect(todos.add).not.toHaveBeenCalled();
    expect(todos.range).not.toHaveBeenCalled();
  });
});

describe("bad input", () => {
  it("400 on malformed JSON with a fixed message", async () => {
    for (const h of [POST, PATCH]) {
      const res = await h(json("POST", "{oops"));
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "bad json" });
    }
  });
  it("400 on invalid payloads and queries", async () => {
    expect((await POST(json("POST", JSON.stringify({ ...todo, text: " " })))).status).toBe(400);
    expect((await POST(json("POST", JSON.stringify({ ...todo, date: "2026-02-31" })))).status).toBe(400);
    expect((await PATCH(json("PATCH", JSON.stringify({ id: 1 })))).status).toBe(400);
    expect((await DELETE(new Request("http://x/api/todos?id=abc", { method: "DELETE" }))).status).toBe(400);
    expect((await list("from=2026-10-01")).status).toBe(400);
    expect((await list("from=2026-01-01&to=2026-12-31")).status).toBe(400);
    expect(todos.add).not.toHaveBeenCalled();
  });
});

describe("happy path and ownership", () => {
  it("creates for the signed-in user (201, contract shape) and lists only their todos", async () => {
    const res = await POST(json("POST", JSON.stringify(todo)));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: 1, date: "2026-10-14", text: "milk", done: false, position: 0 });
    expect(todos.add).toHaveBeenCalledWith("me", todo);
    const body = await (await list("from=2026-10-14&to=2026-10-14")).json();
    expect(body.map((t: TodoRow) => t.text)).toEqual(["milk"]);
    expect(JSON.stringify(body)).not.toContain("secret");
    expect(JSON.stringify(body)).not.toContain("user");
  });
  it("cannot PATCH or DELETE another user's todo (404, row untouched)", async () => {
    expect((await PATCH(json("PATCH", JSON.stringify({ id: 100, done: true })))).status).toBe(404);
    expect((await DELETE(new Request("http://x/api/todos?id=100", { method: "DELETE" }))).status).toBe(404);
    expect(store.rows.find((r) => r.id === 100)?.done).toBe(false);
    expect(todos.update).toHaveBeenCalledWith("me", { id: 100, done: true });
    expect(todos.remove).toHaveBeenCalledWith("me", 100);
  });
  it("patches (incl. moving to another day) and deletes one's own todo", async () => {
    await POST(json("POST", JSON.stringify(todo)));
    expect((await (await PATCH(json("PATCH", JSON.stringify({ id: 1, done: true })))).json()).done).toBe(true);
    expect((await (await PATCH(json("PATCH", JSON.stringify({ id: 1, date: "2026-10-15" })))).json()).date).toBe("2026-10-15");
    const del = await DELETE(new Request("http://x/api/todos?id=1", { method: "DELETE" }));
    expect(del.status).toBe(200);
    expect(await del.json()).toEqual({ ok: true });
  });
  it("400 'too many todos' when the day is full (create and move)", async () => {
    await POST(json("POST", JSON.stringify(todo)));
    await POST(json("POST", JSON.stringify(todo)));
    const res = await POST(json("POST", JSON.stringify(todo)));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "too many todos" });
    await POST(json("POST", JSON.stringify({ ...todo, date: "2026-10-20" })));
    const mv = await PATCH(json("PATCH", JSON.stringify({ id: 3, date: "2026-10-14" })));
    expect(mv.status).toBe(400);
    expect(await mv.json()).toEqual({ error: "too many todos" });
  });
});
