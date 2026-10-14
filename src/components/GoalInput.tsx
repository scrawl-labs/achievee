"use client";
import { useRef, useState } from "react";
import { GOAL_TEXT_MAX } from "@/lib/goals";
import { normalizeGoalText } from "@/lib/goalsUi";

type Props = {
  initial?: string;
  label: string;
  placeholder?: string;
  /** Edit mode saves on blur; add mode keeps what was typed and only closes on blur when it is empty. */
  saveOnBlur?: boolean;
  /** Save even when the text equals `initial` (used to retry a failed add with its preserved draft). */
  allowUnchanged?: boolean;
  /** After Enter/Esc, keyboard focus goes back here (not on blur: that would steal focus from wherever the user clicked). */
  returnFocus?: React.RefObject<HTMLElement>;
  onSubmit: (text: string) => void;
  onCancel: () => void;
};

/** One-line input: Enter saves, Esc cancels. Enter during IME composition (Korean/Japanese/Chinese) is left to the IME. */
export default function GoalInput({ initial = "", label, placeholder, saveOnBlur = false, allowUnchanged = false, returnFocus, onSubmit, onCancel }: Props) {
  const [text, setText] = useState(initial);
  const done = useRef(false); // submit/cancel already ran; ignore the blur that follows unmounting
  const finish = (save: boolean, viaKey = false) => {
    if (done.current) return;
    done.current = true;
    const v = normalizeGoalText(text);
    if (save && v !== null && (allowUnchanged || v !== initial)) onSubmit(v); else onCancel();
    if (viaKey) requestAnimationFrame(() => returnFocus?.current?.focus());
  };
  return (
    <input
      className="goal-input" autoFocus value={text} maxLength={GOAL_TEXT_MAX} aria-label={label} placeholder={placeholder}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => {
        if (e.nativeEvent.isComposing || e.keyCode === 229) return; // 229: Safari reports the IME-confirming Enter this way
        if (e.key === "Enter") { e.preventDefault(); finish(true, true); }
        else if (e.key === "Escape") { e.preventDefault(); finish(false, true); }
      }}
      onBlur={() => { if (saveOnBlur) finish(true); else if (!text.trim()) finish(false); }}
    />
  );
}
