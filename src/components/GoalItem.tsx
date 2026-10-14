"use client";
import { useRef, useState } from "react";
import type { GoalRow } from "@/lib/goals";
import { useI18n } from "./I18n";
import GoalInput from "./GoalInput";
import Icon from "./Icon";

type Props = { goal: GoalRow; onToggle: (done: boolean) => void; onText: (text: string) => void; onRemove: () => void };

/** Checkbox + text on the left edge (click the text to edit), delete on the right edge. */
export default function GoalItem({ goal, onToggle, onText, onRemove }: Props) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const textBtn = useRef<HTMLButtonElement>(null);
  return (
    <li className={`goal${goal.done ? " done" : ""}`}>
      <input type="checkbox" checked={goal.done} onChange={(e) => onToggle(e.target.checked)} aria-label={t("goal.toggle", { text: goal.text })} />
      {editing ? (
        <GoalInput initial={goal.text} label={t("goal.edit", { text: goal.text })} saveOnBlur returnFocus={textBtn} onSubmit={(v) => { setEditing(false); onText(v); }} onCancel={() => setEditing(false)} />
      ) : (
        <button type="button" ref={textBtn} className="goal-text" aria-label={t("goal.edit", { text: goal.text })} onClick={() => setEditing(true)}>{goal.text}</button>
      )}
      <button type="button" className="btn icon ghost" onClick={onRemove} aria-label={t("common.delete")} title={t("common.delete")}><Icon name="close" size={16} /></button>
    </li>
  );
}
