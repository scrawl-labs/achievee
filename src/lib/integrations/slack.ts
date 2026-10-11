import { addDays } from "../dates";
import { localDate } from "../tz";
import type { WorkItem } from "./types";

export type SlackConfig = { token: string; userId: string; team: string; url: string };
const API = "https://slack.com/api";
const MAX_PAGES = 3; // 100 messages per page; busy months are counted up to this limit (search is rate limited)

async function slack<T>(method: string, token: string, params: Record<string, string> = {}): Promise<T> {
  const r = await fetch(`${API}/${method}?${new URLSearchParams(params)}`, {
    headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error(`slack ${r.status}`);
  const j = (await r.json()) as T & { ok: boolean; error?: string };
  if (!j.ok) throw new Error(`slack ${j.error}`); // Slack answers 200 with ok:false for bad tokens / missing scopes
  return j;
}

/** Checks the token (a user token with the search:read scope) and returns the account and workspace it belongs to. */
export async function slackVerify(token: string): Promise<{ userId: string; user: string; team: string; url: string }> {
  const a = await slack<{ user_id: string; user: string; team: string; url: string }>("auth.test", token);
  // the link only ever points at the user's own workspace on slack.com
  const url = /^https:\/\/[a-z0-9-]+\.slack\.com\/?$/i.test(a.url) ? a.url : "https://app.slack.com/";
  await slack("search.messages", token, { query: "from:me", count: "1" }); // fails with missing_scope when search:read is not granted
  return { userId: a.user_id, user: a.user, team: a.team, url };
}

type Match = { ts: string };

/** Timestamps of the messages matching `query` (newest first), up to MAX_PAGES pages. Message text is never read or kept. */
async function matches(token: string, query: string): Promise<number[]> {
  const out: number[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const r = await slack<{ messages: { matches: Match[]; paging: { pages: number } } }>("search.messages", token, {
      query, count: "100", page: String(page), sort: "timestamp", sort_dir: "desc",
    });
    out.push(...r.messages.matches.map((m) => Number(m.ts) * 1000));
    if (page >= r.messages.paging.pages) break;
  }
  return out;
}

/**
 * Slack activity in [from, to) (dates in `tz`) as one count per day: messages the user sent and messages that mention the user.
 * Search dates are in Slack's own timezone, so the query is widened and the days are counted locally.
 */
export async function slackItems(cfg: SlackConfig, from: string, to: string, tz: string): Promise<WorkItem[]> {
  const range = `after:${addDays(from, -2)} before:${addDays(to, 1)}`;
  const [sent, mentioned] = await Promise.all([
    matches(cfg.token, `from:me ${range}`),
    matches(cfg.token, `<@${cfg.userId}> -from:me ${range}`),
  ]);
  return mapSlack(sent, mentioned, cfg, from, to, tz);
}

export function mapSlack(sent: number[], mentioned: number[], cfg: Pick<SlackConfig, "team" | "url">, from: string, to: string, tz: string): WorkItem[] {
  const out: WorkItem[] = [];
  const count = (times: number[], kind: "messages" | "mentions") => {
    const perDay = new Map<string, number>();
    for (const t of times) {
      const date = localDate(t, tz);
      if (date >= from && date < to) perDay.set(date, (perDay.get(date) ?? 0) + 1);
    }
    for (const [date, n] of perDay) out.push({ id: `slack:${kind}:${date}`, source: "slack", kind, title: "", url: cfg.url, ref: cfg.team, date, count: n });
  };
  count(sent, "messages");
  count(mentioned, "mentions");
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
