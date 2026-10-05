import { useMemo, useState } from 'react';
import { toDateKey } from '../lib/date';
import { summarizeByDate } from '../lib/summary';
import { useAppData } from '../store';
import type { DateKey } from '../types';
import { DayView } from './DayView';
import { MonthView } from './MonthView';

export function CalendarPage() {
  const data = useAppData();
  const today = toDateKey(new Date());
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() };
  });
  const [selected, setSelected] = useState<DateKey | null>(() => {
    const day = window.location.hash.slice(1).split('/')[1];
    return day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
  });
  const summary = useMemo(() => summarizeByDate(data), [data]);

  const shift = (delta: number) =>
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  if (selected) return <DayView date={selected} onBack={() => setSelected(null)} />;

  return (
    <MonthView
      year={cursor.year}
      month={cursor.month}
      today={today}
      summary={summary}
      onSelect={setSelected}
      onShift={shift}
    />
  );
}
