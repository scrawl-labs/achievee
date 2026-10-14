import { describe, expect, it } from "vitest";
import {
  defaultActiveIndex, filterCommands, hitTarget, isImeEvent, isPaletteShortcut, moveIndex, parseDateInput, parseGoalCommand, parseSearchResponse, searchQuery, type SearchHit,
} from "@/lib/commandBar";

const TODAY = "2026-10-14";

describe("parseDateInput", () => {
  it("accepts YYYY-MM-DD and rejects impossible days", () => {
    expect(parseDateInput("2026-10-20", TODAY)).toBe("2026-10-20");
    expect(parseDateInput("2026-02-31", TODAY)).toBeNull();
    expect(parseDateInput("2026-13-01", TODAY)).toBeNull();
  });
  it("accepts M/D in the current year (padded or not) and rejects impossible days", () => {
    expect(parseDateInput("3/7", TODAY)).toBe("2026-03-07");
    expect(parseDateInput("12/25", TODAY)).toBe("2026-12-25");
    expect(parseDateInput("2/30", TODAY)).toBeNull();
    expect(parseDateInput("13/1", TODAY)).toBeNull();
    expect(parseDateInput("2/29", TODAY)).toBeNull(); // 2026 is not a leap year
  });
  it("understands relative words in every language", () => {
    for (const w of ["오늘", "today", "Today", "hoy", "今日", "今天"]) expect(parseDateInput(w, TODAY)).toBe(TODAY);
    for (const w of ["내일", "tomorrow", "mañana", "明日", "明天"]) expect(parseDateInput(w, TODAY)).toBe("2026-10-15");
    for (const w of ["어제", "yesterday", "ayer", "昨日", "昨天"]) expect(parseDateInput(w, TODAY)).toBe("2026-10-13");
  });
  it("understands 월/일 style input", () => {
    expect(parseDateInput("10월 5일", TODAY)).toBe("2026-10-05");
    expect(parseDateInput("10月5日", TODAY)).toBe("2026-10-05");
    expect(parseDateInput("2월 31일", TODAY)).toBeNull();
  });
  it("trims, and ignores everything else", () => {
    expect(parseDateInput("  내일  ", TODAY)).toBe("2026-10-15");
    expect(parseDateInput("", TODAY)).toBeNull();
    expect(parseDateInput("hello", TODAY)).toBeNull();
    expect(parseDateInput("10/14 lunch", TODAY)).toBeNull();
  });
  it("rolls over the year boundary for relative words", () => {
    expect(parseDateInput("tomorrow", "2026-12-31")).toBe("2027-01-01");
  });
});

describe("parseGoalCommand", () => {
  it("extracts the text after the keyword", () => {
    expect(parseGoalCommand("목표 책 읽기")).toBe("책 읽기");
    expect(parseGoalCommand("goal read a book")).toBe("read a book");
    expect(parseGoalCommand("GOAL  Run ")).toBe("Run");
    expect(parseGoalCommand("目標 散步")).toBe("散步");
    expect(parseGoalCommand("objetivo leer")).toBe("leer");
  });
  it("needs a keyword AND text", () => {
    expect(parseGoalCommand("목표")).toBeNull();
    expect(parseGoalCommand("goal   ")).toBeNull();
    expect(parseGoalCommand("goals are fun")).toBeNull();
    expect(parseGoalCommand("목표책")).toBeNull();
    expect(parseGoalCommand("read goal")).toBeNull();
  });
  it("rejects text the server would reject (over 200 chars)", () => {
    expect(parseGoalCommand(`goal ${"a".repeat(200)}`)).toBe("a".repeat(200));
    expect(parseGoalCommand(`goal ${"a".repeat(201)}`)).toBeNull();
  });
});

describe("filterCommands", () => {
  const cmds = [{ label: "Calendar" }, { label: "Stats" }, { label: "Diary" }, { label: "Google Calendar", keywords: "gcal" }, { label: "Go to today" }];
  it("returns everything for an empty query", () => expect(filterCommands(cmds, "  ")).toEqual(cmds));
  it("matches substrings case-insensitively, best (earliest/prefix) first", () => {
    expect(filterCommands(cmds, "cal").map((c) => c.label)).toEqual(["Calendar", "Google Calendar"]);
    expect(filterCommands(cmds, "DIA").map((c) => c.label)).toEqual(["Diary"]);
  });
  it("matches keywords", () => expect(filterCommands(cmds, "gcal").map((c) => c.label)).toEqual(["Google Calendar"]));
  it("falls back to subsequence (fuzzy) matches after substring matches", () => {
    expect(filterCommands(cmds, "gtt").map((c) => c.label)).toEqual(["Go to today"]);
    expect(filterCommands(cmds, "zzz")).toEqual([]);
  });
  it("does not mutate its input", () => {
    const copy = [...cmds];
    filterCommands(cmds, "cal");
    expect(cmds).toEqual(copy);
  });
});

describe("hitTarget", () => {
  const hit = (over: Partial<SearchHit>): SearchHit => ({ type: "goal", date: "2026-10-14", title: "t", ...over });
  it("day goals open that day in the calendar", () => expect(hitTarget(hit({ scope: "day" }))).toEqual({ tab: "calendar", date: "2026-10-14" }));
  it("goals without a scope are treated as day goals", () => expect(hitTarget(hit({}))).toEqual({ tab: "calendar", date: "2026-10-14" }));
  it("week goals open the calendar on the week's start date", () =>
    expect(hitTarget(hit({ scope: "week", date: "2026-10-12" }))).toEqual({ tab: "calendar", date: "2026-10-12" }));
  it("maps each record type to its tab", () => {
    expect(hitTarget(hit({ type: "diary" })).tab).toBe("diary");
    expect(hitTarget(hit({ type: "expense" })).tab).toBe("expense");
    expect(hitTarget(hit({ type: "income" })).tab).toBe("expense");
    expect(hitTarget(hit({ type: "saving" })).tab).toBe("expense");
    expect(hitTarget(hit({ type: "workout" })).tab).toBe("workout");
  });
  it("keeps the hit's date", () => expect(hitTarget(hit({ type: "diary", date: "2025-01-02" })).date).toBe("2025-01-02"));
});

describe("moveIndex", () => {
  it("wraps in both directions", () => {
    expect(moveIndex(0, 1, 3)).toBe(1);
    expect(moveIndex(2, 1, 3)).toBe(0);
    expect(moveIndex(0, -1, 3)).toBe(2);
  });
  it("returns -1 for an empty list and clamps a stale index", () => {
    expect(moveIndex(0, 1, 0)).toBe(-1);
    expect(moveIndex(7, 1, 3)).toBe(0);
    expect(moveIndex(-1, 1, 3)).toBe(0);
    expect(moveIndex(-1, -1, 3)).toBe(2);
  });
});

describe("searchQuery", () => {
  it("only searches 2..50 characters after trimming", () => {
    expect(searchQuery("a")).toBeNull();
    expect(searchQuery("  a  ")).toBeNull();
    expect(searchQuery(" ab ")).toBe("ab");
    expect(searchQuery("가나")).toBe("가나");
    expect(searchQuery("x".repeat(50))).toBe("x".repeat(50));
    expect(searchQuery("x".repeat(51))).toBeNull();
  });
  it("counts code points like the server (an emoji is one character, not two)", () => {
    expect(searchQuery("😀")).toBeNull();
    expect(searchQuery("😀😀")).toBe("😀😀");
    expect(searchQuery("😀".repeat(50))).toBe("😀".repeat(50));
    expect(searchQuery("😀".repeat(51))).toBeNull();
  });
});

describe("isImeEvent", () => {
  it("is true while composing or for the legacy 229 key code", () => {
    expect(isImeEvent({ isComposing: true, keyCode: 13 })).toBe(true);
    expect(isImeEvent({ isComposing: false, keyCode: 229 })).toBe(true);
    expect(isImeEvent({ isComposing: false, keyCode: 13 })).toBe(false);
  });
});

describe("parseSearchResponse", () => {
  it("keeps well-formed hits, including the week scope", () => {
    expect(parseSearchResponse({ results: [{ type: "goal", date: "2026-10-12", title: "run", scope: "week" }, { type: "diary", date: "2026-10-14", title: "hi" }] }))
      .toEqual([{ type: "goal", date: "2026-10-12", title: "run", scope: "week" }, { type: "diary", date: "2026-10-14", title: "hi" }]);
  });
  it("drops malformed entries and bad bodies instead of throwing", () => {
    expect(parseSearchResponse({ results: [{ type: "nope", date: "2026-10-14", title: "x" }, { type: "goal", date: "2026-02-31", title: "x" }, null, 5, { type: "goal", date: "2026-10-14" }] })).toEqual([]);
    expect(parseSearchResponse(null)).toEqual([]);
    expect(parseSearchResponse({ results: "x" })).toEqual([]);
    expect(parseSearchResponse({})).toEqual([]);
  });
});

describe("isPaletteShortcut", () => {
  const ev = (o: Partial<{ code: string; key: string; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean }>) =>
    ({ code: "KeyK", key: "k", metaKey: false, ctrlKey: true, shiftKey: false, altKey: false, ...o });
  it("accepts Ctrl+K and Cmd+K", () => {
    expect(isPaletteShortcut(ev({}))).toBe(true);
    expect(isPaletteShortcut(ev({ ctrlKey: false, metaKey: true }))).toBe(true);
  });
  it("works while a Korean IME is active (key is 'ㅏ' / 'Process', code stays KeyK)", () => {
    expect(isPaletteShortcut(ev({ key: "ㅏ" }))).toBe(true);
    expect(isPaletteShortcut(ev({ key: "Process" }))).toBe(true);
  });
  it("needs a modifier, and ignores Shift/Alt combos and other keys", () => {
    expect(isPaletteShortcut(ev({ ctrlKey: false }))).toBe(false);
    expect(isPaletteShortcut(ev({ shiftKey: true }))).toBe(false);
    expect(isPaletteShortcut(ev({ altKey: true }))).toBe(false);
    expect(isPaletteShortcut(ev({ code: "KeyJ", key: "j" }))).toBe(false);
  });
});

describe("defaultActiveIndex", () => {
  it("is -1 for an empty list and 0 when nothing is a goal-add", () => {
    expect(defaultActiveIndex([])).toBe(-1);
    expect(defaultActiveIndex([false, false])).toBe(0);
  });
  it("skips goal-add items so a stray Enter does not create data", () => {
    expect(defaultActiveIndex([true, true, false, false])).toBe(2);
  });
  it("falls back to the first goal-add item when it is all there is (quick add stays one Enter)", () => {
    expect(defaultActiveIndex([true, true])).toBe(0);
  });
});
