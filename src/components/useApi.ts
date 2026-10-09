"use client";
import { useCallback, useEffect, useReducer, useState } from "react";
import { signIn } from "next-auth/react";

// Stale-while-revalidate: show the last response for a URL instantly, refresh it in the background.
const cache = new Map<string, unknown>();

/** Warm the cache (e.g. next month) so navigating there renders without waiting for Google. */
export function prefetch(url: string) {
  if (cache.has(url)) return;
  fetch(url).then((r) => (r.ok ? r.json() : null)).then((j) => { if (j) cache.set(url, j); }).catch(() => {});
}

export function useApi<T>(url: string | null) {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const [failed, setFailed] = useState<string | null>(null);

  const load = useCallback(async (u: string) => {
    try {
      const r = await fetch(u);
      if (r.status === 401) { signIn("google"); return; }
      const j = await r.json();
      if (r.ok) { cache.set(u, j); setFailed(null); } else setFailed(u);
    } catch { setFailed(u); }
    bump();
  }, []);

  useEffect(() => { if (url) load(url); }, [url, load]);

  return {
    data: url ? ((cache.get(url) as T | undefined) ?? null) : null,
    error: !!url && failed === url,
    reload: useCallback(() => (url ? load(url) : Promise.resolve()), [url, load]),
  };
}
