/**
 * Best-effort minimum interval between calls per key. Limits: state is per server instance (module memory), so
 * serverless cold starts and parallel instances each keep their own window; it only blunts a runaway client loop.
 * A real limit needs shared state (e.g. Upstash Redis / Vercel KV).
 */
export type RateLimiter = { allow: (key: string, now: number) => boolean; size: () => number };

export function createRateLimiter(opts: { minIntervalMs: number; maxEntries: number }): RateLimiter {
  // Map keeps insertion order; re-inserting on each allowed call makes the first key the least recently used.
  const last = new Map<string, number>();
  const evict = (now: number): void => {
    for (const [k, t] of last) if (now - t >= opts.minIntervalMs) last.delete(k);
    while (last.size >= opts.maxEntries) {
      const oldest = last.keys().next();
      if (oldest.done) break;
      last.delete(oldest.value);
    }
  };
  return {
    allow(key, now) {
      const prev = last.get(key);
      if (prev !== undefined && now - prev < opts.minIntervalMs) return false;
      last.delete(key);
      if (last.size >= opts.maxEntries) evict(now);
      last.set(key, now);
      return true;
    },
    size: () => last.size,
  };
}
