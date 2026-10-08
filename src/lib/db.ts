import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";

// Diary + expenses live in a local SQLite file (Node's built-in driver, no native deps).
// Note: needs a persistent disk; on serverless hosts swap this for a hosted DB.
mkdirSync("data", { recursive: true });
const db = new DatabaseSync(process.env.DB_PATH ?? "data/achievee.db");
db.exec(`
  CREATE TABLE IF NOT EXISTS diary (
    user TEXT NOT NULL, date TEXT NOT NULL, mood TEXT, body TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (user, date));
  CREATE TABLE IF NOT EXISTS expense (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user TEXT NOT NULL, date TEXT NOT NULL,
    category TEXT NOT NULL, memo TEXT NOT NULL DEFAULT '', amount INTEGER NOT NULL);
  CREATE INDEX IF NOT EXISTS expense_user_date ON expense(user, date);
`);

export type DiaryRow = { date: string; mood: string | null; body: string };
export type ExpenseRow = { id: number; date: string; category: string; memo: string; amount: number };

export const diary = {
  month: (user: string, ym: string) =>
    db.prepare("SELECT date, mood, body FROM diary WHERE user=? AND date LIKE ? ORDER BY date").all(user, `${ym}-%`) as DiaryRow[],
  upsert: (user: string, date: string, mood: string | null, body: string) =>
    db.prepare(`INSERT INTO diary (user,date,mood,body) VALUES (?,?,?,?)
      ON CONFLICT(user,date) DO UPDATE SET mood=excluded.mood, body=excluded.body`).run(user, date, mood, body),
  remove: (user: string, date: string) => db.prepare("DELETE FROM diary WHERE user=? AND date=?").run(user, date),
};

export const expenses = {
  month: (user: string, ym: string) =>
    db.prepare("SELECT id,date,category,memo,amount FROM expense WHERE user=? AND date LIKE ? ORDER BY date DESC, id DESC")
      .all(user, `${ym}-%`) as ExpenseRow[],
  add: (user: string, date: string, category: string, memo: string, amount: number) =>
    db.prepare("INSERT INTO expense (user,date,category,memo,amount) VALUES (?,?,?,?,?)").run(user, date, category, memo, amount),
  remove: (user: string, id: number) => db.prepare("DELETE FROM expense WHERE user=? AND id=?").run(user, id),
};
