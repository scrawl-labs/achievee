/** Values are kept in tenths (62.5 kg -> 625) so nothing is stored as a float. Any of the three may be missing. */
export type BodyValues = { weight?: number; fat?: number; muscle?: number };
export type BodyRow = { id: number; date: string; weight?: number; fat?: number; muscle?: number };
export type Metric = keyof BodyValues;
export const METRICS: Metric[] = ["fat", "muscle", "weight"];

const RANGE: Record<Metric, [number, number]> = { weight: [200, 3000], fat: [10, 700], muscle: [50, 1500] }; // tenths
const tenths = (v: unknown): number | undefined => {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 10) : NaN;
};

/** Validates a request body of {weight, fat, muscle} given in kg / % (decimals allowed). Returns tenths, or null when invalid or empty. */
export function parseBody(b: Record<string, unknown>): BodyValues | null {
  const out: BodyValues = {};
  for (const m of METRICS) {
    const t = tenths(b[m]);
    if (t === undefined) continue;
    if (Number.isNaN(t) || t < RANGE[m][0] || t > RANGE[m][1]) return null;
    out[m] = t;
  }
  return Object.keys(out).length ? out : null;
}

export const show = (tenth: number) => (tenth / 10).toFixed(1);

/** Newest value of a metric and the change from the reading before it (rows newest first). */
export function latestChange(rows: BodyRow[], m: Metric): { value: number; delta: number | null } | null {
  const have = rows.filter((r) => r[m] !== undefined);
  if (!have.length) return null;
  return { value: have[0][m]!, delta: have.length > 1 ? have[0][m]! - have[1][m]! : null };
}
