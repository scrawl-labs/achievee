import type { ReactNode } from "react";
import { cx } from "./cx";

/**
 * A past entry (a diary day, a weekly review) that opens in place. Closed: the title, a small aside and two lines of
 * preview. Open: the preview in full, then `children` (more answers, an Edit button).
 */
export function EntryCard({ title, aside, extra, preview, open, onToggle, current, children, className }: {
  title: ReactNode;
  /** Right of the title, before the chevron (mood dots). */
  aside?: ReactNode;
  /** Under the title (a TagRow of emotion words). */
  extra?: ReactNode;
  preview?: ReactNode;
  open: boolean;
  onToggle: () => void;
  /** The entry the editor above is showing: outlined with the accent. */
  current?: boolean;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("ac-entry", open && "ac-entry--open", current && "ac-entry--current", className)}>
      <button type="button" className="ac-entry__head" aria-expanded={open} onClick={onToggle}>
        <span className="ac-entry__top">
          <b>{title}</b>
          <span className="ac-entry__aside">{aside}<svg className="ac-entry__chev" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
        </span>
        {extra}
        {preview != null && preview !== false && preview !== "" && <p className="ac-entry__preview">{preview}</p>}
      </button>
      {open && children != null && <div className="ac-entry__body">{children}</div>}
    </div>
  );
}
