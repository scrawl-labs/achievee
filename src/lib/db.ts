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
    s`CREATE TABLE IF NOT EXISTS expense (
      id SERIAL PRIMARY KEY, "user" TEXT NOT NULL, date TEXT NOT NULL, category TEXT NOT NULL,
      memo TEXT NOT NULL DEFAULT '', amount INTEGER NOT NULL, need INTEGER NOT NULL DEFAULT 1)`,
    s`CREATE INDEX IF NOT EXISTS expense_user_date ON expense ("user", date)`,
  ]).catch((e) => { _ready = undefined; throw e; });
  await _ready;
  return s;
}

const bounds = (ym: string) => [`${ym}-01`, `${ym}-31`] as const;

export type DiaryRow = { date: string; mood: string | null; body: string };
export type ExpenseRow = { id: number; date: string; category: string; memo: string; amount: number; need: number };

export const diary = {
  async month(user: string, ym: string): Promise<DiaryRow[]> {
    const s = await sql(), [a, b] = bounds(ym);
    const rows = (await s`SELECT date, mood, body FROM diary WHERE "user"=${user} AND date BETWEEN ${a} AND ${b} ORDER BY date`) as DiaryRow[];
    return rows.map((r) => ({ ...r, body: decrypt(r.body) }));
  },
  async upsert(user: string, date: string, mood: string | null, body: string) {
    const s = await sql();
    await s`INSERT INTO diary ("user", date, mood, body) VALUES (${user}, ${date}, ${mood}, ${encrypt(body)})
      ON CONFLICT ("user", date) DO UPDATE SET mood = EXCLUDED.mood, body = EXCLUDED.body`;
  },
  async remove(user: string, date: string) {
    const s = await sql();
    await s`DELETE FROM diary WHERE "user"=${user} AND date=${date}`;
  },
};

/** Remove everything stored for a user (the in-app "Delete my data"). */
export async function deleteUserData(user: string) {
  const s = await sql();
  await s.transaction([s`DELETE FROM diary WHERE "user"=${user}`, s`DELETE FROM expense WHERE "user"=${user}`]);
}

export const expenses = {
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
  async setNeed(user: string, id: number, need: boolean) {
    const s = await sql();
    await s`UPDATE expense SET need=${need ? 1 : 0} WHERE "user"=${user} AND id=${id}`;
  },
  async remove(user: string, id: number) {
    const s = await sql();
    await s`DELETE FROM expense WHERE "user"=${user} AND id=${id}`;
  },
};
