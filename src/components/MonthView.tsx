import { useMemo } from 'react';
import { monthGrid, parseDateKey } from '../lib/date';
import { eventsByDate } from '../lib/timegrid';
import type { CalEvent, DateKey } from '../types';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const MAX_VISIBLE = 3;

interface Props {
  date: DateKey;
  today: DateKey;
  events: CalEvent[];
  onSelectDay: (date: DateKey) => void;
  onOpen: (event: CalEvent) => void;
}

export function MonthView({ date, today, events, onSelectDay, onOpen }: Props) {
  const d = parseDateKey(date);
  const weeks = useMemo(() => monthGrid(d.getFullYear(), d.getMonth()), [d.getFullYear(), d.getMonth()]);
  const byDate = useMemo(() => eventsByDate(events), [events]);

  return (
    <div className="mv" style={{ ['--rows' as string]: weeks.length }}>
      <div className="mv-head">
        {WEEKDAYS.map((w) => (
          <div key={w} className="mv-weekday">{w}</div>
        ))}
      </div>
      <div className="mv-body">
        {weeks.flat().map((key, i) => {
          if (!key) return <div key={`empty-${i}`} className="mv-cell" />;
          const list = byDate[key] ?? [];
          const hidden = list.length - MAX_VISIBLE;
          return (
            <div key={key} className="mv-cell">
              <button type="button" className="mv-num" data-today={key === today ? '' : undefined} aria-label={key} onClick={() => onSelectDay(key)}>
                {Number(key.slice(8))}
              </button>
              {list.slice(0, MAX_VISIBLE).map((e) => (
                <button key={e.id} type="button" className="mv-event" onClick={() => onOpen(e)}>
                  {e.start} {e.title}
                </button>
              ))}
              {hidden > 0 && (
                <button type="button" className="mv-more" onClick={() => onSelectDay(key)}>
                  +{hidden}개
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
