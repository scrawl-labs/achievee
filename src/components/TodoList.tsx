"use client";
import { useRef, useState } from "react";
import { useI18n } from "./I18n";
import { useTodos } from "./useTodos";
import GoalInput from "./GoalInput";
import GoalItem from "./GoalItem";
import Icon from "./Icon";

/**
 * Own to-dos of one day (Google Tasks stay a separate, read-only list below). Same quiet pattern as goals:
 * an empty list shows only the add button, no hint or warning; the server's hard limit is the only block.
 * Callers pass `key={date}` so a new day starts with fresh state.
 */
export default function TodoList({ date }: { date: string }) {
  const { t } = useI18n();
  const { rows, error, add, patch, remove } = useTodos(date);
  const [draft, setDraft] = useState<string | null>(null); // text of the open add-input; null = closed
  const addBtn = useRef<HTMLButtonElement>(null);
  // Close right away for a snappy feel; if the save fails, reopen with the same text so nothing typed is lost.
  const submit = async (text: string) => {
    setDraft(null);
    if (!(await add(text))) setDraft(text);
  };
  return (
    <section className="goals todos" aria-label={t("todo.title")}>
      <h4>{t("todo.title")}</h4>
      {rows.length > 0 && (
        <ul>
          {rows.map((r) => (
            <GoalItem key={r.id} goal={r} toggleKey="todo.toggle" editKey="todo.edit" onToggle={(done) => patch(r.id, { done })} onText={(text) => patch(r.id, { text })} onRemove={() => remove(r.id)} />
          ))}
        </ul>
      )}
      {draft !== null ? (
        <GoalInput initial={draft} allowUnchanged label={t("todo.new")} placeholder={t("todo.placeholder")} returnFocus={addBtn} onSubmit={submit} onCancel={() => setDraft(null)} />
      ) : (
        <button type="button" ref={addBtn} className="btn ghost goal-add" onClick={() => setDraft("")}><Icon name="plus" size={16} />{t("todo.add")}</button>
      )}
      {error && <small className="goal-msg" role="alert">{error === "limit" ? t("todo.limit") : t("goal.failed")}</small>}
    </section>
  );
}
