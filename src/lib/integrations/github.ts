import { addDays } from "../dates";
import { localDate } from "../tz";
import type { WorkItem } from "./types";

export type GithubConfig = { token: string; login: string };
const API = "https://api.github.com";
const HEADERS = (token: string) => ({ Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "achievee" });

async function gh<T>(path: string, token: string): Promise<T> {
  const r = await fetch(API + path, { headers: HEADERS(token), cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`github ${r.status}`);
  return r.json() as Promise<T>;
}

/** Checks the token and returns the account it belongs to. */
export async function githubVerify(token: string): Promise<{ login: string }> {
  const u = await gh<{ login: string }>("/user", token);
  return { login: u.login };
}

type SearchItem = {
  number: number; title: string; html_url: string; repository_url: string; created_at: string; closed_at: string | null;
  pull_request?: { merged_at: string | null };
};
const repoOf = (i: SearchItem) => i.repository_url.split("/repos/")[1] ?? "";

async function search(token: string, q: string): Promise<SearchItem[]> {
  const res = await gh<{ items: SearchItem[] }>(`/search/issues?q=${encodeURIComponent(q)}&per_page=100&sort=updated`, token);
  return res.items;
}

type Ref = { number: number; title: string; url: string; repository: { nameWithOwner: string } };
type Collection = {
  commitContributionsByRepository: { repository: { nameWithOwner: string; url: string }; contributions: { nodes: { occurredAt: string; commitCount: number }[] } }[];
  pullRequestReviewContributions: { nodes: { occurredAt: string; pullRequest: Ref }[] };
};
const QUERY = `query($login:String!,$from:DateTime!,$to:DateTime!){user(login:$login){contributionsCollection(from:$from,to:$to){
commitContributionsByRepository(maxRepositories:25){repository{nameWithOwner url}contributions(first:100){nodes{occurredAt commitCount}}}
pullRequestReviewContributions(first:100){nodes{occurredAt pullRequest{number title url repository{nameWithOwner}}}}}}}`;

/** Reviews and commit counts come from GitHub's contribution data (the search API can't date them). */
async function contributions(cfg: GithubConfig, from: string, to: string): Promise<Collection | null> {
  const r = await fetch(API + "/graphql", {
    method: "POST", headers: { ...HEADERS(cfg.token), "Content-Type": "application/json" }, cache: "no-store", signal: AbortSignal.timeout(8000),
    body: JSON.stringify({ query: QUERY, variables: { login: cfg.login, from: `${addDays(from, -1)}T00:00:00Z`, to: `${addDays(to, 1)}T00:00:00Z` } }),
  });
  if (!r.ok) throw new Error(`github ${r.status}`);
  const j = (await r.json()) as { data?: { user?: { contributionsCollection?: Collection } } };
  return j.data?.user?.contributionsCollection ?? null;
}

/**
 * What the user did on GitHub in [from, to) (dates in `tz`): PRs opened and merged, issues opened and closed, reviews given, and a commit count per repository.
 * Queries are widened by a day each side because GitHub filters in UTC; results are then filtered by the user's local date.
 * The search-based parts are required (a failure shows as an error); reviews and commits are best effort.
 */
export async function githubItems(cfg: GithubConfig, from: string, to: string, tz: string): Promise<WorkItem[]> {
  const range = `${addDays(from, -1)}..${addDays(to, 1)}`, me = cfg.login;
  const [merged, opened, issues, closed, contrib] = await Promise.all([
    search(cfg.token, `is:pr is:merged author:${me} merged:${range}`),
    search(cfg.token, `is:pr author:${me} created:${range}`),
    search(cfg.token, `is:issue author:${me} created:${range}`),
    search(cfg.token, `is:issue is:closed assignee:${me} closed:${range}`),
    contributions(cfg, from, to).catch(() => null),
  ]);
  return [...mapGithub({ merged, opened, issues, closed }, from, to, tz), ...mapContributions(contrib, from, to, tz)]
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function mapGithub(s: { merged: SearchItem[]; opened: SearchItem[]; issues: SearchItem[]; closed: SearchItem[] }, from: string, to: string, tz: string): WorkItem[] {
  const out: WorkItem[] = [];
  const add = (list: SearchItem[], kind: WorkItem["kind"], at: (i: SearchItem) => string | null | undefined) => {
    for (const i of list) {
      const when = at(i);
      if (!when) continue;
      const date = localDate(Date.parse(when), tz);
      if (date < from || date >= to) continue;
      const ref = `${repoOf(i)}#${i.number}`;
      out.push({ id: `github:${kind}:${ref}`, source: "github", kind, title: i.title, url: i.html_url, ref, date });
    }
  };
  add(s.merged, "merged", (i) => i.pull_request?.merged_at ?? i.closed_at);
  add(s.opened, "opened", (i) => i.created_at);
  add(s.issues, "issue", (i) => i.created_at);
  add(s.closed, "closed", (i) => i.closed_at);
  return out;
}

/** GitHub dates commits by day (midnight UTC); real timestamps are converted to the user's day. */
const dayOf = (iso: string, tz: string) => (iso.endsWith("T00:00:00Z") ? iso.slice(0, 10) : localDate(Date.parse(iso), tz));

export function mapContributions(c: Collection | null, from: string, to: string, tz: string): WorkItem[] {
  if (!c) return [];
  const out: WorkItem[] = [], seen = new Set<string>();
  for (const n of c.pullRequestReviewContributions?.nodes ?? []) {
    const date = dayOf(n.occurredAt, tz);
    if (date < from || date >= to) continue;
    const ref = `${n.pullRequest.repository.nameWithOwner}#${n.pullRequest.number}`, id = `github:review:${ref}:${date}`;
    if (seen.has(id)) continue; // several reviews of one PR on one day count once
    seen.add(id);
    out.push({ id, source: "github", kind: "review", title: n.pullRequest.title, url: n.pullRequest.url, ref, date });
  }
  for (const repo of c.commitContributionsByRepository ?? []) {
    const perDay = new Map<string, number>();
    for (const n of repo.contributions.nodes) {
      const date = dayOf(n.occurredAt, tz);
      if (date >= from && date < to) perDay.set(date, (perDay.get(date) ?? 0) + n.commitCount);
    }
    for (const [date, count] of perDay) {
      out.push({ id: `github:commits:${repo.repository.nameWithOwner}:${date}`, source: "github", kind: "commits", title: "", url: repo.repository.url, ref: repo.repository.nameWithOwner, date, count });
    }
  }
  return out;
}
