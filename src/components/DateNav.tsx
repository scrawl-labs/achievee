import { addDays, parseDateKey, toDateKey } from '../lib/date';
import type { DateKey } from '../types';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function DateNav({ date, onChange }: { date: DateKey; onChange: (d: DateKey) => void }) {
  const d = parseDateKey(date);
  return (
    <div className="datenav">
      <button className="btn btn--ghost" aria-label="전날" onClick={() => onChange(addDays(date, -1))}>
        ◀
      </button>
      <button className="btn btn--ghost datenav__label" onClick={() => onChange(toDateKey(new Date()))}>
        {d.getMonth() + 1}월 {d.getDate()}일 ({WEEKDAYS[d.getDay()]})
      </button>
      <button className="btn btn--ghost" aria-label="다음날" onClick={() => onChange(addDays(date, 1))}>
        ▶
      </button>
    </div>
  );
}
