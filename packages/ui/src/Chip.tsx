import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

export type ChipProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  children: ReactNode;
  /** on: chosen. add: the "＋ 단어" chip that opens a picker. */
  selected?: boolean;
  add?: boolean;
  /** Shows a × after the label; the whole chip removes it. */
  removable?: boolean;
};

/** A short choice: emotion words, list filters. Text only, no icons or emoji. */
export function Chip({ selected, add, removable, className, children, type = "button", ...rest }: ChipProps) {
  return (
    <button type={type} aria-pressed={add ? undefined : !!selected} className={cx("ac-chip", selected && "ac-chip--on", add && "ac-chip--add", className)} {...rest}>
      {children}{removable && <span className="ac-chip__x" aria-hidden="true">×</span>}
    </button>
  );
}

/** A row of chips that wraps; `scroll` keeps it on one line and scrolls sideways (filters on phones). */
export function ChipRow({ scroll, className, ...rest }: React.HTMLAttributes<HTMLDivElement> & { scroll?: boolean }) {
  return <div className={cx("ac-chips", scroll && "ac-chips--scroll", className)} {...rest} />;
}
