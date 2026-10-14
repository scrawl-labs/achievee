import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { goals } from "@/lib/db";
import { bad, unauthorized } from "@/lib/api";
import { parseGoalCreate, parseGoalId, parseGoalPatch, parseGoalQuery } from "@/lib/goals";

export const dynamic = "force-dynamic";
const notFound = () => NextResponse.json({ error: "not found" }, { status: 404 });

/** Auth is always checked before the body or query is looked at. */
async function readJson(req: Request): Promise<{ ok: true; body: unknown } | { ok: false }> {
  try { return { ok: true, body: await req.json() }; } catch { return { ok: false }; }
}

/** ?scope=day|week&from=YYYY-MM-DD&to=YYYY-MM-DD (inclusive) → goals in that span, ordered by period then position. */
export async function GET(req: Request) {
  const u = await getUser();
  if (!u) return unauthorized();
  const q = parseGoalQuery(new URL(req.url).searchParams);
  if (!q.ok) return bad(q.error);
  return NextResponse.json(await goals.range(u.id, q.value.scope, q.value.from, q.value.to));
}

export async function POST(req: Request) {
  const u = await getUser();
  if (!u) return unauthorized();
  const j = await readJson(req);
  if (!j.ok) return bad("bad json");
  const input = parseGoalCreate(j.body);
  if (!input.ok) return bad(input.error);
  const row = await goals.add(u.id, input.value);
  return row ? NextResponse.json(row, { status: 201 }) : bad("too many goals");
}

export async function PATCH(req: Request) {
  const u = await getUser();
  if (!u) return unauthorized();
  const j = await readJson(req);
  if (!j.ok) return bad("bad json");
  const patch = parseGoalPatch(j.body);
  if (!patch.ok) return bad(patch.error);
  const row = await goals.update(u.id, patch.value);
  return row ? NextResponse.json(row) : notFound();
}

export async function DELETE(req: Request) {
  const u = await getUser();
  if (!u) return unauthorized();
  const id = parseGoalId(new URL(req.url).searchParams.get("id"));
  if (!id.ok) return bad(id.error);
  return (await goals.remove(u.id, id.value)) ? NextResponse.json({ ok: true }) : notFound();
}
