"use client";
import { IconButton } from "@achievee/ui";
import { useRef, useState } from "react";
import type { Key } from "@/lib/i18n";
import { useI18n } from "./I18n";
import GoalInput from "./GoalInput";
import Icon from "./Icon";

type Props = {
  goal: { text: string; done: boolean };
  /** Accessible-name templates ({text}); goals by default, to-dos pass their own. */
  toggleKey?: Key;
  editKey?: Key;
  onToggle: (done: boolean) => void; onText: (text: string) => void; onRemove: () => void;
};

/** Checkbox + text on the left edge (click the text to edit), delete on the right edge. Shared by goals and to-dos. */
export default function GoalItem({ goal, toggleKey = "goal.toggle", editKey = "goal.edit", onToggle, onText, onRemove }: Props) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const textBtn = useRef<HTMLButtonElement>(null);
  return (
    <li className={`goal${goal.done ? " done" : ""}`}>
      <input type="checkbox" checked={goal.done} onChange={(e) => onToggle(e.target.checked)} aria-label={t(toggleKey, { text: goal.text })} />
      {editing ? (
        <GoalInput initial={goal.text} label={t(editKey, { text: goal.text })} saveOnBlur returnFocus={textBtn} onSubmit={(v) => { setEditing(false); onText(v); }} onCancel={() => setEditing(false)} />
      ) : (
        <button type="button" ref={textBtn} className="goal-text" aria-label={t(editKey, { text: goal.text })} onClick={() => setEditing(true)}>{goal.text}</button>
      )}
      <IconButton label={t("common.delete")} icon={<Icon name="close" size={16} />} type="button" onClick={onRemove} />
    </li>
  );
}
