type Page<T> = { items?: T[]; nextPageToken?: string };

/** Follows `nextPageToken` until exhausted and returns all items. A repeated token ends the loop (guards against API loops). */
export async function fetchAllPages<T>(fetchPage: (pageToken?: string) => Promise<Page<T>>): Promise<T[]> {
  const out: T[] = [];
  const seen = new Set<string>();
  let token: string | undefined;
  do {
    const page = await fetchPage(token);
    out.push(...(page.items ?? []));
    token = page.nextPageToken || undefined;
    if (token && seen.has(token)) break;
    if (token) seen.add(token);
  } while (token);
  return out;
}
