import { forwardRef, type InputHTMLAttributes } from "react";
import { cx } from "./cx";

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  /** round (default): marking a goal or to-do done. square: turning an option on or off in a list (calendars). */
  shape?: "round" | "square";
};

/** A check. Give it an aria-label, or put it inside a label with the text. */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox({ shape = "round", className, ...rest }, ref) {
  return <input ref={ref} type="checkbox" className={cx("ac-check", shape === "square" && "ac-check--square", className)} {...rest} />;
});
