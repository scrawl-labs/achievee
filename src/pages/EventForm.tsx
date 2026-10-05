import { useState } from 'react';
import { store } from '../store';
import type { DateKey } from '../types';

export interface EventDraft {
  id?: string;
  title: string;
  start: string;
  end: string;
}

export function EventForm({ date, draft, onClose }: { date: DateKey; draft: EventDraft; onClose: () => void }) {
  const [title, setTitle] = useState(draft.title);
  const [start, setStart] = useState(draft.start);
  const [end, setEnd] = useState(draft.end);
  const [error, setError] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const input = { title, date, start, end };
      if (draft.id) store.updateEvent(draft.id, input);
      else store.addEvent(input);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <form className="card eventform" onSubmit={submit}>
      <input className="input" autoFocus placeholder="무슨 일정이에요?" value={title} onChange={(e) => setTitle(e.target.value)} />
      <div className="row" style={{ marginTop: 8 }}>
        <input className="input" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
        <span>~</span>
        <input className="input" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
      </div>
      {error && <p className="error">{error}</p>}
      <div className="row" style={{ marginTop: 12, justifyContent: 'flex-end' }}>
        {draft.id && (
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              store.deleteEvent(draft.id!);
              onClose();
            }}
          >
            삭제
          </button>
        )}
        <button type="button" className="btn btn--ghost" onClick={onClose}>취소</button>
        <button type="submit" className="btn">저장</button>
      </div>
    </form>
  );
}
