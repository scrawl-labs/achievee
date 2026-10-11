import { addDays } from "../dates";
import { localDate } from "../tz";
import type { WorkItem } from "./types";

export type JiraConfig = { site: string; email: string; token: string };

// The server calls whatever site the user typed, so only Jira Cloud hosts are allowed (no internal addresses, no redirects).
const SITE_RE = /^[a-z0-9][a-z0-9-]{0,62}\.atlassian\.net$/;
/** "https://team.atlassian.net/jira/..." -> "https://team.atlassian.net", or null when it is not a Jira Cloud site. */
export function normalizeSite(input: string): string | null {
  const host = input.trim().replace(/^https?:\/\//i, "").replace(/[/?#].*$/, "").toLowerCase();
  return SITE_RE.test(host) ? `https://${host}` : null;
}

async function jira<T>(cfg: JiraConfig, path: string): Promise<T> {
  const site = normalizeSite(cfg.site);
  if (!site) throw new Error("bad site");
  const r = await fetch(site + path, {
    headers: { Authorization: "Basic " + Buffer.from(`${cfg.email}:${cfg.token}`).toString("base64"), Accept: "application/json" },
    cache: "no-store", redirect: "error", signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error(`jira ${r.status}`);
  return r.json() as Promise<T>;
}

/** Checks the credentials and returns who they belong to. */
export async function jiraVerify(cfg: JiraConfig): Promise<{ name: string }> {
  const me = await jira<{ displayName?: string; emailAddress?: string }>(cfg, "/rest/api/3/myself");
  return { name: me.displayName || me.emailAddress || cfg.email };
}

type Issue = { key: string; fields: { summary?: string; status?: { name?: string }; resolutiondate?: string | null; statuscategorychangedate?: string | null; created?: string } };

async function search(cfg: JiraConfig, jql: string): Promise<Issue[]> {
  const res = await jira<{ issues: Issue[] }>(cfg, `/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&fields=summary,status,resolutiondate,statuscategorychangedate,created&maxResults=100`);
  return res.issues;
}

/**
 * Issues assigned to the user that reached a "Done" status in [from, to), and issues the user created in it (dates in `tz`).
 * "Done" uses the status category, so workflows that never set a Resolution still count. JQL dates are in the Jira profile timezone, so widen by a day and filter locally.
 */
export async function jiraItems(cfg: JiraConfig, from: string, to: string, tz: string): Promise<WorkItem[]> {
  const a = `"${addDays(from, -1)}"`, b = `"${addDays(to, 1)}"`;
  const [done, created] = await Promise.all([
    search(cfg, `assignee = currentUser() AND statusCategory = Done AND statusCategoryChangedDate >= ${a} AND statusCategoryChangedDate < ${b} ORDER BY updated DESC`),
    search(cfg, `reporter = currentUser() AND created >= ${a} AND created < ${b} ORDER BY created DESC`).catch(() => [] as Issue[]),
  ]);
  return mapJira(done, created, normalizeSite(cfg.site)!, from, to, tz);
}

export function mapJira(done: Issue[], created: Issue[], site: string, from: string, to: string, tz: string): WorkItem[] {
  const out: WorkItem[] = [];
  const add = (list: Issue[], kind: WorkItem["kind"], at: (i: Issue) => string | null | undefined) => {
    for (const i of list) {
      const when = at(i);
      if (!when) continue;
      const date = localDate(Date.parse(when), tz);
      if (date < from || date >= to) continue;
      out.push({ id: `jira:${kind}:${i.key}`, source: "jira", kind, title: i.fields.summary ?? i.key, url: `${site}/browse/${i.key}`, ref: i.key, date, status: i.fields.status?.name });
    }
  };
  add(done, "resolved", (i) => i.fields.statuscategorychangedate ?? i.fields.resolutiondate);
  add(created, "issue", (i) => i.fields.created);
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
