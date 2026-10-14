"use client";
import { useCallback, useEffect, useReducer, useState } from "react";
import { signIn } from "next-auth/react";
import { createFreshSet } from "@/lib/freshSet";
import { planInvalidation } from "@/lib/invalidatePlan";

// Stale-while-revalidate: show the last response for a URL instantly, refresh it in the background.
const cache = new Map<string, unknown>();

/**
 * URLs we dropped from `cache` after their data changed. The API sends `max-age`, so the browser's HTTP cache would still replay the
 * old body on the next plain fetch: the next load/prefetch of these goes out with cache:"reload", then the mark is used up.
 * Only URLs this session actually cached can be marked (a prefix alone can't be expanded into URLs); that covers every URL whose
 * response could have been replayed, since the HTTP cache entries come from our own fetches. Bounded, see createFreshSet.
 */
const stale = createFreshSet(200);

/** Drop cached responses whose URL starts with `prefix` (e.g. after the data behind them changed). */
export function forget(prefix: string) {
  for (const k of [...cache.keys()]) if (k.startsWith(prefix)) { cache.delete(k); stale.mark(k); }
}

// Mounted useApi hooks, so invalidate() can refresh what is on screen instead of only dropping the cache.
const live = new Set<{ url: string; reload: () => void; bump: () => void }>();

/**
 * The data behind `prefix` changed elsewhere: refetch what is mounted (stale data stays until it lands) and forget the rest.
 * Each URL is fetched once however many hooks watch it (a finished load re-renders all of them, see `load`).
 * `skip`: URLs the caller just refreshed itself, left untouched.
 */
export function invalidate(prefix: string, skip: readonly string[] = []) {
  const { reload, drop } = planInvalidation(prefix, [...live].map((l) => l.url), cache.keys(), skip);
  for (const u of reload) [...live].find((l) => l.url === u)?.reload();
  for (const k of drop) { cache.delete(k); stale.mark(k); }
}

/** Warm the cache (e.g. next month) so navigating there renders without waiting for Google. */
export function prefetch(url: string) {
  if (cache.has(url)) return;
  fetch(url, stale.take(url) ? { cache: "reload" } : undefined).then((r) => (r.ok ? r.json() : null)).then((j) => { if (j) cache.set(url, j); }).catch(() => {});
}

export function useApi<T>(url: string | null) {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const [failed, setFailed] = useState<string | null>(null);

  // `fresh` is for reloads after a change: the API sends `max-age`, so without it the browser would replay the old response.
  const load = useCallback(async (u: string, fresh = false) => {
    try {
      const bypass = stale.take(u) || fresh; // take() always runs: a load uses the mark up
      const r = await fetch(u, bypass ? { cache: "reload" } : undefined);
      if (r.status === 401) { signIn("google"); return; }
      const j = await r.json();
      if (r.ok) { cache.set(u, j); setFailed(null); } else setFailed(u);
    } catch { setFailed(u); }
    bump();
    for (const l of live) if (l.url === u) l.bump(); // other hooks on the same URL read the cache too: they must re-render
  }, []);

  useEffect(() => { if (url) load(url); }, [url, load]);
  useEffect(() => {
    if (!url) return;
    const entry = { url, reload: () => { void load(url, true); }, bump };
    live.add(entry);
    return () => { live.delete(entry); };
  }, [url, load]);

  return {
    data: url ? ((cache.get(url) as T | undefined) ?? null) : null,
    error: !!url && failed === url,
    reload: useCallback(() => (url ? load(url, true) : Promise.resolve()), [url, load]),
  };
}
