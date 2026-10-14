import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchMonth } from "@/lib/google";
import { calendarList, stubGoogle, type Route } from "./mockGoogle";

afterEach(() => vi.unstubAllGlobals());

const noEvents: Route[] = [
  calendarList([]),
];

describe("task lists pagination", () => {
  it("follows nextPageToken until every list is collected", async () => {
    const listPages: Record<string, unknown> = {
      "": { items: [{ id: "L1" }, { id: "L2" }], nextPageToken: "p2" },
      p2: { items: [{ id: "L3" }], nextPageToken: "p3" },
      p3: { items: [{ id: "L4" }] },
    };
    const calls = stubGoogle([
      ...noEvents,
      { match: /\/users\/@me\/lists$/, reply: (u) => listPages[u.searchParams.get("pageToken") ?? ""] },
      { match: /\/lists\/(L\d)\/tasks$/, reply: () => ({ items: [] }) },
    ]);
    await fetchMonth("2026-03", "tok", "Asia/Seoul");
    const queried = calls.filter((c) => /\/lists\/L\d\/tasks/.test(c)).map((c) => /lists\/(L\d)/.exec(c)![1]).sort();
    expect(queried).toEqual(["L1", "L2", "L3", "L4"]);
  });

  it("collects tasks from lists on later pages", async () => {
    stubGoogle([
      ...noEvents,
      { match: /\/users\/@me\/lists$/, reply: (u) =>
        u.searchParams.get("pageToken") ? { items: [{ id: "L2" }] } : { items: [{ id: "L1" }], nextPageToken: "x" } },
      { match: /\/lists\/L1\/tasks$/, reply: () => ({ items: [] }) },
      { match: /\/lists\/L2\/tasks$/, reply: () => ({ items: [{ title: "late", due: "2026-03-10T00:00:00.000Z", status: "needsAction" }] }) },
    ]);
    const month = await fetchMonth("2026-03", "tok", "Asia/Seoul");
    expect(month["2026-03-10"].total).toBe(1);
  });
});

describe("task attribution and counts", () => {
  const tasks = [
    { title: " done ", due: "2026-03-05T00:00:00.000Z", status: "completed", completed: "2026-03-07T01:00:00.000Z" },
    { title: "open", due: "2026-03-05T00:00:00.000Z", status: "needsAction" },
    { title: "no due", status: "completed", completed: "2026-03-09T01:00:00.000Z" },
    { title: "outside", due: "2026-04-02T00:00:00.000Z", status: "needsAction" },
  ];
  const run = () => {
    stubGoogle([
      ...noEvents,
      { match: /\/users\/@me\/lists$/, reply: () => ({ items: [{ id: "L1" }] }) },
      { match: /\/lists\/L1\/tasks$/, reply: () => ({ items: tasks }) },
    ]);
    return fetchMonth("2026-03", "tok", "Asia/Seoul");
  };

  it("attributes by due date (not completion) and counts done/total", async () => {
    const d = (await run())["2026-03-05"];
    expect(d.total).toBe(2);
    expect(d.done).toBe(1);
    expect(d.tasks).toEqual([{ title: "open", done: false }, { title: "done", done: true }]); // unfinished first, trimmed
    expect((await run())["2026-03-07"].total).toBe(0);
  });

  it("falls back to completion date when there is no due date; ignores out-of-month", async () => {
    const month = await run();
    expect(month["2026-03-09"]).toMatchObject({ total: 1, done: 1 });
    const total = Object.values(month).reduce((n, d) => n + d.total, 0);
    expect(total).toBe(3);
  });
});
