import { neon } from "@neondatabase/serverless";
import { decrypt, encrypt } from "./crypto";

// Diary + expenses live in Postgres (Neon via Vercel Marketplace; sets DATABASE_URL). Rows are keyed by the Google account id.
let _sql: ReturnType<typeof neon> | undefined;
let _ready: Promise<unknown> | undefined;

/** Lazily connected so `next build` never needs the database; the schema is created on first use. */
async function sql() {
  _sql ??= neon(process.env.DATABASE_URL ?? "");
  const s = _sql;
  _ready ??= s.transaction([
    s`CREATE TABLE IF NOT EXISTS diary (
      "user" TEXT NOT NULL, date TEXT NOT NULL, mood TEXT, body TEXT NOT NULL DEFAULT '',
      PRIMARY KEY ("user", date))`,
    s`ALTER TABLE diary ADD COLUMN IF NOT EXISTS emotions TEXT NOT NULL DEFAULT ''`,
    s`CREATE TABLE IF NOT EXISTS expense (
      id SERIAL PRIMARY KEY, "user" TEXT NOT NULL, date TEXT NOT NULL, category TEXT NOT NULL,
      memo TEXT NOT NULL DEFAULT '', amount INTEGER NOT NULL, need INTEGER NOT NULL DEFAULT 1)`,
    s`CREATE INDEX IF NOT EXISTS expense_user_date ON expense ("user", date)`,
    s`CREATE TABLE IF NOT EXISTS income (
      id SERIAL PRIMARY KEY, "user" TEXT NOT NULL, date TEXT NOT NULL, memo TEXT NOT NULL DEFAULT '', amount INTEGER NOT NULL)`,
    s`CREATE INDEX IF NOT EXISTS income_user_date ON income ("user", date)`,
    s`CREATE TABLE IF NOT EXISTS saving (
      id SERIAL PRIMARY KEY, "user" TEXT NOT NULL, date TEXT NOT NULL, kind TEXT NOT NULL, memo TEXT NOT NULL DEFAULT '', amount INTEGER NOT NULL)`,
    s`CREATE INDEX IF NOT EXISTS saving_user_date ON saving ("user", date)`,
    s`CREATE TABLE IF NOT EXISTS settings ("user" TEXT PRIMARY KEY, month_start_day INTEGER NOT NULL DEFAULT 1)`,
    s`ALTER TABLE settings ADD COLUMN IF NOT EXISTS workout_goal INTEGER NOT NULL DEFAULT 3`,
    s`ALTER TABLE settings ADD COLUMN IF NOT EXISTS water_goal INTEGER NOT NULL DEFAULT 2000`,
    s`ALTER TABLE settings ADD COLUMN IF NOT EXISTS protein_goal INTEGER NOT NULL DEFAULT 100`,
    s`CREATE TABLE IF NOT EXISTS intake ("user" TEXT NOT NULL, date TEXT NOT NULL, kind TEXT NOT NULL, amount INTEGER NOT NULL DEFAULT 0, PRIMARY KEY ("user", date, kind))`,
    s`CREATE TABLE IF NOT EXISTS workout (
      id SERIAL PRIMARY KEY, "user" TEXT NOT NULL, date TEXT NOT NULL, kind TEXT NOT NULL, minutes INTEGER NOT NULL, memo TEXT NOT NULL DEFAULT '')`,
    s`CREATE INDEX IF NOT EXISTS workout_user_date ON workout ("user", date)`,
    s`CREATE TABLE IF NOT EXISTS body (id SERIAL PRIMARY KEY, "user" TEXT NOT NULL, date TEXT NOT NULL, data TEXT NOT NULL)`,
    s`CREATE INDEX IF NOT EXISTS body_user_date ON body ("user", date)`,
    s`CREATE TABLE IF NOT EXISTS integration (
      "user" TEXT NOT NULL, provider TEXT NOT NULL, config TEXT NOT NULL, PRIMARY KEY ("user", provider))`,
    s`CREATE TABLE IF NOT EXISTS weekly_review (
      "user" TEXT NOT NULL, week_start TEXT NOT NULL, good TEXT NOT NULL DEFAULT '', hard TEXT NOT NULL DEFAULT '',
      plan TEXT NOT NULL DEFAULT '', note TEXT NOT NULL DEFAULT '', PRIMARY KEY ("user", week_start))`,
    s`CREATE TABLE IF NOT EXISTS goal (
      id SERIAL PRIMARY KEY, "user" TEXT NOT NULL, scope TEXT NOT NULL CHECK (scope IN ('day', 'week')),
      period_start TEXT NOT NULL, text TEXT NOT NULL, done BOOLEAN NOT NULL DEFAULT FALSE,
      position INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
    s`CREATE INDEX IF NOT EXISTS goal_user_scope_period ON goal ("user", scope, period_start)`,
  ]).catch((e) => { _ready = undefined; throw e; });
  await _ready;
  return s;
}

const bounds = (ym: string) => [`${ym}-01`, `${ym}-31`] as const;

export type DiaryRow = { date: string; mood: string | null; body: string; emotions: string[] };
type DiaryDb = { date: string; mood: string | null; body: string; emotions: string };
/** emotion word ids, stored as one encrypted comma-separated string */
const splitIds = (v: string) => decrypt(v ?? "").split(",").filter(Boolean);
export type ExpenseRow = { id: number; date: string; category: string; memo: string; amount: number; need: number };

export const diary = {
  async month(user: string, ym: string): Promise<DiaryRow[]> {
    const s = await sql(), [a, b] = bounds(ym);
    const rows = (await s`SELECT date, mood, body, emotions FROM diary WHERE "user"=${user} AND date BETWEEN ${a} AND ${b} ORDER BY date`) as DiaryDb[];
    return rows.map((r) => ({ ...r, body: decrypt(r.body), emotions: splitIds(r.emotions) }));
  },
  async upsert(user: string, date: string, mood: string | null, body: string, emotions: string[] = []) {
    const s = await sql();
    await s`INSERT INTO diary ("user", date, mood, body, emotions) VALUES (${user}, ${date}, ${mood}, ${encrypt(body)}, ${encrypt(emotions.join(","))})
      ON CONFLICT ("user", date) DO UPDATE SET mood = EXCLUDED.mood, body = EXCLUDED.body, emotions = EXCLUDED.emotions`;
  },
  /** every day that has emotion words, oldest first (for vocabulary stats) */
  async emotionDays(user: string): Promise<{ date: string; mood: string | null; ids: string[] }[]> {
    const s = await sql();
    const rows = (await s`SELECT date, mood, emotions FROM diary WHERE "user"=${user} AND emotions <> '' ORDER BY date`) as { date: string; mood: string | null; emotions: string }[];
    return rows.map((r) => ({ date: r.date, mood: r.mood, ids: splitIds(r.emotions) })).filter((r) => r.ids.length);
  },
  async remove(user: string, date: string) {
    const s = await sql();
    await s`DELETE FROM diary WHERE "user"=${user} AND date=${date}`;
  },
};

/** Remove everything stored for a user (the in-app "Delete my data"). */
export async function deleteUserData(user: string) {
  const s = await sql();
  await s.transaction([
    s`DELETE FROM diary WHERE "user"=${user}`, s`DELETE FROM expense WHERE "user"=${user}`,
    s`DELETE FROM income WHERE "user"=${user}`, s`DELETE FROM saving WHERE "user"=${user}`, s`DELETE FROM workout WHERE "user"=${user}`, s`DELETE FROM body WHERE "user"=${user}`, s`DELETE FROM intake WHERE "user"=${user}`, s`DELETE FROM settings WHERE "user"=${user}`, s`DELETE FROM weekly_review WHERE "user"=${user}`, s`DELETE FROM goal WHERE "user"=${user}`, s`DELETE FROM integration WHERE "user"=${user}`,
  ]);
}

export type IncomeRow = { id: number; date: string; memo: string; amount: number };

export const expenses = {
  /** [from, to) — `to` exclusive, for custom month starts. */
  async range(user: string, from: string, to: string): Promise<ExpenseRow[]> {
    const s = await sql();
    const rows = (await s`SELECT id, date, category, memo, amount, need FROM expense
      WHERE "user"=${user} AND date >= ${from} AND date < ${to} ORDER BY date DESC, id DESC`) as ExpenseRow[];
    return rows.map((r) => ({ ...r, memo: decrypt(r.memo) }));
  },
  async month(user: string, ym: string): Promise<ExpenseRow[]> {
    const s = await sql(), [a, b] = bounds(ym);
    const rows = (await s`SELECT id, date, category, memo, amount, need FROM expense
      WHERE "user"=${user} AND date BETWEEN ${a} AND ${b} ORDER BY date DESC, id DESC`) as ExpenseRow[];
    return rows.map((r) => ({ ...r, memo: decrypt(r.memo) }));
  },
  async add(user: string, date: string, category: string, memo: string, amount: number, need: boolean) {
    const s = await sql();
    await s`INSERT INTO expense ("user", date, category, memo, amount, need) VALUES (${user}, ${date}, ${category}, ${encrypt(memo)}, ${amount}, ${need ? 1 : 0})`;
  },
  async update(user: string, id: number, f: { date: string; category: string; memo: string; amount: number; need: boolean }) {
    const s = await sql();
    await s`UPDATE expense SET date=${f.date}, category=${f.category}, memo=${encrypt(f.memo)}, amount=${f.amount}, need=${f.need ? 1 : 0}
      WHERE "user"=${user} AND id=${id}`;
  },
  async setNeed(user: string, id: number, need: boolean) {
    const s = await sql();
    await s`UPDATE expense SET need=${need ? 1 : 0} WHERE "user"=${user} AND id=${id}`;
  },
  async remove(user: string, id: number) {
    const s = await sql();
    await s`DELETE FROM expense WHERE "user"=${user} AND id=${id}`;
  },
};

export const income = {
  async range(user: string, from: string, to: string): Promise<IncomeRow[]> {
    const s = await sql();
    const rows = (await s`SELECT id, date, memo, amount FROM income
      WHERE "user"=${user} AND date >= ${from} AND date < ${to} ORDER BY date DESC, id DESC`) as IncomeRow[];
    return rows.map((r) => ({ ...r, memo: decrypt(r.memo) }));
  },
  async add(user: string, date: string, memo: string, amount: number) {
    const s = await sql();
    await s`INSERT INTO income ("user", date, memo, amount) VALUES (${user}, ${date}, ${encrypt(memo)}, ${amount})`;
  },
  async update(user: string, id: number, f: { date: string; memo: string; amount: number }) {
    const s = await sql();
    await s`UPDATE income SET date=${f.date}, memo=${encrypt(f.memo)}, amount=${f.amount} WHERE "user"=${user} AND id=${id}`;
  },
  async remove(user: string, id: number) {
    const s = await sql();
    await s`DELETE FROM income WHERE "user"=${user} AND id=${id}`;
  },
};

import type { WorkoutRow } from "./workout";
import type { BodyRow, BodyValues } from "./body";
import type { IntakeRow, IntakeKind } from "./intake";
import { GOAL_HARD_LIMIT, type GoalCreate, type GoalPatch, type GoalRow, type GoalScope } from "./goals";
export type SavingRow = { id: number; date: string; kind: "saving" | "invest"; memo: string; amount: number };

/** Money set aside: kept apart from expenses so investing a fixed amount is not counted as spending. */
export const savings = {
  async range(user: string, from: string, to: string): Promise<SavingRow[]> {
    const s = await sql();
    const rows = (await s`SELECT id, date, kind, memo, amount FROM saving
      WHERE "user"=${user} AND date >= ${from} AND date < ${to} ORDER BY date DESC, id DESC`) as SavingRow[];
    return rows.map((r) => ({ ...r, memo: decrypt(r.memo) }));
  },
  async add(user: string, date: string, kind: string, memo: string, amount: number) {
    const s = await sql();
    await s`INSERT INTO saving ("user", date, kind, memo, amount) VALUES (${user}, ${date}, ${kind}, ${encrypt(memo)}, ${amount})`;
  },
  async update(user: string, id: number, f: { date: string; kind: string; memo: string; amount: number }) {
    const s = await sql();
    await s`UPDATE saving SET date=${f.date}, kind=${f.kind}, memo=${encrypt(f.memo)}, amount=${f.amount} WHERE "user"=${user} AND id=${id}`;
  },
  async remove(user: string, id: number) {
    const s = await sql();
    await s`DELETE FROM saving WHERE "user"=${user} AND id=${id}`;
  },
};

/** Daily water (ml) and protein (g) totals: one row per day and kind. */
export const intake = {
  async range(user: string, from: string, to: string): Promise<IntakeRow[]> {
    const s = await sql();
    return (await s`SELECT date, kind, amount FROM intake WHERE "user"=${user} AND date >= ${from} AND date < ${to} ORDER BY date`) as IntakeRow[];
  },
  async add(user: string, date: string, kind: string, delta: number) {
    const s = await sql();
    await s`INSERT INTO intake ("user", date, kind, amount) VALUES (${user}, ${date}, ${kind}, GREATEST(${delta}, 0))
      ON CONFLICT ("user", date, kind) DO UPDATE SET amount = GREATEST(0, intake.amount + ${delta})`;
  },
  async set(user: string, date: string, kind: string, amount: number) {
    const s = await sql();
    await s`INSERT INTO intake ("user", date, kind, amount) VALUES (${user}, ${date}, ${kind}, ${amount})
      ON CONFLICT ("user", date, kind) DO UPDATE SET amount = EXCLUDED.amount`;
  },
};

/** Body measurements (InBody and similar). All the numbers live in one encrypted JSON string; only the date is readable by the database. */
export const body = {
  async list(user: string, limit: number): Promise<BodyRow[]> {
    const s = await sql();
    const rows = (await s`SELECT id, date, data FROM body WHERE "user"=${user} ORDER BY date DESC, id DESC LIMIT ${limit}`) as { id: number; date: string; data: string }[];
    return rows.flatMap((r) => { try { return [{ id: r.id, date: r.date, ...JSON.parse(decrypt(r.data)) as BodyValues }]; } catch { return []; } });
  },
  async add(user: string, date: string, v: BodyValues) {
    const s = await sql();
    await s`INSERT INTO body ("user", date, data) VALUES (${user}, ${date}, ${encrypt(JSON.stringify(v))})`;
  },
  async update(user: string, id: number, date: string, v: BodyValues) {
    const s = await sql();
    await s`UPDATE body SET date=${date}, data=${encrypt(JSON.stringify(v))} WHERE "user"=${user} AND id=${id}`;
  },
  async remove(user: string, id: number) {
    const s = await sql();
    await s`DELETE FROM body WHERE "user"=${user} AND id=${id}`;
  },
};

/** Exercise log. The memo is encrypted like every other free text. */
export const workouts = {
  async range(user: string, from: string, to: string): Promise<WorkoutRow[]> {
    const s = await sql();
    const rows = (await s`SELECT id, date, kind, minutes, memo FROM workout
      WHERE "user"=${user} AND date >= ${from} AND date < ${to} ORDER BY date DESC, id DESC`) as WorkoutRow[];
    return rows.map((r) => ({ ...r, memo: decrypt(r.memo) }));
  },
  async add(user: string, date: string, kind: string, minutes: number, memo: string) {
    const s = await sql();
    await s`INSERT INTO workout ("user", date, kind, minutes, memo) VALUES (${user}, ${date}, ${kind}, ${minutes}, ${encrypt(memo)})`;
  },
  async update(user: string, id: number, f: { date: string; kind: string; minutes: number; memo: string }) {
    const s = await sql();
    await s`UPDATE workout SET date=${f.date}, kind=${f.kind}, minutes=${f.minutes}, memo=${encrypt(f.memo)} WHERE "user"=${user} AND id=${id}`;
  },
  async remove(user: string, id: number) {
    const s = await sql();
    await s`DELETE FROM workout WHERE "user"=${user} AND id=${id}`;
  },
};

export const settings = {
  /** Daily goals: water in ml, protein in g. */
  async intakeGoals(user: string): Promise<Record<IntakeKind, number>> {
    const s = await sql();
    const rows = (await s`SELECT water_goal, protein_goal FROM settings WHERE "user"=${user}`) as { water_goal: number; protein_goal: number }[];
    return { water: rows[0]?.water_goal ?? 2000, protein: rows[0]?.protein_goal ?? 100 };
  },
  async setWaterGoal(user: string, ml: number) {
    const s = await sql();
    await s`INSERT INTO settings ("user", water_goal) VALUES (${user}, ${ml}) ON CONFLICT ("user") DO UPDATE SET water_goal = EXCLUDED.water_goal`;
  },
  async setProteinGoal(user: string, g: number) {
    const s = await sql();
    await s`INSERT INTO settings ("user", protein_goal) VALUES (${user}, ${g}) ON CONFLICT ("user") DO UPDATE SET protein_goal = EXCLUDED.protein_goal`;
  },
  async workoutGoal(user: string): Promise<number> {
    const s = await sql();
    const rows = (await s`SELECT workout_goal FROM settings WHERE "user"=${user}`) as { workout_goal: number }[];
    return rows[0]?.workout_goal ?? 3;
  },
  async setWorkoutGoal(user: string, goal: number) {
    const s = await sql();
    await s`INSERT INTO settings ("user", workout_goal) VALUES (${user}, ${goal})
      ON CONFLICT ("user") DO UPDATE SET workout_goal = EXCLUDED.workout_goal`;
  },
  async monthStartDay(user: string): Promise<number> {
    const s = await sql();
    const rows = (await s`SELECT month_start_day FROM settings WHERE "user"=${user}`) as { month_start_day: number }[];
    return rows[0]?.month_start_day ?? 1;
  },
  async setMonthStartDay(user: string, day: number) {
    const s = await sql();
    await s`INSERT INTO settings ("user", month_start_day) VALUES (${user}, ${day})
      ON CONFLICT ("user") DO UPDATE SET month_start_day = EXCLUDED.month_start_day`;
  },
};

export type ReviewRow = { week: string; good: string; hard: string; plan: string; note: string };
type ReviewDb = { week_start: string; good: string; hard: string; plan: string; note: string };
const toReview = (r: ReviewDb): ReviewRow => ({ week: r.week_start, good: decrypt(r.good), hard: decrypt(r.hard), plan: decrypt(r.plan), note: decrypt(r.note) });

/** Sunday weekly review, one row per (user, Monday-of-week). All free text is encrypted at rest. */
export const reviews = {
  async get(user: string, week: string): Promise<ReviewRow | null> {
    const s = await sql();
    const rows = (await s`SELECT week_start, good, hard, plan, note FROM weekly_review WHERE "user"=${user} AND week_start=${week}`) as ReviewDb[];
    return rows[0] ? toReview(rows[0]) : null;
  },
  async list(user: string, limit = 12): Promise<ReviewRow[]> {
    const s = await sql();
    const rows = (await s`SELECT week_start, good, hard, plan, note FROM weekly_review WHERE "user"=${user} ORDER BY week_start DESC LIMIT ${limit}`) as ReviewDb[];
    return rows.map(toReview);
  },
  async upsert(user: string, r: ReviewRow) {
    const s = await sql();
    await s`INSERT INTO weekly_review ("user", week_start, good, hard, plan, note)
      VALUES (${user}, ${r.week}, ${encrypt(r.good)}, ${encrypt(r.hard)}, ${encrypt(r.plan)}, ${encrypt(r.note)})
      ON CONFLICT ("user", week_start) DO UPDATE SET good = EXCLUDED.good, hard = EXCLUDED.hard, plan = EXCLUDED.plan, note = EXCLUDED.note`;
  },
  async remove(user: string, week: string) {
    const s = await sql();
    await s`DELETE FROM weekly_review WHERE "user"=${user} AND week_start=${week}`;
  },
};

/**
 * Connected work tools (GitHub, Jira). The whole config, including the access token, is one encrypted JSON string;
 * it is only ever decrypted on the server and never sent to the browser.
 */
export const integrations = {
  async list(user: string): Promise<{ provider: string; config: Record<string, string> }[]> {
    const s = await sql();
    const rows = (await s`SELECT provider, config FROM integration WHERE "user"=${user} ORDER BY provider`) as { provider: string; config: string }[];
    return rows.flatMap((r) => { try { return [{ provider: r.provider, config: JSON.parse(decrypt(r.config)) }]; } catch { return []; } });
  },
  async save(user: string, provider: string, config: Record<string, string>) {
    const s = await sql();
    await s`INSERT INTO integration ("user", provider, config) VALUES (${user}, ${provider}, ${encrypt(JSON.stringify(config))})
      ON CONFLICT ("user", provider) DO UPDATE SET config = EXCLUDED.config`;
  },
  async remove(user: string, provider: string) {
    const s = await sql();
    await s`DELETE FROM integration WHERE "user"=${user} AND provider=${provider}`;
  },
};

type GoalDb = Omit<GoalRow, "text"> & { text: string };
const toGoal = (r: GoalDb): GoalRow => ({ ...r, text: decrypt(r.text) });

/** Day / week goals (scope + period_start; a week's period_start is its Monday). The text is encrypted at rest. */
export const goals = {
  /** [from, to] inclusive. */
  async range(user: string, scope: GoalScope, from: string, to: string): Promise<GoalRow[]> {
    const s = await sql();
    const rows = (await s`SELECT id, scope, period_start, text, done, position FROM goal
      WHERE "user"=${user} AND scope=${scope} AND period_start >= ${from} AND period_start <= ${to}
      ORDER BY period_start, position, id`) as GoalDb[];
    return rows.map(toGoal);
  },
  /** Appends after the last position. Returns null when the per-period hard limit is already reached (one atomic statement). */
  async add(user: string, g: GoalCreate): Promise<GoalRow | null> {
    const s = await sql();
    const rows = (await s`INSERT INTO goal ("user", scope, period_start, text, position)
      SELECT ${user}::text, ${g.scope}::text, ${g.period_start}::text, ${encrypt(g.text)}::text, COALESCE(MAX(position) + 1, 0)
      FROM goal WHERE "user"=${user} AND scope=${g.scope} AND period_start=${g.period_start}
      HAVING COUNT(*) < ${GOAL_HARD_LIMIT}::int
      RETURNING id, scope, period_start, text, done, position`) as GoalDb[];
    return rows[0] ? toGoal(rows[0]) : null;
  },
  /** Partial update; null when the id does not exist for this user. */
  async update(user: string, p: GoalPatch): Promise<GoalRow | null> {
    const s = await sql();
    const text = p.text === undefined ? null : encrypt(p.text);
    const rows = (await s`UPDATE goal SET text=COALESCE(${text}::text, text), done=COALESCE(${p.done ?? null}::boolean, done),
      position=COALESCE(${p.position ?? null}::int, position)
      WHERE id=${p.id} AND "user"=${user}
      RETURNING id, scope, period_start, text, done, position`) as GoalDb[];
    return rows[0] ? toGoal(rows[0]) : null;
  },
  async remove(user: string, id: number): Promise<boolean> {
    const s = await sql();
    const rows = (await s`DELETE FROM goal WHERE id=${id} AND "user"=${user} RETURNING id`) as { id: number }[];
    return rows.length > 0;
  },
};
