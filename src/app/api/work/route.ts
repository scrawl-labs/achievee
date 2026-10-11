import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { integrations } from "@/lib/db";
import { bad, unauthorized } from "@/lib/api";
import { safeTz } from "@/lib/tz";
import { githubItems, type GithubConfig } from "@/lib/integrations/github";
import { jiraItems, type JiraConfig } from "@/lib/integrations/jira";
import { slackItems, type SlackConfig } from "@/lib/integrations/slack";
import { notionItems, type NotionConfig } from "@/lib/integrations/notion";
import type { WorkItem } from "@/lib/integrations/types";

export const dynamic = "force-dynamic";
const YMD = /^\d{4}-\d{2}-\d{2}$/;

/** Work done in [from, to) across every connected tool. Read on demand and not stored. One tool failing doesn't hide the others. */
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const from = p.get("from") ?? "", to = p.get("to") ?? "";
  if (!YMD.test(from) || !YMD.test(to) || to <= from || Date.parse(to) - Date.parse(from) > 31 * 864e5) return bad("bad range");
  const u = await getUser();
  if (!u) return unauthorized();
  const tz = safeTz(p.get("tz"));
  const connected = await integrations.list(u.id);
  const results = await Promise.allSettled(connected.map((c) =>
    c.provider === "github" ? githubItems(c.config as unknown as GithubConfig, from, to, tz)
    : c.provider === "jira" ? jiraItems(c.config as unknown as JiraConfig, from, to, tz)
    : c.provider === "slack" ? slackItems(c.config as unknown as SlackConfig, from, to, tz)
    : c.provider === "notion" ? notionItems(c.config as unknown as NotionConfig, from, to, tz)
    : Promise.resolve([] as WorkItem[])));
  const items: WorkItem[] = [], errors: string[] = [];
  results.forEach((r, i) => (r.status === "fulfilled" ? items.push(...r.value) : errors.push(connected[i].provider)));
  items.sort((a, b) => a.date.localeCompare(b.date));
  return NextResponse.json({ items, errors, connected: connected.map((c) => c.provider) }, { headers: { "Cache-Control": "private, no-store" } });
}
