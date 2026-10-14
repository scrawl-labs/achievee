import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { todos } from "@/lib/db";
import { bad, unauthorized } from "@/lib/api";
import { parseTodoCreate, parseTodoId, parseTodoPatch, parseTodoQuery } from "@/lib/todos";

export const dynamic = "force-dynamic";
const notFound = () => NextResponse.json({ error: "not found" }, { status: 404 });

/** Auth is always checked before the body or query is looked at. */
async function readJson(req: Request): Promise<{ ok: true; body: unknown } | { ok: false }> {
  try { return { ok: true, body: await req.json() }; } catch { return { ok: false }; }
}

/** ?from=YYYY-MM-DD&to=YYYY-MM-DD (inclusive, max 62 days apart) → the user's todos ordered by date, position, id. */
export async function GET(req: Request) {
  const u = await getUser();
  if (!u) return unauthorized();
  const q = parseTodoQuery(new URL(req.url).searchParams);
  if (!q.ok) return bad(q.error);
  return NextResponse.json(await todos.range(u.id, q.value.from, q.value.to));
}

export async function POST(req: Request) {
  const u = await getUser();
  if (!u) return unauthorized();
  const j = await readJson(req);
  if (!j.ok) return bad("bad json");
  const input = parseTodoCreate(j.body);
  if (!input.ok) return bad(input.error);
  const row = await todos.add(u.id, input.value);
  return row ? NextResponse.json(row, { status: 201 }) : bad("too many todos");
}

export async function PATCH(req: Request) {
  const u = await getUser();
  if (!u) return unauthorized();
  const j = await readJson(req);
  if (!j.ok) return bad("bad json");
  const patch = parseTodoPatch(j.body);
  if (!patch.ok) return bad(patch.error);
  const row = await todos.update(u.id, patch.value);
  if (row === "full") return bad("too many todos");
  return row ? NextResponse.json(row) : notFound();
}

export async function DELETE(req: Request) {
  const u = await getUser();
  if (!u) return unauthorized();
  const id = parseTodoId(new URL(req.url).searchParams.get("id"));
  if (!id.ok) return bad(id.error);
  return (await todos.remove(u.id, id.value)) ? NextResponse.json({ ok: true }) : notFound();
}
