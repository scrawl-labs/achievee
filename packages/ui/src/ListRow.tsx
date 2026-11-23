import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

/** The day and its total above a group of rows. */
export function DayHeader({ day, total }: { day: ReactNode; total?: ReactNode }) {
  return <div className="ac-dayhead"><span>{day}</span>{total !== undefined && <span>{total}</span>}</div>;
}

/** A Surface without padding that holds rows divided by hairlines. */
export function List({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("ac-list", className)} {...rest} />;
}

export type ListRowProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "title"> & {
  icon?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  /** Marked in danger with a word too (불필요): a red edge plus the flag text. */
  flag?: ReactNode;
  amount?: ReactNode;
  tone?: "default" | "good";
  /** Shown on hover, or when the row is open (tapped). */
  actions?: ReactNode;
  open?: boolean;
};

/** One record on one line: icon, title (memo), a small line (category, flag), the amount. Actions on hover or tap. */
export function ListRow({ icon, title, meta, flag, amount, tone = "default", actions, open, className, ...rest }: ListRowProps) {
  return (
    <div className={cx("ac-row", flag != null && flag !== false && "ac-row--flag", open && "ac-row--open")}>
      <button type="button" className={cx("ac-row__main", className)} aria-expanded={actions ? !!open : undefined} {...rest}>
        {icon && <span className="ac-row__icon" aria-hidden="true">{icon}</span>}
        <span className="ac-row__text"><b>{title}</b>{(meta || flag) && <small>{meta}{flag && <em>{flag}</em>}</small>}</span>
        {amount != null && <b className={cx("ac-row__amount", tone === "good" && "ac-row__amount--good")}>{amount}</b>}
      </button>
      {actions && <span className="ac-row__actions">{actions}</span>}
    </div>
  );
}
