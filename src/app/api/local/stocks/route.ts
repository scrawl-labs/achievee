import { NextResponse } from "next/server";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { currentPrice } from "@/lib/nh";
import { isLocalRequest } from "@/lib/localOnly";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Holding = { code: string; name: string; avg: number; qty: number };
const FILE = path.join(process.cwd(), ".local", "holdings.json"); // git-ignored; stays on this PC

const notFound = () => new NextResponse("Not found", { status: 404 });
const gate = (req: Request) => isLocalRequest(req.headers.get("host"));
const load = async (): Promise<Holding[]> => { try { return JSON.parse(await readFile(FILE, "utf8")) as Holding[]; } catch { return []; } };
const save = async (rows: Holding[]) => { await mkdir(path.dirname(FILE), { recursive: true }); await writeFile(FILE, JSON.stringify(rows, null, 2), "utf8"); };

/** Holdings with their current price. A price that fails to load shows up as an error for that stock only. */
export async function GET(req: Request) {
  if (!gate(req)) return notFound();
  const rows = await load();
  const out = [];
  for (const h of rows) { // one at a time: the API allows about 4 requests per second
    try { out.push({ ...h, price: await currentPrice(h.code), error: null }); }
    catch (e) { out.push({ ...h, price: null, error: String((e as Error).message).slice(0, 120) }); }
  }
  return NextResponse.json(out);
}

export async function POST(req: Request) {
  if (!gate(req)) return notFound();
  const b = await req.json();
  const code = String(b.code ?? "").trim(), avg = Number(b.avg), qty = b.qty === "" || b.qty === undefined ? 0 : Number(b.qty);
  if (!/^\d{6}$/.test(code) || !Number.isFinite(avg) || avg <= 0 || avg > 1e9 || !Number.isInteger(qty) || qty < 0 || qty > 1e9) return NextResponse.json({ error: "bad input" }, { status: 400 });
  const rows = (await load()).filter((h) => h.code !== code);
  rows.push({ code, name: String(b.name ?? "").trim().slice(0, 40) || code, avg, qty });
  await save(rows);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!gate(req)) return notFound();
  const code = new URL(req.url).searchParams.get("code") ?? "";
  await save((await load()).filter((h) => h.code !== code));
  return NextResponse.json({ ok: true });
}
