"use client";
import { useRef, useState } from "react";
import type { GoalScope } from "@/lib/goals";
import { GOAL_HARD_LIMIT } from "@/lib/goals";
import { showSoftHint } from "@/lib/goalsUi";
import { useI18n } from "./I18n";
import { useGoals } from "./useGoals";
import GoalInput from "./GoalInput";
import GoalItem from "./GoalItem";
import Icon from "./Icon";

type Props = { scope: GoalScope; periodStart: string; label: string };

/**
 * Goals for one day or one week. Never nags: an empty list shows only the add button, and more than a few goals
 * gets a quiet hint (the server's hard limit is the only thing that blocks). Nothing carries over automatically.
 */
export default function GoalList({ scope, periodStart, label }: Props) {
  const { t } = useI18n();
  const { rows, error, add, patch, remove } = useGoals(scope, periodStart);
  const [draft, setDraft] = useState<string | null>(null); // text of the open add-input; null = closed
  const addBtn = useRef<HTMLButtonElement>(null);
  // Close right away for a snappy feel; if the save fails, reopen with the same text so nothing typed is lost.
  const submit = async (text: string) => {
    setDraft(null);
    if (!(await add(text))) setDraft(text);
  };
  return (
    <section className="goals" aria-label={label}>
      <h4>{label}</h4>
      {rows.length > 0 && (
        <ul>
          {rows.map((g) => (
            <GoalItem key={g.id} goal={g} onToggle={(done) => patch(g.id, { done })} onText={(text) => patch(g.id, { text })} onRemove={() => remove(g.id)} />
          ))}
        </ul>
      )}
      {draft !== null ? (
        <GoalInput initial={draft} allowUnchanged label={t("goal.new")} placeholder={t("goal.placeholder")} returnFocus={addBtn} onSubmit={submit} onCancel={() => setDraft(null)} />
      ) : (
        <button type="button" ref={addBtn} className="btn ghost goal-add" onClick={() => setDraft("")}><Icon name="plus" size={16} />{t("goal.add")}</button>
      )}
      {showSoftHint(rows.length) && <small className="muted" role="note">{t("goal.softHint")}</small>}
      {error && <small className="goal-msg" role="alert">{error === "limit" ? t("goal.limit", { n: GOAL_HARD_LIMIT }) : t("goal.failed")}</small>}
    </section>
  );
}
