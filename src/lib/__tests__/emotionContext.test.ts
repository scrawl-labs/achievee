import { describe, expect, it } from "vitest";
import { contexts, portrait, MIN_FAMILY_DAYS } from "../emotionContext";
import { WORDS, VALENCE, WORD_IDS, FAMILIES } from "../emotions";

const day = (n: number) => new Date(Date.parse("2026-08-01") + n * 864e5).toISOString().slice(0, 10);

describe("emotion vocabulary", () => {
  it("has a description in both languages, a pleasantness level, and a known family for every word", () => {
    const fams = new Set(FAMILIES.map((f) => f.id));
    for (const w of WORDS) {
      expect(w.ko[0] && w.ko[1] && w.en[0] && w.en[1], w.id).toBeTruthy();
      expect(typeof VALENCE[w.id], w.id).toBe("number");
      expect(fams.has(w.family), w.id).toBe(true);
    }
    expect(WORD_IDS.size).toBe(WORDS.length);
    expect(new Set(WORDS.map((w) => w.ko[0])).size).toBe(WORDS.length);
  });
});

describe("contexts", () => {
  const sad = (n: number) => ({ date: day(n), ids: ["sad"] });
  const joy = (n: number) => ({ date: day(n), ids: ["glad"] });
  it("reports a family that goes with exercise (or not) once both sides have enough days", () => {
    const days = [...Array.from({ length: 6 }, (_, i) => sad(i)), ...Array.from({ length: 6 }, (_, i) => joy(10 + i))];
    const exercised = new Set(Array.from({ length: 6 }, (_, i) => day(10 + i)));
    const c = contexts(days, exercised);
    const s = c.find((x) => x.family === "sad")!;
    expect(s).toMatchObject({ withDays: 6, withRate: 0, otherDays: 6, otherRate: 1 });
    expect(c.find((x) => x.family === "joy")).toMatchObject({ withRate: 1, otherRate: 0 });
  });
  it("says nothing when a side is too small or the gap is small", () => {
    const few = [...Array.from({ length: MIN_FAMILY_DAYS - 1 }, (_, i) => sad(i)), ...Array.from({ length: 8 }, (_, i) => joy(10 + i))];
    expect(contexts(few, new Set(few.map((d) => d.date))).find((x) => x.family === "sad")).toBeUndefined();
    const even = Array.from({ length: 12 }, (_, i) => (i % 2 ? sad(i) : joy(i)));
    expect(contexts(even, new Set(even.filter((_, i) => i % 4 < 2).map((d) => d.date)))).toEqual([]);
  });
});

describe("portrait", () => {
  it("needs a few days before naming anything", () => {
    expect(portrait([{ date: day(0), ids: ["sad"] }]).topFamily).toBeNull();
    expect(portrait([]).days).toBe(0);
  });
  it("finds the top family and words and splits pleasant from unpleasant", () => {
    const p = portrait([{ date: day(0), ids: ["sad", "gloomy"] }, { date: day(1), ids: ["sad"] }, { date: day(2), ids: ["glad"] }]);
    expect(p.topFamily).toBe("sad");
    expect(p.topWords[0]).toBe("sad");
    expect(p.pleasant).toBe(25);
    expect(p.unpleasant).toBe(75);
  });
  it("names the lightest and heaviest weekday only when they differ enough", () => {
    // 2026-08-03 is a Monday (1), 2026-08-04 a Tuesday (2)
    const mon = [0, 7, 14].map((n) => ({ date: day(2 + n), ids: ["glad"] })), tue = [0, 7, 14].map((n) => ({ date: day(3 + n), ids: ["sad"] }));
    const p = portrait([...mon, ...tue]);
    expect(p.lightest).toBe(1);
    expect(p.heaviest).toBe(2);
    expect(portrait([...mon, ...mon.map((d) => ({ ...d, date: day(3 + (Date.parse(d.date) - Date.parse(day(2))) / 864e5) }))]).lightest).toBeNull();
  });
});
