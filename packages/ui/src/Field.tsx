import { forwardRef, type InputHTMLAttributes, type LabelHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cx } from "./cx";

/** A one-line value (amount, memo): a borderless sunk layer with an accent ring on focus. */
export const Field = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Field({ className, ...rest }, ref) {
  return <input ref={ref} className={cx("ac-field", className)} {...rest} />;
});

/** Long writing (the diary): a borderless sunk layer, 17px text, no resize handle. Save as people type; no Save button under it. */
export const Paper = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Paper({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cx("ac-paper", className)} {...rest} />;
});

/** The label above a field or a group. */
export function Label({ className, ...rest }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cx("ac-label", className)} {...rest} />;
}

/** Under a Paper: the count on the left, the save state on the right. */
export function SaveStatus({ count, state, labels, onRetry }: {
  count: string;
  state: "saved" | "saving" | "failed";
  labels: { saved: string; saving: string; retry: string };
  onRetry?: () => void;
}) {
  return (
    <div className="ac-savestatus" aria-live="polite">
      <small>{count}</small>
      {state === "failed" ? <button type="button" className="ac-btn ac-btn--quiet ac-btn--sm" onClick={onRetry}>{labels.retry}</button>
        : <small className={cx(state === "saved" && "ac-savestatus--saved")}>{state === "saved" ? labels.saved : labels.saving}</small>}
    </div>
  );
}
