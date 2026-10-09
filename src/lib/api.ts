import { NextResponse } from "next/server";

export const unauthorized = () => NextResponse.json({ error: "unauthorized" }, { status: 401 });
export const bad = (error: string) => NextResponse.json({ error }, { status: 400 });
/** Per-user data: browser-only cache, so flipping between months/tabs is instant and revalidates quietly. */
export const privateCache = { "Cache-Control": "private, max-age=30, stale-while-revalidate=300" };
