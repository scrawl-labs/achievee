"use client";
import { Button } from "@achievee/ui";
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
 * Layout: a heading with a small done/total ring, the list, then the add button. Same quiet pattern as goals: no tasks shows only the add button, no hint or warning; the server's hard limit is the only block.
 * Callers pass `key={date}` so a new day starts with fresh state.
 */
export default function TodoList({ date, google, label }: { date: string; google: readonly TaskItem[]; label: string }) {
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
    <section className="goals todos" aria-label={label}>
      <div className="dp-h">
        <h4>{label}</h4>
        {total > 0 && (
          <span className="dp-ring" title={t("task.count", { done, total })}>
            <svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15" /><circle cx="18" cy="18" r="15" className="on" strokeDasharray={`${(done / total) * 94.25} 94.25`} /></svg>
            <span className="sr-only">{t("task.count", { done, total })}</span><b aria-hidden="true">{done}/{total}</b>
          </span>
        )}
      </div>
      {total > 0 && (
        <ul>
          {list.map((e) => e.source === "own" ? (
            <GoalItem key={e.key} goal={e} toggleKey="todo.toggle" editKey="todo.edit" onToggle={(d) => patch(e.id, { done: d })} onText={(text) => patch(e.id, { text })} onRemove={() => remove(e.id)} />
          ) : <GoogleTaskRow key={e.key} title={e.text} done={e.done} />)}
        </ul>
      )}
      {draft !== null ? (
        <GoalInput initial={draft} allowUnchanged label={t("task.new")} placeholder={t("todo.placeholder")} returnFocus={addBtn} onSubmit={submit} onCancel={() => setDraft(null)} />
      ) : (
        <Button variant="ghost" className="goal-add" type="button" ref={addBtn} onClick={() => setDraft("")}><Icon name="plus" size={16} />{t("task.add")}</Button>
      )}
      {error && <small className="goal-msg" role="alert">{error === "limit" ? t("todo.limit") : t("goal.failed")}</small>}
    </section>
  );
}
