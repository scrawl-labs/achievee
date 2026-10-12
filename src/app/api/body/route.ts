import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { body } from "@/lib/db";
import { bad, unauthorized } from "@/lib/api";
import { parseBody } from "@/lib/body";

export const dynamic = "force-dynamic";
const YMD = /^\d{4}-\d{2}-\d{2}$/;

/** Body composition readings (InBody and similar): weight, body-fat %, muscle mass. Values are encrypted at rest. */
export async function GET() {
  const u = await getUser();
  if (!u) return unauthorized();
  return NextResponse.json(await body.list(u.id, 120));
}

export async function POST(req: Request) {
  const b = await req.json();
  const v = parseBody(b);
  if (!YMD.test(b.date) || !v) return bad("bad input");
  const u = await getUser();
  if (!u) return unauthorized();
  await body.add(u.id, b.date, v);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  const b = await req.json();
  const v = parseBody(b);
  if (!Number.isInteger(b.id) || !YMD.test(b.date) || !v) return bad("bad input");
  const u = await getUser();
  if (!u) return unauthorized();
  await body.update(u.id, b.id, b.date, v);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id)) return bad("bad id");
  const u = await getUser();
  if (!u) return unauthorized();
  await body.remove(u.id, id);
  return NextResponse.json({ ok: true });
}
