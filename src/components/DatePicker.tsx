"use client";
import { useEffect, useRef, useState } from "react";
import { addDays, addMonths, dow } from "@/lib/dates";
import { todayStr } from "@/lib/clientTime";
import { useI18n } from "./I18n";
import Icon from "./Icon";
import { useApi } from "./useApi";

const MON_FIRST = [1, 2, 3, 4, 5, 6, 0];

type Props = {
  value: string;                              // YYYY-MM-DD
  onChange: (date: string) => void;
  marksUrl?: (ym: string) => string;          // an API that lists { date } rows for a month; those days get a dot
  label?: string;
};

/** Date field with a month popover, in place of the browser's own date input. Keyboard: arrows move, PageUp/PageDown change month, Enter picks, Esc closes. */
export default function DatePicker({ value, onChange, marksUrl, label }: Props) {
  const { t, fmt } = useI18n();
  const [open, setOpen] = useState(false);
  const [focusDay, setFocusDay] = useState(value);
  const box = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const view = focusDay.slice(0, 7); // the month on screen follows the keyboard / arrow focus
  const marks = useApi<{ date: string }[]>(open && marksUrl ? marksUrl(view) : null).data;
  const marked = new Set((marks ?? []).map((m) => m.date));
  const today = todayStr();

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open]);
  useEffect(() => { if (open) box.current?.querySelector<HTMLElement>(`[data-d="${focusDay}"]`)?.focus(); }, [open, focusDay]);

  const show = () => { setFocusDay(value); setOpen(true); };
  const pick = (d: string) => { onChange(d); setOpen(false); trigger.current?.focus(); };
  const go = (n: number) => setFocusDay(addMonths(`${view}-01`, n).slice(0, 8) + String(Math.min(Number(focusDay.slice(8)), 28)).padStart(2, "0"));

  const onKey = (e: React.KeyboardEvent) => {
    const step: Record<string, () => void> = {
      ArrowLeft: () => setFocusDay(addDays(focusDay, -1)), ArrowRight: () => setFocusDay(addDays(focusDay, 1)),
      ArrowUp: () => setFocusDay(addDays(focusDay, -7)), ArrowDown: () => setFocusDay(addDays(focusDay, 7)),
      PageUp: () => go(-1), PageDown: () => go(1),
      Escape: () => { setOpen(false); trigger.current?.focus(); },
    };
    if (step[e.key]) { e.preventDefault(); step[e.key](); }
  };

  const first = `${view}-01`;
  const lead = (dow(first) + 6) % 7; // blanks before the 1st (Monday first)
  const count = Number(addDays(addMonths(first, 1), -1).slice(8));

  return (
    <div className="dp" ref={box}>
      <button type="button" className="dp-btn" aria-haspopup="dialog" aria-expanded={open} aria-label={label} onClick={() => (open ? setOpen(false) : show())}>
        <span>{fmt.date(value)}</span><Icon name="calendar" size={16} />
      </button>
      {open && (
        <div className="dp-pop" role="dialog" aria-label={fmt.monthYear(view)} onKeyDown={onKey}>
          <div className="dp-head">
            <button type="button" className="icon" aria-label={t("common.prev")} onClick={() => go(-1)}><Icon name="left" size={16} /></button>
            <b>{fmt.monthYear(view)}</b>
            <button type="button" className="icon" aria-label={t("common.next")} onClick={() => go(1)}><Icon name="right" size={16} /></button>
          </div>
          <div className="dp-grid dp-dow">{MON_FIRST.map((d) => <span key={d}>{fmt.weekdayShort(d)}</span>)}</div>
          <div className="dp-grid">
            {Array.from({ length: lead }, (_, i) => <span key={`b${i}`} />)}
            {Array.from({ length: count }, (_, i) => {
              const d = `${view}-${String(i + 1).padStart(2, "0")}`, w = dow(d);
              return (
                <button type="button" key={d} data-d={d} tabIndex={d === focusDay ? 0 : -1}
                  className={`dp-day${d === value ? " sel" : ""}${d === today ? " today" : ""}${w === 0 ? " sun" : w === 6 ? " sat" : ""}${marked.has(d) ? " mark" : ""}`}
                  onClick={() => pick(d)}>{i + 1}</button>
              );
            })}
          </div>
          <div className="dp-foot"><button type="button" className="btn" onClick={() => pick(today)}>{t("common.today")}</button></div>
        </div>
      )}
    </div>
  );
}
