import { describe, expect, it } from "vitest";
import {
  SEARCH_RESULT_MAX, SEARCH_SNIPPET_MAX, makeSnippet, parseSearchQuery, searchHits,
  type SearchCandidate, type SearchType,
} from "@/lib/search";

const cand = (type: SearchType, date: string, text: string, scope?: "day" | "week"): SearchCandidate =>
  scope ? { type, date, text, scope } : { type, date, text };

describe("parseSearchQuery", () => {
  it("accepts 2..50 chars after trim and returns the trimmed value", () => {
    expect(parseSearchQuery("ab")).toEqual({ ok: true, value: "ab" });
    expect(parseSearchQuery("  러닝  ")).toEqual({ ok: true, value: "러닝" });
    expect(parseSearchQuery("a".repeat(50)).ok).toBe(true);
  });
  it("rejects null, empty, whitespace-only, 1 char, 51 chars", () => {
    for (const v of [null, "", "   ", "\n\t", "a", " a ", "a".repeat(51)]) expect(parseSearchQuery(v).ok).toBe(false);
  });
  it("counts characters, not UTF-16 units (emoji)", () => {
    expect(parseSearchQuery("😀".repeat(50)).ok).toBe(true);
    expect(parseSearchQuery("😀".repeat(51)).ok).toBe(false);
  });
});

describe("makeSnippet", () => {
  it("returns null when there is no match", () => {
    expect(makeSnippet("hello", "xyz")).toBeNull();
  });
  it("returns short text whole, without ellipsis", () => {
    expect(makeSnippet("morning run", "run")).toBe("morning run");
  });
  it("is exactly SNIPPET_MAX when text is exactly that long (no ellipsis)", () => {
    const t = "a".repeat(77) + "RUN";
    expect(makeSnippet(t, "run")).toBe(t);
  });
  it("adds a trailing ellipsis for a match at the start of long text", () => {
    const s = makeSnippet("run" + "x".repeat(200), "run")!;
    expect(s.startsWith("run")).toBe(true);
    expect(s.endsWith("…")).toBe(true);
    expect(s.startsWith("…")).toBe(false);
    expect(Array.from(s).length).toBeLessThanOrEqual(SEARCH_SNIPPET_MAX);
  });
  it("adds a leading ellipsis for a match at the end", () => {
    const s = makeSnippet("x".repeat(200) + "run", "run")!;
    expect(s.startsWith("…")).toBe(true);
    expect(s.endsWith("run")).toBe(true);
    expect(Array.from(s).length).toBeLessThanOrEqual(SEARCH_SNIPPET_MAX);
  });
  it("adds both ellipses for a match in the middle and keeps the match", () => {
    const s = makeSnippet("x".repeat(200) + "needle" + "y".repeat(200), "needle")!;
    expect(s.startsWith("…") && s.endsWith("…")).toBe(true);
    expect(s).toContain("needle");
    expect(Array.from(s).length).toBeLessThanOrEqual(SEARCH_SNIPPET_MAX);
  });
  it("keeps the match for every position and query length in long text", () => {
    const base = "가나다라마바사아자차카타파하".repeat(15);
    for (const len of [2, 10, 50]) {
      for (let at = 0; at + len <= base.length; at += 7) {
        const q = base.slice(at, at + len);
        const s = makeSnippet(base, q)!;
        expect(Array.from(s).length).toBeLessThanOrEqual(SEARCH_SNIPPET_MAX);
        expect(s.replace(/…/g, "").length).toBeGreaterThan(0);
        expect(s).toContain(q);
      }
    }
  });
  it("never splits a surrogate pair", () => {
    const s = makeSnippet("😀".repeat(100) + "ok" + "😀".repeat(100), "ok")!;
    expect(s).toContain("ok");
    expect(s).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/);
  });
  it("matches Korean substrings", () => {
    expect(makeSnippet("오늘은 한강에서 러닝을 했다", "러닝")).toBe("오늘은 한강에서 러닝을 했다");
  });
  it("ignores case, also for non-ASCII letters", () => {
    expect(makeSnippet("Morning RUN", "run")).toBe("Morning RUN");
    expect(makeSnippet("ÉCOLE", "école")).toBe("ÉCOLE");
  });
  it("treats special characters literally (not regex)", () => {
    expect(makeSnippet("cost is 3.5 (approx)", "3.5")).toBe("cost is 3.5 (approx)");
    expect(makeSnippet("abc", "a.c")).toBeNull();
    expect(makeSnippet("a+b=c", "a+b")).toBe("a+b=c");
    expect(makeSnippet("anything", ".*")).toBeNull();
    expect(makeSnippet("price [10]", "[10]")).toBe("price [10]");
    expect(makeSnippet("100% sure", "%")).toBe("100% sure");
  });
  it("matches across Unicode normalization forms (NFD vs NFC Hangul)", () => {
    const nfd = "오늘 러닝".normalize("NFD"), nfc = "러닝".normalize("NFC");
    expect(makeSnippet(nfd, nfc)).toBe("오늘 러닝".normalize("NFC"));
    expect(makeSnippet("오늘 러닝", "러닝".normalize("NFD"))).toBe("오늘 러닝");
  });
  it("keeps the match inside the snippet for long decomposed text", () => {
    const text = ("가나다".repeat(60) + "러닝" + "라마바".repeat(60)).normalize("NFD");
    const s = makeSnippet(text, "러닝".normalize("NFD"))!;
    expect(s).toContain("러닝");
    expect(Array.from(s).length).toBeLessThanOrEqual(SEARCH_SNIPPET_MAX);
  });
  it("counts query length after NFC (50 decomposed syllables are still 50)", () => {
    expect(parseSearchQuery("한".repeat(50).normalize("NFD")).ok).toBe(true);
  });
  it("collapses newlines and runs of whitespace into single spaces", () => {
    expect(makeSnippet("line one\n\nline   two", "one line")).toBe("line one line two");
  });
});

describe("searchHits", () => {
  it("filters by substring and maps to hits (day goal keeps its date and scope)", () => {
    const hits = searchHits([cand("goal", "2026-10-14", "Run 5km", "day"), cand("expense", "2026-10-14", "coffee")], "run");
    expect(hits).toEqual([{ type: "goal", date: "2026-10-14", title: "Run 5km", scope: "day" }]);
  });
  it("week goal carries the week start and scope, others have no scope key", () => {
    const hits = searchHits([cand("goal", "2026-10-12", "ship it", "week"), cand("diary", "2026-10-13", "ship")], "ship");
    expect(hits[1]).toEqual({ type: "goal", date: "2026-10-12", title: "ship it", scope: "week" });
    expect("scope" in hits[0]).toBe(false);
  });
  it("sorts newest date first, ties by type order", () => {
    const hits = searchHits([
      cand("workout", "2026-10-14", "x1"), cand("saving", "2026-10-14", "x2"), cand("income", "2026-10-14", "x3"),
      cand("expense", "2026-10-14", "x4"), cand("diary", "2026-10-14", "x5"), cand("goal", "2026-10-14", "x6", "day"), cand("todo", "2026-10-14", "x9"),
      cand("diary", "2026-10-15", "x7"), cand("diary", "2026-10-01", "x8"),
    ], "x");
    expect(hits.map((h) => `${h.date}:${h.type}`)).toEqual([
      "2026-10-15:diary", "2026-10-14:goal", "2026-10-14:todo", "2026-10-14:diary", "2026-10-14:expense",
      "2026-10-14:income", "2026-10-14:saving", "2026-10-14:workout", "2026-10-01:diary",
    ]);
  });
  it("a todo hit has the plain {type, date, title} shape (no scope key)", () => {
    const hits = searchHits([cand("todo", "2026-10-14", "buy Milk and eggs")], "milk");
    expect(hits).toEqual([{ type: "todo", date: "2026-10-14", title: "buy Milk and eggs" }]);
    expect("scope" in hits[0]).toBe(false);
  });
  it("caps at 30 after sorting (the newest 30 survive)", () => {
    const all = Array.from({ length: 45 }, (_, i) => cand("expense", `2026-09-${String((i % 28) + 1).padStart(2, "0")}`, `memo ${i}`));
    const newest = [...all].map((c) => c.date).sort().reverse().slice(0, SEARCH_RESULT_MAX);
    const hits = searchHits(all, "memo");
    expect(hits).toHaveLength(SEARCH_RESULT_MAX);
    expect(hits.map((h) => h.date)).toEqual(newest);
  });
  it("skips empty texts and does not mutate the input", () => {
    const input = [cand("diary", "2026-10-01", ""), cand("diary", "2026-10-02", "hi there"), cand("diary", "2026-10-03", "hi too")];
    const copy = JSON.parse(JSON.stringify(input));
    expect(searchHits(input, "hi")).toHaveLength(2);
    expect(searchHits(input, "hi")[0].date).toBe("2026-10-03");
    expect(input).toEqual(copy);
  });
});
