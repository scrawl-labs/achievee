"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DayEvent } from "@/lib/types";
import { dow } from "@/lib/dates";
import { browserTz, todayStr } from "@/lib/clientTime";
import { nativeIdOf, type NativeEventCreate } from "@/lib/nativeEvents";
import { cellOfY, columnAt, moveRange, resizeEnd, selectionRange } from "@/lib/slotSelect";
import type { TaskEntry } from "@/lib/taskList";
import { useI18n } from "./I18n";
import AllDayRow from "./AllDayRow";
import EventComposer from "./EventComposer";

const H = 56; // px per hour
export const hhmm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/** Column-pack overlapping events: each overlapping cluster shares one column count. */
function layout(events: DayEvent[]) {
  const res: { e: DayEvent; col: number; cols: number }[] = [];
  let cluster: { e: DayEvent; col: number }[] = [];
  let clusterEnd = -1;
  const flush = () => {
    const cols = Math.max(1, ...cluster.map((c) => c.col + 1));
    cluster.forEach((c) => res.push({ ...c, cols }));
    cluster = [];
  };
  for (const e of events) {
    if (cluster.length && e.startMin >= clusterEnd) { flush(); clusterEnd = -1; }
    const used = cluster.filter((c) => c.e.endMin > e.startMin).map((c) => c.col);
    let col = 0;
    while (used.includes(col)) col++;
    cluster.push({ e, col });
    clusterEnd = Math.max(clusterEnd, e.endMin);
  }
  flush();
  return res;
}

export function nowMinutes(now: Date) {
  const f = (o: Intl.DateTimeFormatOptions) => Number(new Intl.DateTimeFormat("en-GB", { timeZone: browserTz(), hourCycle: "h23", ...o }).format(now));
  return f({ hour: "2-digit" }) * 60 + f({ minute: "2-digit" });
}

/** Hour-grid for one or more days (day view = 1 column, week view = 7). */
const NO_TASKS: Record<string, TaskEntry[]> = {};

type Pick = { date: string; start: number; end: number };
/** An own event being dragged (move) or stretched (resize). `cur` is where it would land if released now. */
type Gesture = { id: number; kind: "move" | "resize"; x0: number; y0: number; moved: boolean; orig: Pick; cur: Pick };
const SAME = (a: Pick, b: Pick) => a.date === b.date && a.start === b.start && a.end === b.end;

/**
 * Tasks (no time of their own) ride in the all-day strip; `badge` shows the "Google" pill there (wide columns only).
 * With `onCreate`, dragging over empty time (or clicking it, for an hour) makes an own event; own events open a small editor,
 * Google events stay read-only links. Own events can also be dragged to another time or day and stretched from their bottom edge (`onMove`).
 */
export default function TimeGrid({ days, events, error, onPickDay, tasks = NO_TASKS, onToggleTask, badge = false, onCreate, onRename, onRemove, onMove }: {
  days: string[]; events: DayEvent[] | null; error?: boolean; onPickDay?: (d: string) => void;
  tasks?: Record<string, TaskEntry[]>; onToggleTask?: (id: number, done: boolean) => void; badge?: boolean;
  onCreate?: (e: NativeEventCreate) => Promise<boolean>; onRename?: (id: number, title: string) => Promise<boolean>; onRemove?: (id: number) => Promise<boolean>;
  onMove?: (id: number, to: { date: string; startMin: number; endMin: number }) => Promise<boolean>;
}) {
  const { t, fmt } = useI18n();
  const [now, setNow] = useState(() => new Date());
  const scroller = useRef<HTMLDivElement>(null);
  const scrolledFor = useRef("");
  const today = todayStr();
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(t); }, []);

  // pressing on empty time starts a selection; the composer opens when the pointer is released
  const [drag, setDrag] = useState<{ date: string; a: number; b: number } | null>(null);
  const [pick, setPick] = useState<Pick | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [gesture, setGesture] = useState<Gesture | null>(null);
  const [shadow, setShadow] = useState<(Pick & { id: number }) | null>(null); // a released move, shown until the refreshed events arrive
  const colsRef = useRef<HTMLDivElement>(null);
  const range = (d: { a: number; b: number }) => selectionRange(d.a, d.b);
  const ghost = gesture?.moved ? gesture.cur : null;
  const live = drag ? { date: drag.date, ...range(drag) } : ghost ?? pick;
  useEffect(() => { setDrag(null); setPick(null); setEditing(null); setGesture(null); }, [days.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setShadow(null); }, [events]); // the refreshed list already has the new place

  const byDay = useMemo(() => {
    const m: Record<string, DayEvent[]> = Object.fromEntries(days.map((d) => [d, []]));
    (events ?? []).forEach((raw) => {
      const e = shadow && nativeIdOf(raw) === shadow.id ? { ...raw, date: shadow.date, startMin: shadow.start, endMin: shadow.end } : raw;
      m[e.date]?.push(e);
    });
    for (const d of days) m[d].sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);
    return m;
  }, [days, events, shadow]);
  const anyAllDay = days.some((d) => byDay[d].some((e) => e.allDay) || (tasks[d]?.length ?? 0) > 0);
  const nowMin = days.includes(today) ? nowMinutes(now) : -1;
  const multi = days.length > 1;
  const cols = { gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` };

  // scroll to now (or the first event) once per set of days; later event changes (a new own event) must not move the view
  useEffect(() => {
    const key = days.join();
    if (!events || !scroller.current || scrolledFor.current === key) return;
    scrolledFor.current = key;
    const first = events.filter((e) => !e.allDay).reduce((m, e) => Math.min(m, e.startMin), 8 * 60);
    scroller.current.scrollTop = Math.max(0, ((nowMin >= 0 ? nowMin : first) / 60) * H - 120);
  }, [events, days.join()]); // eslint-disable-line react-hooks/exhaustive-deps

  const yOf = (ev: React.PointerEvent<HTMLDivElement>) => ev.clientY - ev.currentTarget.getBoundingClientRect().top;
  const startDrag = (ev: React.PointerEvent<HTMLDivElement>, date: string) => {
    if (!onCreate || ev.button !== 0 || (ev.target as HTMLElement).closest(".ev, .composer")) return;
    const cell = cellOfY(yOf(ev), H);
    ev.currentTarget.setPointerCapture(ev.pointerId);
    setPick(null); setEditing(null);
    setDrag({ date, a: cell, b: cell });
  };
  const moveDrag = (ev: React.PointerEvent<HTMLDivElement>, date: string) => {
    if (drag && drag.date === date) setDrag({ ...drag, b: cellOfY(yOf(ev), H) });
  };
  const endDrag = () => {
    if (!drag) return;
    setPick({ date: drag.date, ...range(drag) });
    setDrag(null);
  };
  // moving / stretching an own event: pointer capture keeps the events coming while the pointer leaves the block
  const beginGesture = (ev: React.PointerEvent, id: number, e: DayEvent, kind: Gesture["kind"]) => {
    if (!onMove || ev.button !== 0) return;
    ev.stopPropagation();
    (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
    const at = { date: e.date, start: e.startMin, end: e.endMin };
    setGesture({ id, kind, x0: ev.clientX, y0: ev.clientY, moved: false, orig: at, cur: at });
  };
  const moveGesture = (ev: React.PointerEvent) => {
    if (!gesture) return;
    ev.stopPropagation();
    const dx = ev.clientX - gesture.x0, dy = ev.clientY - gesture.y0;
    if (!gesture.moved && Math.hypot(dx, dy) < 4) return; // a click, not a drag
    const delta = (dy / H) * 60, { orig } = gesture;
    let cur: Pick;
    if (gesture.kind === "resize") cur = { ...orig, end: resizeEnd(orig.start, orig.end, delta) };
    else {
      const rect = colsRef.current?.getBoundingClientRect();
      const date = rect ? days[columnAt(ev.clientX, rect.left, rect.width, days.length)] : orig.date;
      cur = { date, ...moveRange(orig.start, orig.end, delta) };
    }
    setGesture({ ...gesture, moved: true, cur });
  };
  const endGesture = async (ev: React.PointerEvent) => {
    if (!gesture) return;
    ev.stopPropagation();
    const g = gesture;
    setGesture(null);
    if (!g.moved) { setPick(null); setEditing(editing === g.id ? null : g.id); return; } // a plain click opens the editor
    if (SAME(g.cur, g.orig)) return;
    setShadow({ id: g.id, ...g.cur });
    const ok = (await onMove?.(g.id, { date: g.cur.date, startMin: g.cur.start, endMin: g.cur.end })) ?? false;
    if (!ok) setShadow(null);
  };
  const when = (p: Pick) => `${fmt.monthDay(p.date)} ${hhmm(p.start)} - ${hhmm(p.end)}`;
  const side = (i: number) => (days.length > 2 && i >= days.length - 2 ? "right" : "left"); // keep the popover inside the grid

  return (
    <div className="tlbox">
      <div className="tlscroll"><div className={multi ? "tlw multi" : "tlw"}>
        {multi && (
          <div className="tl-head">
            <span className="gut" />
            <div className="cols" style={cols}>
              {days.map((d) => (
                <button key={d} className={d === today ? "today" : ""} onClick={() => onPickDay?.(d)}>
                  <small className={dow(d) === 0 ? "sun" : dow(d) === 6 ? "sat" : ""}>{fmt.weekdayShort(dow(d))}</small>
                  <b>{Number(d.slice(8))}</b>
                </button>
              ))}
            </div>
          </div>
        )}
        {anyAllDay && <AllDayRow days={days} byDay={byDay} tasks={tasks} cols={cols} badge={badge} onToggle={onToggleTask} />}
        {error && <p className="error" style={{ padding: 16 }}>{t("common.loadFail")}</p>}
        <div className="tl" ref={scroller}>
          <div className="tl-in" style={{ height: 24 * H }}>
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="hour" style={{ top: h * H, height: H }}><span>{h === 0 ? "" : t("hour", { h })}</span></div>
            ))}
            <div className="tl-cols" style={cols} ref={colsRef}>
              {days.map((d, i) => (
                <div key={d} className={`tl-col${onCreate ? " creatable" : ""}${drag?.date === d ? " dragging" : ""}`}
                  onPointerDown={(ev) => startDrag(ev, d)} onPointerMove={(ev) => moveDrag(ev, d)} onPointerUp={endDrag}
                  onPointerCancel={() => setDrag(null)}>
                  {layout(byDay[d].filter((e) => !e.allDay)).map(({ e, col, cols: n }) => {
                    const own = onCreate ? nativeIdOf(e) : null;
                    const style = {
                      top: (e.startMin / 60) * H, height: Math.max(((e.endMin - e.startMin) / 60) * H - 2, 22),
                      left: `calc(100% * ${col / n} + 1px)`, width: `calc(100% / ${n} - 3px)`, ["--ev" as string]: e.color,
                    };
                    const title = `${e.title || t("common.untitled")}\n${hhmm(e.startMin)} - ${hhmm(e.endMin)}${e.location ? `\n${e.location}` : ""}\n${e.calendar}`;
                    const body = (
                      <>
                        <b>{e.title || t("common.untitled")}</b>
                        {e.endMin - e.startMin >= 45 && <span>{hhmm(e.startMin)} - {hhmm(e.endMin)}</span>}
                      </>
                    );
                    return own !== null ? (
                      <div key={e.id} className="evwrap">
                        <button type="button" className={`ev native${gesture?.id === own && gesture.moved ? " moving" : ""}`} title={title} style={style}
                          onPointerDown={(ev) => beginGesture(ev, own, e, "move")} onPointerMove={moveGesture} onPointerUp={endGesture} onPointerCancel={() => setGesture(null)}
                          onClick={(ev) => { if (ev.detail === 0) { setPick(null); setEditing(editing === own ? null : own); } }}>
                          {body}
                          {onMove && <span className="ev-resize" aria-hidden="true"
                            onPointerDown={(ev) => beginGesture(ev, own, e, "resize")} onPointerMove={moveGesture} onPointerUp={endGesture} onPointerCancel={() => setGesture(null)} />}
                        </button>
                        {editing === own && (
                          <EventComposer initial={e.title} when={`${fmt.monthDay(e.date)} ${hhmm(e.startMin)} - ${hhmm(e.endMin)}`} align={side(i)} top={(e.startMin / 60) * H}
                            onCancel={() => setEditing(null)}
                            onSave={async (title) => { const ok = (await onRename?.(own, title)) ?? false; if (ok) setEditing(null); return ok; }}
                            onDelete={onRemove ? async () => { const ok = await onRemove(own); if (ok) setEditing(null); return ok; } : undefined} />
                        )}
                      </div>
                    ) : (
                      <a key={e.id} className="ev" href={e.link} target="_blank" rel="noreferrer" title={title} style={style}>{body}</a>
                    );
                  })}
                  {live && live.date === d && (
                    <div className="ev draft" aria-hidden="true" style={{ top: (live.start / 60) * H, height: Math.max(((live.end - live.start) / 60) * H - 2, 22) }}>
                      <span>{hhmm(live.start)} - {hhmm(live.end)}</span>
                    </div>
                  )}
                  {pick && pick.date === d && !drag && (
                    <EventComposer when={when(pick)} align={side(i)} top={(pick.start / 60) * H}
                      onCancel={() => setPick(null)}
                      onSave={async (title) => { const ok = (await onCreate?.({ date: pick.date, startMin: pick.start, endMin: pick.end, title })) ?? false; if (ok) setPick(null); return ok; }} />
                  )}
                  {d === today && nowMin >= 0 && <div className="nowline" style={{ top: (nowMin / 60) * H }} />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div></div>
      {onCreate && <small className="muted tl-hint">{t("ev.hint")}</small>}
    </div>
  );
}
