import { useEffect, useMemo, useRef, useState } from 'react';
import { parseDateKey, timeToMinutes } from '../lib/date';
import {
  clampSpan,
  dragSpan,
  eventsByDate,
  layoutDay,
  minutesToTime,
  moveSpan,
  nowMinutes,
  snapMinutes,
  yToMinutes,
  type Span,
} from '../lib/timegrid';
import { store } from '../store';
import type { CalEvent, DateKey } from '../types';

const PX = 48;
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const HOURS = Array.from({ length: 24 }, (_, h) => h);
const floor30 = (m: number) => Math.floor(m / 30) * 30;

type Drag =
  | { kind: 'create'; date: DateKey; anchor: number; cur: number; moved: boolean }
  | { kind: 'move'; origin: CalEvent; date: DateKey; grab: number; span: Span; moved: boolean }
  | { kind: 'resize'; origin: CalEvent; span: Span; moved: boolean };

interface Props {
  days: DateKey[];
  today: DateKey;
  events: CalEvent[];
  onCreate: (date: DateKey, start: string, end: string) => void;
  onOpen: (event: CalEvent) => void;
  onDayClick: (date: DateKey) => void;
}

const isPointer = (e: { pointerType: string }) => e.pointerType === 'mouse' || e.pointerType === 'pen';

export function TimeGrid({ days, today, events, onCreate, onOpen, onDayClick }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const colRefs = useRef(new Map<DateKey, HTMLElement>());
  const dragRef = useRef<Drag | null>(null);
  const origin = useRef({ x: 0, y: 0 });
  const [drag, setDrag] = useState<Drag | null>(null);
  const [now, setNow] = useState(() => new Date());

  const byDate = useMemo(() => eventsByDate(events), [events]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = Math.max(0, ((nowMinutes() - 60) / 60) * PX);
  }, []);

  const update = (d: Drag | null) => {
    dragRef.current = d;
    setDrag(d);
  };

  const minutesAt = (date: DateKey, clientY: number) => {
    const el = colRefs.current.get(date);
    return el ? yToMinutes(clientY - el.getBoundingClientRect().top, PX) : 0;
  };

  const dateAt = (clientX: number, fallback: DateKey): DateKey => {
    for (const [d, el] of colRefs.current) {
      const r = el.getBoundingClientRect();
      if (clientX >= r.left && clientX < r.right) return d;
    }
    return fallback;
  };

  const moved = (e: PointerEvent, was: boolean) =>
    was || Math.abs(e.clientX - origin.current.x) > 4 || Math.abs(e.clientY - origin.current.y) > 4;

  function track(onMove: (e: PointerEvent) => void, onUp: () => void) {
    const stop = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
    };
    const up = () => {
      stop();
      onUp();
    };
    const cancel = () => {
      stop();
      update(null);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
  }

  function startCreate(e: React.PointerEvent, date: DateKey) {
    if (!isPointer(e) || e.button !== 0) return;
    if ((e.target as HTMLElement).closest('.tg-event')) return;
    const anchor = minutesAt(date, e.clientY);
    origin.current = { x: e.clientX, y: e.clientY };
    update({ kind: 'create', date, anchor, cur: anchor, moved: false });
    track(
      (ev) => {
        const d = dragRef.current;
        if (d?.kind !== 'create') return;
        update({ ...d, cur: minutesAt(d.date, ev.clientY), moved: moved(ev, d.moved) });
      },
      () => {
        const d = dragRef.current;
        update(null);
        if (d?.kind !== 'create') return;
        const span = d.moved ? dragSpan(d.anchor, d.cur) : clampSpan(floor30(d.anchor), floor30(d.anchor) + 60);
        onCreate(d.date, minutesToTime(span.start), minutesToTime(span.end));
      },
    );
  }

  function startMove(e: React.PointerEvent, ev: CalEvent) {
    if (!isPointer(e) || e.button !== 0) return;
    e.stopPropagation();
    const s = timeToMinutes(ev.start);
    const en = timeToMinutes(ev.end);
    origin.current = { x: e.clientX, y: e.clientY };
    update({ kind: 'move', origin: ev, date: ev.date, grab: minutesAt(ev.date, e.clientY) - s, span: { start: s, end: en }, moved: false });
    track(
      (pe) => {
        const d = dragRef.current;
        if (d?.kind !== 'move') return;
        const date = dateAt(pe.clientX, d.date);
        const start = snapMinutes(minutesAt(date, pe.clientY) - d.grab);
        update({ ...d, date, span: moveSpan({ start: s, end: en }, start - s), moved: moved(pe, d.moved) });
      },
      () => {
        const d = dragRef.current;
        update(null);
        if (d?.kind !== 'move') return;
        if (!d.moved) return onOpen(ev);
        store.updateEvent(ev.id, { title: ev.title, date: d.date, start: minutesToTime(d.span.start), end: minutesToTime(d.span.end) });
      },
    );
  }

  function startResize(e: React.PointerEvent, ev: CalEvent) {
    if (!isPointer(e) || e.button !== 0) return;
    e.stopPropagation();
    const s = timeToMinutes(ev.start);
    origin.current = { x: e.clientX, y: e.clientY };
    update({ kind: 'resize', origin: ev, span: { start: s, end: timeToMinutes(ev.end) }, moved: false });
    track(
      (pe) => {
        const d = dragRef.current;
        if (d?.kind !== 'resize') return;
        update({ ...d, span: clampSpan(s, snapMinutes(minutesAt(ev.date, pe.clientY))), moved: moved(pe, d.moved) });
      },
      () => {
        const d = dragRef.current;
        update(null);
        if (d?.kind !== 'resize' || !d.moved) return;
        store.updateEvent(ev.id, { title: ev.title, date: ev.date, start: ev.start, end: minutesToTime(d.span.end) });
      },
    );
  }

  const block = (key: string, span: Span, col: number, cols: number, children: React.ReactNode, extra?: React.HTMLAttributes<HTMLElement> & { ghost?: boolean }) => {
    const { ghost, ...rest } = extra ?? {};
    return (
      <button
        key={key}
        type="button"
        className={`tg-event${ghost ? ' tg-ghost' : ''}`}
        style={{
          top: (span.start / 60) * PX,
          height: Math.max(((span.end - span.start) / 60) * PX, 18),
          left: `${(col / cols) * 100}%`,
          width: `calc(${100 / cols}% - 2px)`,
        }}
        {...rest}
      >
        {children}
      </button>
    );
  };

  const eventBody = (title: string, span: Span) => (
    <>
      <span className="tg-event-title">{title || '(제목 없음)'}</span>
      <span className="tg-event-time">{minutesToTime(span.start)}~{minutesToTime(span.end)}</span>
    </>
  );

  return (
    <div className="tg" ref={scroller} style={{ ['--cols' as string]: days.length }}>
      <div className="tg-head">
        <div />
        {days.map((d) => (
          <button key={d} type="button" className="tg-headcell" data-today={d === today ? '' : undefined} onClick={() => onDayClick(d)}>
            <span>{WEEKDAYS[parseDateKey(d).getDay()]}</span>
            <span className="tg-daynum">{Number(d.slice(8))}</span>
          </button>
        ))}
      </div>
      <div className="tg-body">
        <div className="tg-gutter">
          {HOURS.slice(1).map((h) => (
            <span key={h} className="tg-hour" style={{ top: h * PX }}>
              {h < 12 ? `오전 ${h}시` : `오후 ${h === 12 ? 12 : h - 12}시`}
            </span>
          ))}
        </div>
        {days.map((d) => {
          const dragged = drag && drag.kind !== 'create' ? drag.origin.id : null;
          const placed = layoutDay((byDate[d] ?? []).filter((e) => e.id !== dragged));
          return (
            <div
              key={d}
              className="tg-col"
              ref={(el) => {
                if (el) colRefs.current.set(d, el);
                else colRefs.current.delete(d);
              }}
              onPointerDown={(e) => startCreate(e, d)}
              onClick={(e) => {
                if (isPointer(e.nativeEvent as PointerEvent)) return;
                const m = minutesAt(d, e.clientY);
                const span = clampSpan(floor30(m), floor30(m) + 60);
                onCreate(d, minutesToTime(span.start), minutesToTime(span.end));
              }}
            >
              {placed.map(({ event: ev, col, cols }) =>
                block(
                  ev.id,
                  { start: timeToMinutes(ev.start), end: timeToMinutes(ev.end) },
                  col,
                  cols,
                  <>
                    {eventBody(ev.title, { start: timeToMinutes(ev.start), end: timeToMinutes(ev.end) })}
                    <span className="tg-event-resize" onPointerDown={(e) => startResize(e, ev)} />
                  </>,
                  {
                    onPointerDown: (e) => startMove(e, ev),
                    onClick: (e) => {
                      e.stopPropagation();
                      if (!isPointer(e.nativeEvent as PointerEvent)) onOpen(ev);
                    },
                  },
                ),
              )}
              {drag?.kind === 'create' && drag.date === d &&
                block(
                  'ghost',
                  drag.moved ? dragSpan(drag.anchor, drag.cur) : clampSpan(floor30(drag.anchor), floor30(drag.anchor) + 60),
                  0,
                  1,
                  eventBody('', drag.moved ? dragSpan(drag.anchor, drag.cur) : clampSpan(floor30(drag.anchor), floor30(drag.anchor) + 60)),
                  { ghost: true },
                )}
              {drag?.kind === 'move' && drag.date === d &&
                block('ghost', drag.span, 0, 1, eventBody(drag.origin.title, drag.span), { ghost: true })}
              {drag?.kind === 'resize' && drag.origin.date === d &&
                block('ghost', drag.span, 0, 1, eventBody(drag.origin.title, drag.span), { ghost: true })}
              {d === today && <div className="tg-now" style={{ top: (nowMinutes(now) / 60) * PX }} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
