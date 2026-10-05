import { monthGrid } from '../lib/date';
import { formatShortWon } from '../lib/format';
import type { DaySummary } from '../lib/summary';
import type { DateKey } from '../types';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

interface Props {
  year: number;
  month: number;
  today: DateKey;
  summary: Record<DateKey, DaySummary>;
  onSelect: (d: DateKey) => void;
  onShift: (delta: number) => void;
}

export function MonthView({ year, month, today, summary, onSelect, onShift }: Props) {
  const cells = monthGrid(year, month).flat();
  return (
    <section className="card month">
      <header className="datenav">
        <button className="btn btn--ghost" aria-label="이전 달" onClick={() => onShift(-1)}>◀</button>
        <h2 className="datenav__label" style={{ margin: 0 }}>{year}년 {month + 1}월</h2>
        <button className="btn btn--ghost" aria-label="다음 달" onClick={() => onShift(1)}>▶</button>
      </header>
      <div className="month__grid">
        {WEEKDAYS.map((w) => (
          <div key={w} className="month__weekday">{w}</div>
        ))}
        {cells.map((key, i) => {
          if (!key) return <span key={`empty-${i}`} className="cell cell--empty" />;
          const s = summary[key];
          return (
            <button
              key={key}
              className={`cell${key === today ? ' cell--today' : ''}`}
              onClick={() => onSelect(key)}
              aria-label={key}
            >
              <span className="cell__num">{Number(key.slice(8))}</span>
              {s && s.events > 0 && <span className="chip">📌{s.events}</span>}
              {s && s.spent > 0 && <span className="chip chip--spent">{formatShortWon(s.spent)}</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}
