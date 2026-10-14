"use client";
import { useRef, useState } from "react";
import type { TaskItem } from "@/lib/types";
import { mergeTasks, taskCounts } from "@/lib/taskList";
import { useI18n } from "./I18n";
import { useTodos } from "./useTodos";
import GoalInput from "./GoalInput";
import GoalItem from "./GoalItem";
import GoogleTaskRow from "./GoogleTaskRow";
import Icon from "./Icon";

/**
 * The day's tasks as one list: own to-dos (check / edit / delete) and Google tasks (read-only), unfinished first.
 * Same quiet pattern as goals: an empty list shows only the add button, no hint or warning; the server's hard limit is the only block.
 * Callers pass `key={date}` so a new day starts with fresh state.
 */
export default function TodoList({ date, google }: { date: string; google: readonly TaskItem[] }) {
  const { t } = useI18n();
  const { rows, error, add, patch, remove } = useTodos(date);
  const [draft, setDraft] = useState<string | null>(null); // text of the open add-input; null = closed
  const addBtn = useRef<HTMLButtonElement>(null);
  const list = mergeTasks(rows, google);
  const { done, total } = taskCounts(list); // from the list itself: /api/month's counts already include the own to-dos
  // Close right away for a snappy feel; if the save fails, reopen with the same text so nothing typed is lost.
  const submit = async (text: string) => {
    setDraft(null);
    if (!(await add(text))) setDraft(text);
  };
  return (
    <section className="goals todos" aria-label={t("task.title")}>
      <div className="goals-head">
        <h4>{t("task.title")}</h4>
        {total > 0 && <span className="goal-count"><span aria-hidden="true">{done} / {total}</span><span className="sr-only">{t("task.count", { done, total })}</span></span>}
      </div>
      {total > 0 && (
        <>
          <div className="meter" aria-hidden="true"><i style={{ width: `${(done / total) * 100}%` }} /></div>
          <ul>
            {list.map((e) => e.source === "own" ? (
              <GoalItem key={e.key} goal={e} toggleKey="todo.toggle" editKey="todo.edit" onToggle={(d) => patch(e.id, { done: d })} onText={(text) => patch(e.id, { text })} onRemove={() => remove(e.id)} />
            ) : <GoogleTaskRow key={e.key} title={e.text} done={e.done} />)}
          </ul>
        </>
      )}
      {draft !== null ? (
        <GoalInput initial={draft} allowUnchanged label={t("task.new")} placeholder={t("todo.placeholder")} returnFocus={addBtn} onSubmit={submit} onCancel={() => setDraft(null)} />
      ) : (
        <button type="button" ref={addBtn} className="btn ghost goal-add" onClick={() => setDraft("")}><Icon name="plus" size={16} />{t("task.add")}</button>
      )}
      {error && <small className="goal-msg" role="alert">{error === "limit" ? t("todo.limit") : t("goal.failed")}</small>}
    </section>
  );
}
