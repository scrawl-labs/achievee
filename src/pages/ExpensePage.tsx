import { useState } from 'react';
import { DateNav } from '../components/DateNav';
import { toDateKey } from '../lib/date';
import { formatWon } from '../lib/format';
import { store, useAppData } from '../store';
import { EXPENSE_CATEGORIES } from '../types';

export function ExpensePage() {
  const { expenses } = useAppData();
  const [date, setDate] = useState(() => toDateKey(new Date()));
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [memo, setMemo] = useState('');
  const [error, setError] = useState('');

  const day = expenses.filter((x) => x.date === date);
  const total = day.reduce((sum, x) => sum + x.amount, 0);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      store.addExpense({ amount: Number(amount), category, memo, date });
      setAmount('');
      setMemo('');
      setError('');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <>
      <DateNav date={date} onChange={setDate} />
      <div className="card" style={{ textAlign: 'center' }}>
        <div className="muted">이 날 쓴 돈</div>
        <div className="title">🪙 {formatWon(total)}</div>
      </div>
      <form className="card" onSubmit={submit}>
        <div className="row">
          <input
            className="input"
            inputMode="numeric"
            placeholder="금액"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <input className="input" placeholder="메모 (선택)" value={memo} onChange={(e) => setMemo(e.target.value)} />
          <button className="btn" type="submit">기록</button>
        </div>
        {error && <p className="error">{error}</p>}
      </form>
      <ul className="card list">
        {day.length === 0 && <li className="muted">쓴 돈이 없어요</li>}
        {day.map((x) => (
          <li key={x.id} className="row list__item">
            <span>{x.category}</span>
            <span className="muted" style={{ flex: 1 }}>{x.memo}</span>
            <strong>{formatWon(x.amount)}</strong>
            <button className="btn btn--ghost" aria-label="삭제" onClick={() => store.deleteExpense(x.id)}>✕</button>
          </li>
        ))}
      </ul>
    </>
  );
}
