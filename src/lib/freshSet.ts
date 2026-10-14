/**
 * URLs whose next load must bypass the browser HTTP cache (their data changed, but the API's `max-age` would replay the old body).
 * Bounded: past `max` marks the oldest one is dropped (losing a mark only means one possibly stale replay, never a wrong write).
 */
export function createFreshSet(max: number) {
  const marks = new Set<string>();
  return {
    mark(url: string) {
      marks.delete(url); // re-marking refreshes its age
      marks.add(url);
      while (marks.size > max) marks.delete(marks.values().next().value as string);
    },
    /** True once per mark: the caller uses the mark up by loading fresh. */
    take: (url: string) => marks.delete(url),
    size: () => marks.size,
  };
}
