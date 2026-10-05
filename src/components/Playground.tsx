import { useEffect, useState } from 'react';

const VARS = [
  ['--sky', '하늘'],
  ['--grass', '잔디'],
  ['--soil', '흙'],
  ['--accent', '포인트'],
] as const;
const KEY = 'daily-garden:theme';

function loadSaved(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}');
  } catch {
    return {};
  }
}

function PlaygroundPanel() {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(() => {
    const saved = loadSaved();
    const style = getComputedStyle(document.documentElement);
    return Object.fromEntries(VARS.map(([v]) => [v, saved[v] ?? style.getPropertyValue(v).trim()]));
  });

  useEffect(() => {
    for (const [v, val] of Object.entries(values)) document.documentElement.style.setProperty(v, val);
    try {
      localStorage.setItem(KEY, JSON.stringify(values));
    } catch {
      /* 무시 */
    }
  }, [values]);

  return (
    <div className="playground">
      <button className="btn" onClick={() => setOpen((o) => !o)}>🎨</button>
      {open && (
        <div className="playground__panel">
          {VARS.map(([v, label]) => (
            <label key={v}>
              {label}
              <input type="color" value={values[v]} onChange={(e) => setValues({ ...values, [v]: e.target.value })} />
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export function Playground() {
  return import.meta.env.DEV ? <PlaygroundPanel /> : null;
}
