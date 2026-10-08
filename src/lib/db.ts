import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";

// Diary + expenses live in a local SQLite file (Node's built-in driver, no native deps).
// Note: needs a persistent disk; on serverless hosts swap this for a hosted DB.
let _db: DatabaseSync | undefined;
/** Opened lazily so `next build` (parallel workers) never touches the file. */
function db(): DatabaseSync {
  if (_db) return _db;
  mkdirSync("data", { recursive: true });
  const d = new DatabaseSync(process.env.DB_PATH ?? "data/achievee.db");
  d.exec("PRAGMA busy_timeout = 5000");
  d.exec(`
    CREATE TABLE IF NOT EXISTS diary (
      user TEXT NOT NULL, date TEXT NOT NULL, mood TEXT, body TEXT NOT NULL DEFAULT '',
      PRIMARY KEY (user, date));
    CREATE TABLE IF NOT EXISTS expense (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user TEXT NOT NULL, date TEXT NOT NULL,
      category TEXT NOT NULL, memo TEXT NOT NULL DEFAULT '', amount INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS expense_user_date ON expense(user, date);
  `);
  // need: 1 = 필요한 지출, 0 = 불필요한 지출 (added after first release, so migrate in place)
  if (!(d.prepare("PRAGMA table_info(expense)").all() as { name: string }[]).some((c) => c.name === "need")) {
    d.exec("ALTER TABLE expense ADD COLUMN need INTEGER NOT NULL DEFAULT 1");
  }
  return (_db = d);
}

export type DiaryRow = { date: string; mood: string | null; body: string };
export type ExpenseRow = { id: number; date: string; category: string; memo: string; amount: number; need: number };

export const diary = {
  month: (user: string, ym: string) =>
    db().prepare("SELECT date, mood, body FROM diary WHERE user=? AND date LIKE ? ORDER BY date").all(user, `${ym}-%`) as DiaryRow[],
  upsert: (user: string, date: string, mood: string | null, body: string) =>
    db().prepare(`INSERT INTO diary (user,date,mood,body) VALUES (?,?,?,?)
      ON CONFLICT(user,date) DO UPDATE SET mood=excluded.mood, body=excluded.body`).run(user, date, mood, body),
  remove: (user: string, date: string) => db().prepare("DELETE FROM diary WHERE user=? AND date=?").run(user, date),
};

export const expenses = {
  month: (user: string, ym: string) =>
    db().prepare("SELECT id,date,category,memo,amount,need FROM expense WHERE user=? AND date LIKE ? ORDER BY date DESC, id DESC")
      .all(user, `${ym}-%`) as ExpenseRow[],
  add: (user: string, date: string, category: string, memo: string, amount: number, need: boolean) =>
    db().prepare("INSERT INTO expense (user,date,category,memo,amount,need) VALUES (?,?,?,?,?,?)").run(user, date, category, memo, amount, need ? 1 : 0),
  setNeed: (user: string, id: number, need: boolean) =>
    db().prepare("UPDATE expense SET need=? WHERE user=? AND id=?").run(need ? 1 : 0, user, id),
  remove: (user: string, id: number) => db().prepare("DELETE FROM expense WHERE user=? AND id=?").run(user, id),
};
