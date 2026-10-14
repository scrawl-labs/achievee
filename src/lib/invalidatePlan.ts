/**
 * What invalidate(prefix) has to do: refetch every mounted URL under the prefix exactly once (several hooks may watch the same URL),
 * and drop cached URLs under the prefix that nobody has mounted. URLs in `skip` were refreshed by the caller already: left alone.
 */
export function planInvalidation(prefix: string, mounted: Iterable<string>, cached: Iterable<string>, skip: Iterable<string> = []) {
  const skipped = new Set(skip);
  const hit = (u: string) => u.startsWith(prefix) && !skipped.has(u);
  const reload = [...new Set([...mounted].filter(hit))];
  const drop = [...new Set([...cached].filter((u) => hit(u) && !reload.includes(u)))];
  return { reload, drop };
}
