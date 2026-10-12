export const INTAKE_KINDS = ["water", "protein"] as const;
export type IntakeKind = (typeof INTAKE_KINDS)[number];
export type IntakeRow = { date: string; kind: IntakeKind; amount: number };
export const isIntakeKind = (v: unknown): v is IntakeKind => (INTAKE_KINDS as readonly unknown[]).includes(v);

/** Water is stored in ml, protein in grams. */
export const INTAKE_MAX: Record<IntakeKind, number> = { water: 20000, protein: 1000 };
export const DEFAULT_GOALS: Record<IntakeKind, number> = { water: 2000, protein: 100 };
export const GOAL_RANGE: Record<IntakeKind, [number, number]> = { water: [500, 6000], protein: [10, 400] };

/** Total of one kind on one day. */
export const dayTotal = (rows: IntakeRow[], date: string, kind: IntakeKind) =>
  rows.filter((r) => r.date === date && r.kind === kind).reduce((s, r) => s + r.amount, 0);

/** Days in the rows on which the kind reached the goal. */
export const daysMet = (rows: IntakeRow[], kind: IntakeKind, goal: number) =>
  new Set(rows.filter((r) => r.kind === kind && r.amount >= goal).map((r) => r.date)).size;

export const liters = (ml: number) => `${(ml / 1000).toFixed(ml % 1000 === 0 ? 0 : ml % 100 === 0 ? 1 : 2)}L`;
