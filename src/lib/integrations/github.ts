import { addDays } from "../dates";
import { localDate } from "../tz";
import type { WorkItem } from "./types";

export type GithubConfig = { token: string; login: string };
const API = "https://api.github.com";

async function gh<T>(path: string, token: string): Promise<T> {
  const r = await fetch(API + path, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "achievee" },
    cache: "no-store", signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error(`github ${r.status}`);
  return r.json() as Promise<T>;
}

/** Checks the token and returns the account it belongs to. */
export async function githubVerify(token: string): Promise<{ login: string }> {
  const u = await gh<{ login: string }>("/user", token);
  return { login: u.login };
}

type SearchItem = {
  number: number; title: string; html_url: string; repository_url: string; closed_at: string | null;
  pull_request?: { merged_at: string | null };
};

/** Pull requests the user merged in [from, to) (dates in `tz`). The query is widened by a day each side because GitHub filters in UTC. */
export async function githubItems(cfg: GithubConfig, from: string, to: string, tz: string): Promise<WorkItem[]> {
  const q = encodeURIComponent(`is:pr is:merged author:${cfg.login} merged:${addDays(from, -1)}..${addDays(to, 1)}`);
  const res = await gh<{ items: SearchItem[] }>(`/search/issues?q=${q}&per_page=100&sort=updated`, cfg.token);
  return mapGithub(res.items, from, to, tz);
}

export function mapGithub(items: SearchItem[], from: string, to: string, tz: string): WorkItem[] {
  const out: WorkItem[] = [];
  for (const i of items) {
    const when = i.pull_request?.merged_at ?? i.closed_at;
    if (!when) continue;
    const date = localDate(Date.parse(when), tz);
    if (date < from || date >= to) continue;
    const repo = i.repository_url.split("/repos/")[1] ?? "";
    out.push({ id: `github:${repo}#${i.number}`, source: "github", kind: "done", title: i.title, url: i.html_url, ref: `${repo}#${i.number}`, date, status: "merged" });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
