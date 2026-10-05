import { useState } from 'react';
import { hourRange, parseDateKey } from '../lib/date';
import { formatWon } from '../lib/format';
import { useAppData } from '../store';
import type { DateKey } from '../types';
import { EventForm, type EventDraft } from './EventForm';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const HOURS = Array.from({ length: 24 }, (_, h) => h);

export function DayView({ date, onBack }: { date: DateKey; onBack: () => void }) {
  const { events, expenses, todos } = useAppData();
  const [draft, setDraft] = useState<EventDraft | null>(null);

  const d = parseDateKey(date);
  const dayEvents = events.filter((e) => e.date === date).sort((a, b) => a.start.localeCompare(b.start));
  const spent = expenses.filter((x) => x.date === date).reduce((s, x) => s + x.amount, 0);
  const dayTodos = todos.filter((t) => t.date === date);

  return (
    <>
      <div className="datenav">
        <button className="btn btn--ghost" onClick={onBack}>← 달력</button>
        <h2 className="datenav__label" style={{ margin: 0 }}>
          {d.getMonth() + 1}월 {d.getDate()}일 ({WEEKDAYS[d.getDay()]})
        </h2>
      </div>
      <div className="card muted">
        🌱 할 일 {dayTodos.filter((t) => t.done).length}/{dayTodos.length} · 🪙 {formatWon(spent)}
      </div>
      {draft && <EventForm key={draft.id ?? draft.start} date={date} draft={draft} onClose={() => setDraft(null)} />}
      <div className="card timetable">
        {HOURS.map((h) => {
          const range = hourRange(h);
          const here = dayEvents.filter((e) => Number(e.start.slice(0, 2)) === h);
          return (
            <div key={h} className="timetable__row">
              <div className="timetable__hour">{String(h).padStart(2, '0')}:00</div>
              <div className="timetable__slot">
                {here.map((e) => (
                  <button
                    key={e.id}
                    className="event"
                    onClick={() => setDraft({ id: e.id, title: e.title, start: e.start, end: e.end })}
                  >
                    <strong>{e.title}</strong> <span>{e.start}~{e.end}</span>
                  </button>
                ))}
                <button
                  className="timetable__add"
                  aria-label={`${range.start}에 일정 추가`}
                  onClick={() => setDraft({ title: '', ...range })}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
