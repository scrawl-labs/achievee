import { describe, expect, it } from "vitest";
import type { DayData } from "@/lib/types";
import {
  TODO_HARD_LIMIT, TODO_ID_MAX, TODO_RANGE_MAX_DAYS, TODO_TEXT_MAX, mergeTodoCounts, parseTodoCreate, parseTodoId, parseTodoPatch, parseTodoQuery,
} from "@/lib/todos";

describe("parseTodoCreate", () => {
  const ok = { date: "2026-10-14", text: "  buy milk  " };
  it("trims text and accepts a calendar day", () => {
    expect(parseTodoCreate(ok)).toEqual({ ok: true, value: { date: "2026-10-14", text: "buy milk" } });
  });
  it("rejects bad date, non-object, array", () => {
    expect(parseTodoCreate({ ...ok, date: "2026-02-31" }).ok).toBe(false);
    expect(parseTodoCreate({ ...ok, date: undefined }).ok).toBe(false);
    expect(parseTodoCreate(null).ok).toBe(false);
    expect(parseTodoCreate([]).ok).toBe(false);
  });
  it("rejects empty, whitespace, non-string and too-long text", () => {
    for (const text of ["", "   ", 5, "a".repeat(TODO_TEXT_MAX + 1)]) expect(parseTodoCreate({ ...ok, text }).ok).toBe(false);
    expect(parseTodoCreate({ ...ok, text: "a".repeat(TODO_TEXT_MAX) }).ok).toBe(true);
  });
  it("ignores unknown fields instead of passing them on", () => {
    expect(parseTodoCreate({ ...ok, done: true, user: "x" })).toEqual({ ok: true, value: { date: "2026-10-14", text: "buy milk" } });
  });
});

describe("parseTodoPatch", () => {
  it("accepts partial updates incl. moving to another day", () => {
    expect(parseTodoPatch({ id: 3, done: true })).toEqual({ ok: true, value: { id: 3, done: true } });
    expect(parseTodoPatch({ id: 3, text: " x ", position: 2, date: "2026-10-15" })).toEqual({
      ok: true, value: { id: 3, text: "x", position: 2, date: "2026-10-15" },
    });
  });
  it("needs a valid int4 id and at least one field", () => {
    expect(parseTodoPatch({ done: true }).ok).toBe(false);
    expect(parseTodoPatch({ id: 1.5, done: true }).ok).toBe(false);
    expect(parseTodoPatch({ id: 0, done: true }).ok).toBe(false);
    expect(parseTodoPatch({ id: 3 }).ok).toBe(false);
    expect(parseTodoPatch({ id: TODO_ID_MAX, done: true }).ok).toBe(true);
    expect(parseTodoPatch({ id: TODO_ID_MAX + 1, done: true }).ok).toBe(false);
  });
  it("validates each field", () => {
    expect(parseTodoPatch({ id: 1, text: " " }).ok).toBe(false);
    expect(parseTodoPatch({ id: 1, done: "yes" }).ok).toBe(false);
    expect(parseTodoPatch({ id: 1, date: "2026-13-01" }).ok).toBe(false);
    expect(parseTodoPatch({ id: 1, date: null }).ok).toBe(false);
    for (const position of [-1, 1.5, 1001, "1"]) expect(parseTodoPatch({ id: 1, position }).ok).toBe(false);
    expect(parseTodoPatch({ id: 1, position: 0 }).ok).toBe(true);
  });
});

describe("parseTodoId", () => {
  it("accepts digits within int4 only", () => {
    expect(parseTodoId("12")).toEqual({ ok: true, value: 12 });
    for (const raw of [null, "", "abc", "-1", "1.5", "0", String(TODO_ID_MAX + 1)]) expect(parseTodoId(raw).ok).toBe(false);
  });
});

describe("parseTodoQuery", () => {
  const q = (s: string) => parseTodoQuery(new URLSearchParams(s));
  it("accepts an inclusive range up to 62 days", () => {
    expect(q("from=2026-10-01&to=2026-10-31")).toEqual({ ok: true, value: { from: "2026-10-01", to: "2026-10-31" } });
    expect(q("from=2026-10-01&to=2026-10-01").ok).toBe(true);
    expect(TODO_RANGE_MAX_DAYS).toBe(62);
    expect(q("from=2026-10-01&to=2026-12-02").ok).toBe(true); // 62 days apart
    expect(q("from=2026-10-01&to=2026-12-03").ok).toBe(false);
  });
  it("rejects missing, malformed and reversed ranges", () => {
    expect(q("from=2026-10-01").ok).toBe(false);
    expect(q("from=2026-10-01&to=2026-02-31").ok).toBe(false);
    expect(q("from=2026-10-02&to=2026-10-01").ok).toBe(false);
  });
});

describe("limits", () => {
  it("per-day hard limit is 50", () => expect(TODO_HARD_LIMIT).toBe(50));
});

const day = (date: string, done = 0, total = 0): DayData => ({ date, done, total, events: 1, tasks: [{ title: "g", done: false }], eventList: [] });

describe("mergeTodoCounts", () => {
  const days = { "2026-10-01": day("2026-10-01", 1, 2), "2026-10-02": day("2026-10-02") };
  it("adds done/total on top of the Google counts and keeps everything else", () => {
    const out = mergeTodoCounts(days, [
      { date: "2026-10-01", done: true }, { date: "2026-10-01", done: false }, { date: "2026-10-02", done: false },
    ]);
    expect(out["2026-10-01"]).toEqual({ ...days["2026-10-01"], done: 2, total: 4 });
    expect(out["2026-10-02"]).toEqual({ ...days["2026-10-02"], done: 0, total: 1 });
    expect(out["2026-10-01"].tasks).toEqual(days["2026-10-01"].tasks); // google tasks list untouched
  });
  it("ignores todos outside the month's days", () => {
    const out = mergeTodoCounts(days, [{ date: "2026-11-01", done: true }, { date: "2026-09-30", done: true }]);
    expect(out).toEqual(days);
    expect(Object.keys(out)).toEqual(Object.keys(days));
  });
  it("never mutates its input", () => {
    const frozen = Object.freeze({ "2026-10-01": Object.freeze({ ...day("2026-10-01"), tasks: Object.freeze([]) as never }) });
    const out = mergeTodoCounts(frozen, [{ date: "2026-10-01", done: true }]);
    expect(frozen["2026-10-01"].total).toBe(0);
    expect(out["2026-10-01"].total).toBe(1);
    expect(out).not.toBe(frozen);
  });
  it("returns an equal copy for no todos", () => {
    expect(mergeTodoCounts(days, [])).toEqual(days);
  });
});
