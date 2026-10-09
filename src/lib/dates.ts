/** ISO date helpers (YYYY-MM-DD), timezone-free: dates are plain calendar days. */
export const addDays = (iso: string, n: number) => new Date(new Date(iso + "T00:00:00Z").getTime() + n * 864e5).toISOString().slice(0, 10);
export const dow = (iso: string) => new Date(iso + "T00:00:00Z").getUTCDay(); // 0 = Sunday
export const mondayOf = (iso: string) => addDays(iso, -((dow(iso) + 6) % 7));
export const monthStart = (iso: string) => `${iso.slice(0, 7)}-01`;
export const monthEnd = (iso: string) => addDays(addMonths(monthStart(iso), 1), -1);
export const addMonths = (iso: string, n: number) => {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + n, 1);
  return d.toISOString().slice(0, 10);
};
export const eachDay = (from: string, toExclusive: string) => {
  const out: string[] = [];
  for (let d = from; d < toExclusive && out.length < 62; d = addDays(d, 1)) out.push(d);
  return out;
};
