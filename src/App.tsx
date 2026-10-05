import { useState } from 'react';
import { Playground } from './components/Playground';
import { CalendarPage } from './pages/CalendarPage';
import { ExpensePage } from './pages/ExpensePage';
import { TodoPage } from './pages/TodoPage';

const TABS = [
  { id: 'calendar', label: '캘린더', icon: '📅' },
  { id: 'todo', label: '할 일', icon: '🌱' },
  { id: 'expense', label: '가계부', icon: '🪙' },
] as const;
type Tab = (typeof TABS)[number]['id'];

export default function App() {
  const [tab, setTab] = useState<Tab>('calendar');
  return (
    <div className="app">
      <nav className="nav">
        <div className="brand">🌼 하루 정원</div>
        {TABS.map((t) => (
          <button
            key={t.id}
            className="nav__item"
            aria-current={tab === t.id ? 'page' : undefined}
            onClick={() => setTab(t.id)}
          >
            <span className="nav__icon">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
      <main className="main">
        {tab === 'calendar' && <CalendarPage />}
        {tab === 'todo' && <TodoPage />}
        {tab === 'expense' && <ExpensePage />}
        <div className="soil" aria-hidden />
      </main>
      <Playground />
    </div>
  );
}
