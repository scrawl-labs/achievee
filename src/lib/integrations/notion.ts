import { addDays } from "../dates";
import { localDate } from "../tz";
import type { WorkItem } from "./types";

export type NotionConfig = { token: string };
const API = "https://api.notion.com/v1";
const MAX_PAGES = 3;

async function notion<T>(path: string, token: string, body?: unknown): Promise<T> {
  const r = await fetch(API + path, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${token}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store", signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error(`notion ${r.status}`);
  return r.json() as Promise<T>;
}

/** Checks the integration secret and returns the workspace it belongs to. */
export async function notionVerify(token: string): Promise<{ name: string }> {
  const me = await notion<{ name?: string; bot?: { workspace_name?: string | null } }>("/users/me", token);
  return { name: me.bot?.workspace_name || me.name || "Notion" };
}

type Page = {
  id: string; url: string; created_time: string; last_edited_time: string; archived?: boolean;
  properties?: Record<string, { type: string; title?: { plain_text: string }[] }>;
};
const titleOf = (p: Page) => {
  const t = Object.values(p.properties ?? {}).find((x) => x.type === "title");
  return (t?.title ?? []).map((s) => s.plain_text).join("").trim() || "Untitled";
};

/**
 * Pages (including database rows) that the integration can see and that were created or edited in [from, to) (dates in `tz`).
 * The user decides what is visible by sharing pages with the integration in Notion. Only titles and links are read.
 */
export async function notionItems(cfg: NotionConfig, from: string, to: string, tz: string): Promise<WorkItem[]> {
  const floor = Date.parse(`${addDays(from, -1)}T00:00:00Z`);
  const pages: Page[] = [];
  let cursor: string | undefined;
  for (let i = 0; i < MAX_PAGES; i++) {
    const r = await notion<{ results: Page[]; has_more: boolean; next_cursor: string | null }>("/search", cfg.token, {
      filter: { property: "object", value: "page" }, sort: { direction: "descending", timestamp: "last_edited_time" },
      page_size: 100, ...(cursor ? { start_cursor: cursor } : {}),
    });
    pages.push(...r.results);
    const oldest = r.results[r.results.length - 1];
    if (!r.has_more || !r.next_cursor || !oldest || Date.parse(oldest.last_edited_time) < floor) break; // sorted newest first
    cursor = r.next_cursor;
  }
  return mapNotion(pages, from, to, tz);
}

export function mapNotion(pages: Page[], from: string, to: string, tz: string): WorkItem[] {
  const out: WorkItem[] = [];
  for (const p of pages) {
    if (p.archived) continue;
    const edited = localDate(Date.parse(p.last_edited_time), tz), created = localDate(Date.parse(p.created_time), tz);
    if (edited < from || edited >= to) continue;
    const kind = created === edited ? "created" : "edited";
    out.push({ id: `notion:${p.id}`, source: "notion", kind, title: titleOf(p), url: p.url, ref: "", date: edited });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
