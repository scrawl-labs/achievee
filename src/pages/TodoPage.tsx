import { useState } from 'react';
import { DateNav } from '../components/DateNav';
import { gardenStage, STAGE_EMOJI } from '../lib/garden';
import { toDateKey } from '../lib/date';
import { store, useAppData } from '../store';

export function TodoPage() {
  const { todos } = useAppData();
  const [date, setDate] = useState(() => toDateKey(new Date()));
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');

  const day = todos.filter((t) => t.date === date);
  const done = day.filter((t) => t.done).length;
  const stage = gardenStage(done, day.length);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      store.addTodo(title, date);
      setTitle('');
      setError('');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <>
      <DateNav date={date} onChange={setDate} />
      <div className="card garden">
        <div className={`garden__plant garden__plant--${stage}`} aria-hidden>
          {STAGE_EMOJI[stage]}
        </div>
        <div className="muted">
          {day.length === 0 ? '오늘의 씨앗을 심어 보아요' : `${done} / ${day.length} 개 완료했어요`}
        </div>
      </div>
      <form className="card" onSubmit={submit}>
        <div className="row">
          <input
            className="input"
            placeholder="할 일을 적어 보아요"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <button className="btn" type="submit">심기</button>
        </div>
        {error && <p className="error">{error}</p>}
      </form>
      <ul className="card list">
        {day.length === 0 && <li className="muted">아직 할 일이 없어요</li>}
        {day.map((t) => (
          <li key={t.id} className="row list__item">
            <input type="checkbox" checked={t.done} onChange={() => store.toggleTodo(t.id)} aria-label={t.title} />
            <span className={t.done ? 'done' : ''} style={{ flex: 1 }}>{t.title}</span>
            <button className="btn btn--ghost" aria-label={`${t.title} 삭제`} onClick={() => store.deleteTodo(t.id)}>✕</button>
          </li>
        ))}
      </ul>
    </>
  );
}
