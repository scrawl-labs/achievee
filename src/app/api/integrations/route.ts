import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { integrations } from "@/lib/db";
import { bad, unauthorized } from "@/lib/api";
import { githubVerify } from "@/lib/integrations/github";
import { jiraVerify, normalizeSite } from "@/lib/integrations/jira";
import { slackVerify } from "@/lib/integrations/slack";
import { notionVerify } from "@/lib/integrations/notion";
import { dbGoogleStore } from "@/lib/googleToken";
import { maskIntegrations } from "@/lib/integrations/mask";
import { isProvider } from "@/lib/integrations/types";

export const dynamic = "force-dynamic";
const SLACK_ENABLED = false; // the Slack card is hidden until the unanswered-mentions version exists
const clip = (v: unknown, n = 300) => String(v ?? "").trim().slice(0, n);

/** Which tools are connected. Only a display label (or, for Google, a bare status) goes back to the browser; tokens never do. */
export async function GET() {
  const u = await getUser();
  if (!u) return unauthorized();
  const [rows, google] = await Promise.all([integrations.list(u.id), dbGoogleStore.get(u.id)]);
  return NextResponse.json(maskIntegrations(rows, google));
}

/** Connect (or replace) a tool. The credentials are checked against the real service first; nothing is saved if that fails. */
export async function PUT(req: Request) {
  const b = await req.json();
  if (!isProvider(b.provider)) return bad("bad provider");
  const u = await getUser();
  if (!u) return unauthorized();
  try {
    if (b.provider === "github") {
      const token = clip(b.token, 500);
      if (!token) return bad("bad input");
      const { login } = await githubVerify(token);
      await integrations.save(u.id, "github", { token, login, label: `@${login}` });
      return NextResponse.json({ ok: true, label: `@${login}` });
    }
    if (b.provider === "slack" && !SLACK_ENABLED) return bad("not available yet");
    if (b.provider === "slack") {
      const token = clip(b.token, 500);
      if (!/^xoxp-/.test(token)) return bad("bad input"); // a user token; bot tokens (xoxb-) cannot search
      const { userId, user, team, url } = await slackVerify(token);
      const label = `@${user} · ${team}`;
      await integrations.save(u.id, "slack", { token, userId, team, url, label });
      return NextResponse.json({ ok: true, label });
    }
    if (b.provider === "notion") {
      const token = clip(b.token, 500);
      if (!token) return bad("bad input");
      const { name } = await notionVerify(token);
      await integrations.save(u.id, "notion", { token, label: name });
      return NextResponse.json({ ok: true, label: name });
    }
    const site = normalizeSite(clip(b.site)), email = clip(b.email), token = clip(b.token, 500);
    if (!site || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !token) return bad("bad input");
    const { name } = await jiraVerify({ site, email, token });
    await integrations.save(u.id, "jira", { site, email, token, label: `${name} · ${new URL(site).hostname}` });
    return NextResponse.json({ ok: true, label: name });
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 }); // wrong token / unreachable / no access
  }
}

export async function DELETE(req: Request) {
  const provider = new URL(req.url).searchParams.get("provider");
  if (!isProvider(provider)) return bad("bad provider");
  const u = await getUser();
  if (!u) return unauthorized();
  await integrations.remove(u.id, provider);
  return NextResponse.json({ ok: true });
}
