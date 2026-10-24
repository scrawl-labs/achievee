import { addDays, isYmd } from "./dates";
import { GOAL_TEXT_MAX, type GoalScope } from "./goals";
import type { Key } from "./i18n";
import { TODO_TEXT_MAX } from "./todosUi";

/** Pure logic behind the command bar (⌘K): parsing, filtering, navigation targets. No React, no I/O. */

export type Tab = "calendar" | "stats" | "diary" | "expense" | "workout" | "google" | "integrations" | "settings";
export type TabIcon = "calendar" | "chart" | "book" | "wallet" | "activity" | "external" | "plug" | "user";

/** Single source for the sidebar and the command list. */
export const TABS: readonly { key: Tab; label: Key; icon: TabIcon }[] = [
  { key: "calendar", label: "nav.calendar", icon: "calendar" },
  { key: "stats", label: "nav.stats", icon: "chart" },
  { key: "diary", label: "nav.diary", icon: "book" },
  { key: "expense", label: "nav.expense", icon: "wallet" },
  { key: "workout", label: "nav.workout", icon: "activity" },
  { key: "google", label: "nav.google", icon: "external" },
  { key: "integrations", label: "nav.integrations", icon: "plug" },
  { key: "settings", label: "nav.settings", icon: "user" },
];

/**
 * Phone tab bar: the four tabs used most (in this order), then "More" with everything else.
 * Daily: record, schedule, diary, spending. The rest (exercise, stats, connections) is opened less often.
 */
const PRIMARY_KEYS: readonly Tab[] = ["calendar", "google", "diary", "expense"];
export const PRIMARY_TABS = PRIMARY_KEYS.map((k) => TABS.find((t) => t.key === k)!);
export const MORE_TABS = TABS.filter((t) => !PRIMARY_KEYS.includes(t.key));

/** Shape of GET /api/search results (the server owns the real definition). */
export type HitType = "goal" | "diary" | "expense" | "income" | "saving" | "workout" | "todo";
export type SearchHit = { type: HitType; date: string; title: string; scope?: GoalScope };

export const SEARCH_MIN = 2;
export const SEARCH_MAX = 50;

const WORDS: Readonly<Record<string, number>> = {
  오늘: 0, today: 0, hoy: 0, 今日: 0, 今天: 0,
  내일: 1, tomorrow: 1, mañana: 1, manana: 1, 明日: 1, 明天: 1,
  어제: -1, yesterday: -1, ayer: -1, 昨日: -1, 昨天: -1,
};

const pad = (n: string) => n.padStart(2, "0");
const validOrNull = (iso: string) => (isYmd(iso) ? iso : null);

/**
 * "2026-10-20", "10/20", "10.20", "10월 20일", "10月20日", or today/tomorrow/yesterday (and ko/es/ja/zh words).
 * Returns a real calendar day or null: 2026-02-31 and 2/30 are rejected rather than rolled over.
 */
export function parseDateInput(raw: string, today: string): string | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  if (Object.prototype.hasOwnProperty.call(WORDS, s)) return addDays(today, WORDS[s]);
  const full = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (full) return validOrNull(`${full[1]}-${pad(full[2])}-${pad(full[3])}`);
  const md = /^(\d{1,2})\s*(?:[/.]|월|月)\s*(\d{1,2})\s*(?:일|日|号)?$/.exec(s);
  if (md) return validOrNull(`${today.slice(0, 4)}-${pad(md[1])}-${pad(md[2])}`);
  return null;
}

const GOAL_RE = /^(?:목표|goal|目標|目标|objetivo)\s+(\S[\s\S]*)$/i;

/** "목표 <text>" / "goal <text>" → the goal text, or null (no keyword, no text, or text the server would reject). */
export function parseGoalCommand(raw: string): string | null {
  const m = GOAL_RE.exec(raw.trim());
  if (!m) return null;
  const text = m[1].trim();
  return text.length >= 1 && text.length <= GOAL_TEXT_MAX ? text : null;
}

const TODO_RE = /^(?:할\s?일|todo|タスク|やること|tarea|待辦|待办)\s+(\S[\s\S]*)$/i;

/** "할일 <text>" / "todo <text>" → the to-do text, or null. Prefixes never overlap the goal command's. */
export function parseTodoCommand(raw: string): string | null {
  const m = TODO_RE.exec(raw.trim());
  if (!m) return null;
  const text = m[1].trim();
  return text.length >= 1 && text.length <= TODO_TEXT_MAX ? text : null;
}

const isSubsequence = (needle: string, hay: string) => {
  let i = 0;
  for (const ch of hay) if (ch === needle[i] && ++i === needle.length) return true;
  return needle.length === 0;
};

/** Substring matches first (earlier position wins), then fuzzy subsequence matches. Input order breaks ties. */
export function filterCommands<T extends { label: string; keywords?: string }>(items: readonly T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...items];
  const scored = items.flatMap((item, order) => {
    const label = item.label.toLowerCase();
    const hay = `${label} ${(item.keywords ?? "").toLowerCase()}`;
    const at = hay.indexOf(q);
    if (at >= 0) return [{ item, rank: at, order }];
    return isSubsequence(q, label) ? [{ item, rank: 1000, order }] : [];
  });
  return scored.sort((a, b) => a.rank - b.rank || a.order - b.order).map((s) => s.item);
}

/** Where a search hit lives. Week goals carry their week's start date, which the calendar day panel shows. */
export function hitTarget(hit: SearchHit): { tab: Tab; date: string } {
  switch (hit.type) {
    case "diary": return { tab: "diary", date: hit.date };
    case "expense":
    case "income":
    case "saving": return { tab: "expense", date: hit.date };
    case "workout": return { tab: "workout", date: hit.date };
    case "goal":
    case "todo": return { tab: "calendar", date: hit.date };
  }
}

/** Arrow-key movement with wrap-around; -1 when there is nothing to select. Tolerates a stale index. */
export function moveIndex(current: number, delta: 1 | -1, length: number): number {
  if (length <= 0) return -1;
  if (current < 0 || current >= length) return delta === 1 ? 0 : length - 1;
  return (current + delta + length) % length;
}

/** The text to send to /api/search, or null when it is outside the 2..50 characters the API accepts. */
export function searchQuery(raw: string): string | null {
  const q = raw.trim();
  const n = Array.from(q).length; // code points, like the server: an emoji is 1, not 2
  return n >= SEARCH_MIN && n <= SEARCH_MAX ? q : null;
}

/** Enter/arrow keys that belong to an IME (Korean/Japanese/Chinese composition) must not trigger actions. */
export const isImeEvent = (e: { isComposing?: boolean; keyCode?: number }) => e.isComposing === true || e.keyCode === 229;

const HIT_TYPES: readonly string[] = ["goal", "diary", "expense", "income", "saving", "workout", "todo"];

/** Defensive read of the /api/search body: keeps well-formed hits only, so an odd response can't break rendering. */
export function parseSearchResponse(body: unknown): SearchHit[] {
  if (typeof body !== "object" || body === null || !("results" in body) || !Array.isArray(body.results)) return [];
  return body.results.flatMap((r: unknown): SearchHit[] => {
    if (typeof r !== "object" || r === null) return [];
    const { type, date, title, scope } = r as Record<string, unknown>;
    if (typeof type !== "string" || !HIT_TYPES.includes(type) || typeof date !== "string" || !isYmd(date) || typeof title !== "string") return [];
    return [{ type: type as HitType, date, title, ...(scope === "day" || scope === "week" ? { scope } : {}) }];
  });
}

/**
 * ⌘K / Ctrl+K. Uses the physical key (`code`): with a Korean IME on, `key` is "ㅏ"/"Process" and keyCode is 229,
 * so neither `key` nor an IME guard may be applied here.
 */
export const isPaletteShortcut = (e: { code: string; key: string; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean }) =>
  (e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && (e.code === "KeyK" || e.key.toLowerCase() === "k");

/** Initial selection: the first item that is not "add goal/todo" (Enter on a sentence you meant to search must not create data). */
export function defaultActiveIndex(isGoalAdd: readonly boolean[]): number {
  if (isGoalAdd.length === 0) return -1;
  const i = isGoalAdd.indexOf(false);
  return i >= 0 ? i : 0;
}
