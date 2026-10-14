import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { search } from "@/lib/db";
import { bad, unauthorized } from "@/lib/api";
import { parseSearchQuery, searchHits } from "@/lib/search";
import { createRateLimiter } from "@/lib/searchRateLimit";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store" };
/** Best-effort, per server instance (see searchRateLimit.ts); 5000 users is far above one instance's real concurrency. */
const limiter = createRateLimiter({ minIntervalMs: 300, maxEntries: 5000 });

/**
 * ?q=<2..50 chars> → { results: SearchHit[] } (max 30, newest first). Auth first.
 * This code never logs the query or any decrypted text. Note the query string can still appear in the
 * hosting platform's / proxies' access logs, since it is part of the GET URL.
 */
export async function GET(req: Request) {
  const u = await getUser();
  if (!u) return unauthorized();
  if (!limiter.allow(u.id, Date.now())) {
    return NextResponse.json({ error: "too many requests" }, { status: 429, headers: { ...noStore, "Retry-After": "1" } });
  }
  const q = parseSearchQuery(new URL(req.url).searchParams.get("q"));
  if (!q.ok) return bad(q.error);
  try {
    const candidates = await search.candidates(u.id);
    return NextResponse.json({ results: searchHits(candidates, q.value) }, { headers: noStore });
  } catch {
    // Fixed message only: the error may carry query text or decrypted content.
    return NextResponse.json({ error: "search failed" }, { status: 500, headers: noStore });
  }
}
