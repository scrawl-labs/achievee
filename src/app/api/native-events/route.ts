import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { nativeEvents } from "@/lib/db";
import { bad, unauthorized } from "@/lib/api";
import { parseNativeCreate, parseNativeId, parseNativePatch } from "@/lib/nativeEvents";

export const dynamic = "force-dynamic";
const notFound = () => NextResponse.json({ error: "not found" }, { status: 404 });

/** Auth is always checked before the body or query is looked at. */
async function readJson(req: Request): Promise<{ ok: true; body: unknown } | { ok: false }> {
  try { return { ok: true, body: await req.json() }; } catch { return { ok: false }; }
}

/** Own calendar events. They are read through /api/events (merged with Google) and /api/month; this route only writes. */
export async function POST(req: Request) {
  const u = await getUser();
  if (!u) return unauthorized();
  const j = await readJson(req);
  if (!j.ok) return bad("bad json");
  const input = parseNativeCreate(j.body);
  if (!input.ok) return bad(input.error);
  const row = await nativeEvents.add(u.id, input.value);
  return row ? NextResponse.json(row, { status: 201 }) : bad("too many events");
}

export async function PATCH(req: Request) {
  const u = await getUser();
  if (!u) return unauthorized();
  const j = await readJson(req);
  if (!j.ok) return bad("bad json");
  const patch = parseNativePatch(j.body);
  if (!patch.ok) return bad(patch.error);
  const row = await nativeEvents.update(u.id, patch.value);
  return row ? NextResponse.json(row) : notFound();
}

export async function DELETE(req: Request) {
  const u = await getUser();
  if (!u) return unauthorized();
  const id = parseNativeId(new URL(req.url).searchParams.get("id"));
  if (!id.ok) return bad(id.error);
  return (await nativeEvents.remove(u.id, id.value)) ? NextResponse.json({ ok: true }) : notFound();
}
