import type { Parsed } from "./goals";

export type SearchType = "goal" | "todo" | "diary" | "expense" | "income" | "saving" | "workout";
export type SearchScope = "day" | "week";
export type SearchHit = { type: SearchType; date: string; title: string; scope?: SearchScope };
/** A decrypted, searchable text with its owning date (a week goal's date is its Monday). */
export type SearchCandidate = { type: SearchType; date: string; text: string; scope?: SearchScope };

/** Tie-break order for hits on the same date. */
export const SEARCH_TYPE_ORDER: readonly SearchType[] = ["goal", "todo", "diary", "expense", "income", "saving", "workout"];
export const SEARCH_QUERY_MIN = 2;
export const SEARCH_QUERY_MAX = 50;
export const SEARCH_RESULT_MAX = 30;
/** Snippet length in characters, ellipses included. */
export const SEARCH_SNIPPET_MAX = 80;
/**
 * Newest rows fetched per table. The text columns are encrypted at rest, so the database cannot LIKE-filter them:
 * we decrypt on the server and match in memory. A personal log is small (a few rows a day), so 1000 recent rows per
 * table (about 3 years of daily entries) keeps decrypt cost and memory bounded; older rows are intentionally not searched.
 */
export const SEARCH_ROW_LIMIT = 1000;

const ELLIPSIS = "…";
/** NFC first so decomposed (NFD) Hangul/accents from other input sources match, and offsets stay on one normalized string. */
const collapse = (s: string) => s.normalize("NFC").replace(/\s+/g, " ").trim();
/** Code points, so surrogate pairs are never cut. */
const chars = (s: string): string[] => Array.from(s);
/** Per-code-point lowercase; a char whose lowercase is not exactly one code point stays as-is, so positions line up. */
const fold = (cs: readonly string[]): string[] =>
  cs.map((c) => { const l = c.toLowerCase(); return chars(l).length === 1 ? l : c; });

export function parseSearchQuery(raw: string | null): Parsed<string> {
  const q = (raw ?? "").trim().normalize("NFC");
  const n = chars(q).length;
  return n >= SEARCH_QUERY_MIN && n <= SEARCH_QUERY_MAX ? { ok: true, value: q } : { ok: false, error: "bad query" };
}

function indexOfSeq(hay: readonly string[], needle: readonly string[]): number {
  for (let i = 0; i + needle.length <= hay.length; i++) {
    let j = 0;
    while (j < needle.length && hay[i + j] === needle[j]) j++;
    if (j === needle.length) return i;
  }
  return -1;
}

/**
 * Up to SEARCH_SNIPPET_MAX chars around the first case-insensitive literal match, with "…" where text was cut.
 * Whitespace runs collapse to one space. Null when the text does not contain the query.
 */
export function makeSnippet(text: string, query: string): string | null {
  const cs = chars(collapse(text));
  const needle = fold(chars(collapse(query)));
  const at = needle.length > 0 ? indexOfSeq(fold(cs), needle) : -1;
  if (at < 0) return null;
  if (cs.length <= SEARCH_SNIPPET_MAX) return cs.join("");
  const pad = Math.floor((SEARCH_SNIPPET_MAX - needle.length) / 2);
  const end = Math.min(cs.length, Math.max(0, at - pad) + SEARCH_SNIPPET_MAX);
  const start = Math.max(0, end - SEARCH_SNIPPET_MAX);
  const head = start > 0, tail = end < cs.length;
  return (head ? ELLIPSIS : "") + cs.slice(start + (head ? 1 : 0), end - (tail ? 1 : 0)).join("") + (tail ? ELLIPSIS : "");
}

const toHit = (c: SearchCandidate, title: string): SearchHit =>
  c.scope ? { type: c.type, date: c.date, title, scope: c.scope } : { type: c.type, date: c.date, title };

export function filterHits(candidates: readonly SearchCandidate[], query: string): SearchHit[] {
  return candidates.flatMap((c) => {
    const title = makeSnippet(c.text, query);
    return title === null ? [] : [toHit(c, title)];
  });
}

/** Newest date first; same date by SEARCH_TYPE_ORDER. Returns a new array. */
export function sortHits(hits: readonly SearchHit[]): SearchHit[] {
  return [...hits].sort((a, b) =>
    a.date === b.date ? SEARCH_TYPE_ORDER.indexOf(a.type) - SEARCH_TYPE_ORDER.indexOf(b.type) : a.date < b.date ? 1 : -1);
}

/** Filter, sort, then cap, so the cap keeps the newest hits. */
export function searchHits(candidates: readonly SearchCandidate[], query: string): SearchHit[] {
  return sortHits(filterHits(candidates, query)).slice(0, SEARCH_RESULT_MAX);
}
