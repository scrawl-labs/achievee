import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { integrations } from "@/lib/db";
import { bad, unauthorized } from "@/lib/api";
import { githubVerify } from "@/lib/integrations/github";
import { jiraVerify, normalizeSite } from "@/lib/integrations/jira";
import { isProvider } from "@/lib/integrations/types";

export const dynamic = "force-dynamic";
const clip = (v: unknown, n = 300) => String(v ?? "").trim().slice(0, n);

/** Which tools are connected. Only a display label goes back to the browser; the token never does. */
export async function GET() {
  const u = await getUser();
  if (!u) return unauthorized();
  const rows = await integrations.list(u.id);
  return NextResponse.json(rows.map((r) => ({ provider: r.provider, label: r.config.label ?? "" })));
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
