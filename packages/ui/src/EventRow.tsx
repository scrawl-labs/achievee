import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { cx } from "./cx";

export type EventRowProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "title"> & {
  /** Short count-down in front (D-2, 오늘). */
  badge?: ReactNode;
  /** now: today. soon: tomorrow. Both stand out more than the rest. */
  badgeTone?: "now" | "soon";
  title: ReactNode;
  /** The day and time. */
  meta?: ReactNode;
  /** own: one of ours, filled with the accent. external: from another calendar, outlined with that calendar's colour. */
  tone?: "own" | "external";
  /** external only: the calendar's colour, used for the left edge. */
  color?: string;
};

/** One upcoming event: badge, title, day and time. Two lines on wide screens, one line on phones. */
export function EventRow({ badge, badgeTone, title, meta, tone = "own", color, className, style, ...rest }: EventRowProps) {
  const s = tone === "external" && color ? ({ ...style, ["--ac-event-color" as string]: color } as CSSProperties) : style;
  return (
    <button type="button" className={cx("ac-event", `ac-event--${tone}`, className)} style={s} {...rest}>
      {badge != null && <span className={cx("ac-event__badge", badgeTone && `ac-event__badge--${badgeTone}`)}>{badge}</span>}
      <b className="ac-event__title">{title}</b>
      {meta != null && <span className="ac-event__meta">{meta}</span>}
    </button>
  );
}
