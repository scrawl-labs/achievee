# 하루 정원 (Daily Garden) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 월간/일간 캘린더, 투두, 가계부를 하나로 합친 귀여운 개인용 반응형 웹앱을 만든다.

**Architecture:** Vite + React + TypeScript SPA. 데이터는 `DataStore`(구독 가능한 단일 저장소 클래스)가 들고 있고, 영속화는 `DataStorage` 인터페이스 뒤로 숨긴다(지금은 localStorage 구현체, 나중에 DB 구현체로 교체). 순수 로직(`lib/`, `store/`)은 Vitest로 TDD하고, 화면은 브라우저에서 직접 확인한다.

**Tech Stack:** Vite, React 18+, TypeScript(strict), Vitest, 순수 CSS(CSS 변수).

**Spec:** `docs/superpowers/specs/2026-10-05-daily-garden-design.md`

## Global Constraints

- 월간 + 일간 뷰만. 주간 뷰, 일정 반복, 알림, 로그인, 수입, 통계 차트는 만들지 않는다.
- 폰과 PC 모두 사용: 폰은 하단 탭, 768px 이상은 좌측 사이드바. 375px 폭에서 가로 스크롤이 생기면 안 된다.
- 저장은 localStorage, 키는 `daily-garden:v1`. 저장 코드는 `src/storage/`에만 둔다.
- 날짜는 `YYYY-MM-DD` 문자열(로컬 시간 기준), 시간은 `HH:mm`.
- 금액은 1원 이상의 정수(원 단위).
- 색은 CSS 변수로 정의하고, 플레이그라운드 패널은 개발 모드(`import.meta.env.DEV`)에서만 보인다.
- ID 생성에 `crypto.randomUUID()`를 쓰지 않는다(폰에서 LAN IP의 http로 접속하면 없음).
- UI 문구는 한국어, 귀여운 말투(~해요).
- 커밋 메시지 끝에 `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` 줄을 붙인다(`git commit -m "제목" -m "Co-Authored-By: ..."`).

## Review Focus

- 월 경계: 윤년 2월, 일요일에 시작하는 달(2026-02), 6주짜리 달(2026-08), 연말/연초 이동 → Task 2 테스트
- 손상된 저장 데이터: JSON이 아님, 배열이 아닌 값, 필드가 빠진 항목 → 앱이 죽지 않고 유효한 항목만 남김 → Task 3 테스트
- localStorage를 못 쓰는 환경(차단, 용량 초과)에서 읽기/쓰기 예외 → 앱이 계속 동작 → Task 3 테스트
- 잘못된 입력: 공백뿐인 제목, 금액 0/음수/소수/NaN → 저장되지 않고 에러 메시지 → Task 4 테스트
- 일정 시간: 겹침은 막고, 딱 맞닿는 일정(10-11, 11-12)은 허용, 23시 칸은 23:59까지 → Task 2, 4 테스트

---

## File Structure

```
package.json, tsconfig.json, vite.config.ts, index.html, .gitignore
src/
  main.tsx                 진입점
  App.tsx                  탭 상태 + 레이아웃
  vite-env.d.ts
  types.ts                 도메인 타입, 지출 분류 상수
  lib/date.ts              날짜/시간 유틸, 시간 검증
  lib/format.ts            금액 표시
  lib/summary.ts           날짜별 집계
  lib/garden.ts            할 일 진행도 → 정원 단계
  storage/storage.ts       DataStorage 인터페이스, emptyData
  storage/localStorage.ts  localStorage 구현체 (손상 복구 포함)
  store/dataStore.ts       DataStore 클래스 (CRUD + 검증 + 구독)
  store/index.ts           싱글턴 store, useAppData 훅
  styles/tokens.css        디자인 토큰(CSS 변수)
  styles/global.css        레이아웃/공통 컴포넌트 스타일
  components/Playground.tsx  색상 조절 패널(DEV 전용)
  components/DateNav.tsx     날짜 이동 바
  pages/TodoPage.tsx
  pages/ExpensePage.tsx
  pages/CalendarPage.tsx     월간 ↔ 일간 전환
  pages/MonthView.tsx
  pages/DayView.tsx
  pages/EventForm.tsx
tests: 각 lib/storage/store 파일 옆에 *.test.ts
```

---

### Task 1: 프로젝트 스캐폴딩

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`, `src/main.tsx`, `src/App.tsx`, `src/vite-env.d.ts`

**Interfaces:**
- Produces: `npm run dev|build|test` 스크립트, 빈 `App` 컴포넌트

- [ ] **Step 1: 설정 파일 작성**

`package.json`
```json
{
  "name": "daily-garden",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite --host",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  }
}
```

`tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "types": ["vite/client"]
  },
  "include": ["src", "vite.config.ts"]
}
```

`vite.config.ts`
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: { environment: 'node' },
});
```

`.gitignore`
```
node_modules
dist
```

`index.html`
```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>하루 정원</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link href="https://fonts.googleapis.com/css2?family=Jua&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/vite-env.d.ts`
```ts
/// <reference types="vite/client" />
```

`src/main.tsx`
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

`src/App.tsx`
```tsx
export default function App() {
  return <h1>하루 정원</h1>;
}
```

- [ ] **Step 2: 의존성 설치**

Run:
```bash
npm install react react-dom
npm install -D vite @vitejs/plugin-react typescript vitest @types/react @types/react-dom
```
Expected: 설치 성공, `package-lock.json` 생성

- [ ] **Step 3: 빌드와 테스트 러너 확인**

Run: `npm run build && npx vitest run --passWithNoTests`
Expected: 빌드 성공(`dist/` 생성), vitest가 "No test files found"로 통과

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TS + Vitest" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 타입과 날짜/시간/금액 유틸

**Files:**
- Create: `src/types.ts`, `src/lib/date.ts`, `src/lib/format.ts`
- Test: `src/lib/date.test.ts`, `src/lib/format.test.ts`

**Interfaces:**
- Produces (`types.ts`):
  ```ts
  export type DateKey = string; // 'YYYY-MM-DD'
  export interface CalEvent { id: string; title: string; date: DateKey; start: string; end: string }
  export interface Todo { id: string; title: string; done: boolean; date: DateKey }
  export interface Expense { id: string; amount: number; category: string; memo: string; date: DateKey }
  export interface AppData { events: CalEvent[]; todos: Todo[]; expenses: Expense[] }
  export const EXPENSE_CATEGORIES: readonly ['식비','카페','교통','쇼핑','생활','기타']
  ```
- Produces (`date.ts`): `toDateKey(d: Date): DateKey`, `parseDateKey(k: DateKey): Date`, `addDays(k: DateKey, n: number): DateKey`, `monthGrid(year: number, month: number): (DateKey | null)[][]` (month는 0부터, 일요일 시작), `timeToMinutes(t: string): number`, `validateEventTimes(start: string, end: string): string | null`, `overlaps(a: {start:string;end:string}, b: {start:string;end:string}): boolean`, `hourRange(h: number): {start: string; end: string}`
- Produces (`format.ts`): `formatWon(n: number): string`, `formatShortWon(n: number): string`

- [ ] **Step 1: 타입 파일 작성**

`src/types.ts`
```ts
export type DateKey = string; // 'YYYY-MM-DD'

export interface CalEvent {
  id: string;
  title: string;
  date: DateKey;
  start: string; // 'HH:mm'
  end: string; // 'HH:mm'
}

export interface Todo {
  id: string;
  title: string;
  done: boolean;
  date: DateKey;
}

export interface Expense {
  id: string;
  amount: number;
  category: string;
  memo: string;
  date: DateKey;
}

export interface AppData {
  events: CalEvent[];
  todos: Todo[];
  expenses: Expense[];
}

export const EXPENSE_CATEGORIES = ['식비', '카페', '교통', '쇼핑', '생활', '기타'] as const;
```

- [ ] **Step 2: 실패하는 테스트 작성**

`src/lib/date.test.ts`
```ts
import { describe, expect, it } from 'vitest';
import {
  addDays,
  hourRange,
  monthGrid,
  overlaps,
  parseDateKey,
  timeToMinutes,
  toDateKey,
  validateEventTimes,
} from './date';

describe('toDateKey / parseDateKey', () => {
  it('로컬 날짜를 YYYY-MM-DD로 바꾸고 되돌린다', () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toDateKey(parseDateKey('2026-12-31'))).toBe('2026-12-31');
  });
});

describe('addDays', () => {
  it('월/연 경계와 윤년을 넘는다', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });
});

describe('monthGrid', () => {
  it('윤년 2월(2024)은 목요일 시작, 5주', () => {
    const g = monthGrid(2024, 1);
    expect(g).toHaveLength(5);
    expect(g[0]).toEqual([null, null, null, null, '2024-02-01', '2024-02-02', '2024-02-03']);
    expect(g.flat().filter(Boolean).pop()).toBe('2024-02-29');
  });
  it('일요일에 시작하고 28일인 2026-02는 정확히 4주, 빈칸 없음', () => {
    const g = monthGrid(2026, 1);
    expect(g).toHaveLength(4);
    expect(g.flat().every((c) => c !== null)).toBe(true);
  });
  it('토요일에 시작하는 2026-08은 6주', () => {
    const g = monthGrid(2026, 7);
    expect(g).toHaveLength(6);
    expect(g[0][6]).toBe('2026-08-01');
  });
  it('모든 주는 7칸이다', () => {
    for (let m = 0; m < 12; m++) {
      expect(monthGrid(2026, m).every((w) => w.length === 7)).toBe(true);
    }
  });
});

describe('validateEventTimes', () => {
  it('정상 범위는 null', () => {
    expect(validateEventTimes('09:00', '10:30')).toBeNull();
  });
  it('끝이 시작과 같거나 빠르면 에러', () => {
    expect(validateEventTimes('10:00', '10:00')).toMatch(/늦어야/);
    expect(validateEventTimes('11:00', '10:00')).toMatch(/늦어야/);
  });
  it('형식이 틀리거나 비어 있으면 에러', () => {
    expect(validateEventTimes('', '10:00')).toMatch(/입력/);
    expect(validateEventTimes('9:00', '10:00')).toMatch(/입력/);
    expect(validateEventTimes('09:00', '24:00')).toMatch(/입력/);
  });
});

describe('overlaps', () => {
  it('겹치면 true', () => {
    expect(overlaps({ start: '10:00', end: '11:00' }, { start: '10:30', end: '12:00' })).toBe(true);
  });
  it('딱 맞닿으면 false', () => {
    expect(overlaps({ start: '10:00', end: '11:00' }, { start: '11:00', end: '12:00' })).toBe(false);
  });
});

describe('timeToMinutes / hourRange', () => {
  it('분으로 변환한다', () => {
    expect(timeToMinutes('01:30')).toBe(90);
  });
  it('23시 칸은 23:59에서 끝난다', () => {
    expect(hourRange(9)).toEqual({ start: '09:00', end: '10:00' });
    expect(hourRange(23)).toEqual({ start: '23:00', end: '23:59' });
  });
});
```

`src/lib/format.test.ts`
```ts
import { describe, expect, it } from 'vitest';
import { formatShortWon, formatWon } from './format';

describe('formatWon', () => {
  it('천 단위 쉼표와 원', () => {
    expect(formatWon(1234)).toBe('1,234원');
  });
});

describe('formatShortWon', () => {
  it('만 원 미만은 쉼표, 이상은 만 단위', () => {
    expect(formatShortWon(5000)).toBe('5,000');
    expect(formatShortWon(10000)).toBe('1만');
    expect(formatShortWon(12000)).toBe('1.2만');
    expect(formatShortWon(123456)).toBe('12.3만');
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `npx vitest run src/lib`
Expected: FAIL (모듈 `./date`, `./format`을 찾을 수 없음)

- [ ] **Step 4: 구현**

`src/lib/date.ts`
```ts
import type { DateKey } from '../types';

const pad = (n: number) => String(n).padStart(2, '0');

export function toDateKey(d: Date): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDateKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: DateKey, n: number): DateKey {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + n);
  return toDateKey(d);
}

/** month는 0부터. 일요일 시작, 7칸씩 끊은 주 배열. 달 밖의 칸은 null. */
export function monthGrid(year: number, month: number): (DateKey | null)[][] {
  const lead = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (DateKey | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= days; d++) cells.push(toDateKey(new Date(year, month, d)));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (DateKey | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function validateEventTimes(start: string, end: string): string | null {
  if (!TIME_RE.test(start) || !TIME_RE.test(end)) return '시작과 끝 시간을 입력해 주세요';
  if (timeToMinutes(end) <= timeToMinutes(start)) return '끝나는 시간이 시작보다 늦어야 해요';
  return null;
}

interface Span {
  start: string;
  end: string;
}

export function overlaps(a: Span, b: Span): boolean {
  return timeToMinutes(a.start) < timeToMinutes(b.end) && timeToMinutes(b.start) < timeToMinutes(a.end);
}

export function hourRange(h: number): Span {
  return { start: `${pad(h)}:00`, end: h === 23 ? '23:59' : `${pad(h + 1)}:00` };
}
```

`src/lib/format.ts`
```ts
export function formatWon(n: number): string {
  return `${n.toLocaleString('ko-KR')}원`;
}

/** 월간 칸처럼 좁은 곳용. 1만 원 이상은 '1.2만'. */
export function formatShortWon(n: number): string {
  if (n < 10000) return n.toLocaleString('ko-KR');
  return `${Math.round(n / 1000) / 10}만`;
}
```

- [ ] **Step 5: 통과 확인**

Run: `npx vitest run src/lib`
Expected: PASS (전부)

- [ ] **Step 6: Commit**

```bash
git add src
git commit -m "feat: add domain types and date/time/format utils" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: 저장소 인터페이스와 localStorage 구현

**Files:**
- Create: `src/storage/storage.ts`, `src/storage/localStorage.ts`
- Test: `src/storage/localStorage.test.ts`

**Interfaces:**
- Consumes: `AppData`, `CalEvent`, `Todo`, `Expense` from `../types`
- Produces:
  ```ts
  export interface DataStorage { load(): AppData; save(data: AppData): void }
  export function emptyData(): AppData
  export interface StorageBackend { getItem(k: string): string | null; setItem(k: string, v: string): void }
  export function createLocalStorage(getBackend?: () => StorageBackend): DataStorage
  ```

- [ ] **Step 1: 인터페이스 작성**

`src/storage/storage.ts`
```ts
import type { AppData } from '../types';

export interface DataStorage {
  load(): AppData;
  save(data: AppData): void;
}

export function emptyData(): AppData {
  return { events: [], todos: [], expenses: [] };
}
```

- [ ] **Step 2: 실패하는 테스트 작성**

`src/storage/localStorage.test.ts`
```ts
import { describe, expect, it } from 'vitest';
import { createLocalStorage, type StorageBackend } from './localStorage';
import { emptyData } from './storage';

function fakeBackend(initial: Record<string, string> = {}): StorageBackend & { map: Record<string, string> } {
  const map = { ...initial };
  return {
    map,
    getItem: (k) => (k in map ? map[k] : null),
    setItem: (k, v) => {
      map[k] = v;
    },
  };
}

const KEY = 'daily-garden:v1';

describe('createLocalStorage', () => {
  it('저장한 데이터를 그대로 불러온다', () => {
    const backend = fakeBackend();
    const s = createLocalStorage(() => backend);
    const data = {
      events: [{ id: 'e1', title: '치과', date: '2026-10-05', start: '10:00', end: '11:00' }],
      todos: [{ id: 't1', title: '빨래', done: true, date: '2026-10-05' }],
      expenses: [{ id: 'x1', amount: 4500, category: '카페', memo: '라떼', date: '2026-10-05' }],
    };
    s.save(data);
    expect(s.load()).toEqual(data);
  });

  it('아무것도 없으면 빈 데이터', () => {
    expect(createLocalStorage(() => fakeBackend()).load()).toEqual(emptyData());
  });

  it('JSON이 아닌 값이면 빈 데이터', () => {
    const s = createLocalStorage(() => fakeBackend({ [KEY]: '{깨짐' }));
    expect(s.load()).toEqual(emptyData());
  });

  it('최상위가 객체가 아니거나 배열 필드가 아니면 빈 목록', () => {
    expect(createLocalStorage(() => fakeBackend({ [KEY]: '42' })).load()).toEqual(emptyData());
    expect(createLocalStorage(() => fakeBackend({ [KEY]: 'null' })).load()).toEqual(emptyData());
    expect(
      createLocalStorage(() => fakeBackend({ [KEY]: JSON.stringify({ events: 'x', todos: {}, expenses: 1 }) })).load(),
    ).toEqual(emptyData());
  });

  it('필드가 빠진 항목은 버리고 유효한 항목만 남긴다', () => {
    const raw = JSON.stringify({
      events: [{ id: 'e1', title: '정상', date: '2026-10-05', start: '10:00', end: '11:00' }, { id: 'e2' }],
      todos: [{ id: 't1', title: '할 일', done: 'yes', date: '2026-10-05' }],
      expenses: [{ id: 'x1', amount: 'abc', category: '식비', memo: '', date: '2026-10-05' }],
    });
    const data = createLocalStorage(() => fakeBackend({ [KEY]: raw })).load();
    expect(data.events.map((e) => e.id)).toEqual(['e1']);
    expect(data.todos).toEqual([]);
    expect(data.expenses).toEqual([]);
  });

  it('저장소 접근이 예외를 던져도 load/save가 죽지 않는다', () => {
    const throwing = () => {
      throw new Error('blocked');
    };
    const s = createLocalStorage(throwing);
    expect(s.load()).toEqual(emptyData());
    expect(() => s.save(emptyData())).not.toThrow();
  });

  it('setItem이 용량 초과로 던져도 save가 죽지 않는다', () => {
    const backend: StorageBackend = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    expect(() => createLocalStorage(() => backend).save(emptyData())).not.toThrow();
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `npx vitest run src/storage`
Expected: FAIL (`./localStorage` 없음)

- [ ] **Step 4: 구현**

`src/storage/localStorage.ts`
```ts
import type { AppData, CalEvent, Expense, Todo } from '../types';
import { emptyData, type DataStorage } from './storage';

export interface StorageBackend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const KEY = 'daily-garden:v1';

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isStr = (v: unknown): v is string => typeof v === 'string';

const isEvent = (v: unknown): v is CalEvent =>
  isObj(v) && isStr(v.id) && isStr(v.title) && isStr(v.date) && isStr(v.start) && isStr(v.end);
const isTodo = (v: unknown): v is Todo =>
  isObj(v) && isStr(v.id) && isStr(v.title) && typeof v.done === 'boolean' && isStr(v.date);
const isExpense = (v: unknown): v is Expense =>
  isObj(v) &&
  isStr(v.id) &&
  typeof v.amount === 'number' &&
  Number.isFinite(v.amount) &&
  isStr(v.category) &&
  isStr(v.memo) &&
  isStr(v.date);

function list<T>(v: unknown, guard: (x: unknown) => x is T): T[] {
  return Array.isArray(v) ? v.filter(guard) : [];
}

function sanitize(raw: unknown): AppData {
  if (!isObj(raw)) return emptyData();
  return {
    events: list(raw.events, isEvent),
    todos: list(raw.todos, isTodo),
    expenses: list(raw.expenses, isExpense),
  };
}

export function createLocalStorage(getBackend: () => StorageBackend = () => window.localStorage): DataStorage {
  return {
    load() {
      try {
        const raw = getBackend().getItem(KEY);
        return raw ? sanitize(JSON.parse(raw)) : emptyData();
      } catch {
        return emptyData();
      }
    },
    save(data) {
      try {
        getBackend().setItem(KEY, JSON.stringify(data));
      } catch {
        // 저장소를 못 쓰는 환경: 이번 세션 메모리에서만 동작한다.
      }
    },
  };
}
```

- [ ] **Step 5: 통과 확인**

Run: `npx vitest run src/storage`
Expected: PASS (7개)

- [ ] **Step 6: Commit**

```bash
git add src
git commit -m "feat: add DataStorage interface and resilient localStorage impl" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: DataStore (CRUD + 검증 + 구독)

**Files:**
- Create: `src/store/dataStore.ts`, `src/store/index.ts`
- Test: `src/store/dataStore.test.ts`

**Interfaces:**
- Consumes: `DataStorage`, `emptyData` (`../storage/storage`); `createLocalStorage` (`../storage/localStorage`); `validateEventTimes`, `overlaps` (`../lib/date`); 타입들
- Produces:
  ```ts
  export class DataStore {
    constructor(storage: DataStorage)
    getSnapshot: () => AppData
    subscribe: (listener: () => void) => () => void
    addEvent(input: Omit<CalEvent,'id'>): CalEvent        // 검증 실패 시 Error(message)
    updateEvent(id: string, input: Omit<CalEvent,'id'>): void
    deleteEvent(id: string): void
    addTodo(title: string, date: DateKey): Todo
    toggleTodo(id: string): void
    deleteTodo(id: string): void
    addExpense(input: Omit<Expense,'id'>): Expense
    deleteExpense(id: string): void
  }
  export const store: DataStore               // index.ts 싱글턴
  export function useAppData(): AppData       // index.ts 훅
  ```

- [ ] **Step 1: 실패하는 테스트 작성**

`src/store/dataStore.test.ts`
```ts
import { describe, expect, it, vi } from 'vitest';
import { emptyData, type DataStorage } from '../storage/storage';
import type { AppData } from '../types';
import { DataStore } from './dataStore';

function memStorage(initial: AppData = emptyData()): DataStorage & { saved: AppData } {
  const s = {
    saved: initial,
    load: () => s.saved,
    save: (d: AppData) => {
      s.saved = d;
    },
  };
  return s;
}

const ev = (over: Partial<{ title: string; date: string; start: string; end: string }> = {}) => ({
  title: '회의',
  date: '2026-10-05',
  start: '10:00',
  end: '11:00',
  ...over,
});

describe('일정', () => {
  it('추가하면 id가 붙고 저장된다', () => {
    const storage = memStorage();
    const store = new DataStore(storage);
    const e = store.addEvent(ev());
    expect(e.id).toBeTruthy();
    expect(store.getSnapshot().events).toHaveLength(1);
    expect(storage.saved.events).toHaveLength(1);
  });

  it('제목은 trim되고 공백뿐이면 거부한다', () => {
    const store = new DataStore(memStorage());
    expect(store.addEvent(ev({ title: '  치과  ' })).title).toBe('치과');
    expect(() => store.addEvent(ev({ title: '   ', start: '12:00', end: '13:00' }))).toThrow('제목');
  });

  it('끝 시간이 시작보다 빠르면 거부한다', () => {
    const store = new DataStore(memStorage());
    expect(() => store.addEvent(ev({ start: '11:00', end: '10:00' }))).toThrow('늦어야');
    expect(store.getSnapshot().events).toHaveLength(0);
  });

  it('같은 날 시간이 겹치면 거부하고, 맞닿거나 다른 날이면 허용한다', () => {
    const store = new DataStore(memStorage());
    store.addEvent(ev());
    expect(() => store.addEvent(ev({ start: '10:30', end: '12:00' }))).toThrow('겹쳐요');
    expect(() => store.addEvent(ev({ start: '11:00', end: '12:00' }))).not.toThrow();
    expect(() => store.addEvent(ev({ date: '2026-10-06' }))).not.toThrow();
  });

  it('수정할 때 자기 자신과는 겹침으로 보지 않는다', () => {
    const store = new DataStore(memStorage());
    const e = store.addEvent(ev());
    expect(() => store.updateEvent(e.id, ev({ start: '10:15', end: '10:45' }))).not.toThrow();
    expect(store.getSnapshot().events[0].start).toBe('10:15');
  });

  it('삭제', () => {
    const store = new DataStore(memStorage());
    const e = store.addEvent(ev());
    store.deleteEvent(e.id);
    expect(store.getSnapshot().events).toEqual([]);
  });
});

describe('할 일', () => {
  it('추가/토글/삭제', () => {
    const store = new DataStore(memStorage());
    const t = store.addTodo(' 빨래 ', '2026-10-05');
    expect(t.title).toBe('빨래');
    expect(t.done).toBe(false);
    store.toggleTodo(t.id);
    expect(store.getSnapshot().todos[0].done).toBe(true);
    store.toggleTodo(t.id);
    expect(store.getSnapshot().todos[0].done).toBe(false);
    store.deleteTodo(t.id);
    expect(store.getSnapshot().todos).toEqual([]);
  });

  it('공백뿐인 제목은 거부한다', () => {
    const store = new DataStore(memStorage());
    expect(() => store.addTodo('   ', '2026-10-05')).toThrow('제목');
  });
});

describe('지출', () => {
  const ex = (amount: number) => ({ amount, category: '식비', memo: '', date: '2026-10-05' });

  it('정상 금액은 저장된다', () => {
    const store = new DataStore(memStorage());
    store.addExpense(ex(4500));
    expect(store.getSnapshot().expenses[0].amount).toBe(4500);
  });

  it('0, 음수, 소수, NaN, Infinity는 거부한다', () => {
    const store = new DataStore(memStorage());
    for (const bad of [0, -100, 10.5, NaN, Infinity]) {
      expect(() => store.addExpense(ex(bad))).toThrow('금액');
    }
    expect(store.getSnapshot().expenses).toEqual([]);
  });

  it('삭제', () => {
    const store = new DataStore(memStorage());
    const x = store.addExpense(ex(1000));
    store.deleteExpense(x.id);
    expect(store.getSnapshot().expenses).toEqual([]);
  });
});

describe('구독', () => {
  it('변경 때마다 리스너를 부르고, 해제하면 부르지 않는다', () => {
    const store = new DataStore(memStorage());
    const fn = vi.fn();
    const off = store.subscribe(fn);
    store.addTodo('a', '2026-10-05');
    expect(fn).toHaveBeenCalledTimes(1);
    off();
    store.addTodo('b', '2026-10-05');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('변경될 때마다 새 스냅샷 객체를 준다(React 갱신용)', () => {
    const store = new DataStore(memStorage());
    const before = store.getSnapshot();
    store.addTodo('a', '2026-10-05');
    expect(store.getSnapshot()).not.toBe(before);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/store`
Expected: FAIL (`./dataStore` 없음)

- [ ] **Step 3: 구현**

`src/store/dataStore.ts`
```ts
import { overlaps, validateEventTimes } from '../lib/date';
import type { DataStorage } from '../storage/storage';
import type { AppData, CalEvent, DateKey, Expense, Todo } from '../types';

const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

type EventInput = Omit<CalEvent, 'id'>;

export class DataStore {
  private data: AppData;
  private listeners = new Set<() => void>();

  constructor(private storage: DataStorage) {
    this.data = storage.load();
  }

  getSnapshot = (): AppData => this.data;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private commit(next: AppData) {
    this.data = next;
    this.storage.save(next);
    this.listeners.forEach((l) => l());
  }

  private checkEvent(input: EventInput, ignoreId?: string): EventInput {
    const title = input.title.trim();
    if (!title) throw new Error('제목을 입력해 주세요');
    const timeError = validateEventTimes(input.start, input.end);
    if (timeError) throw new Error(timeError);
    const clash = this.data.events.find((o) => o.id !== ignoreId && o.date === input.date && overlaps(o, input));
    if (clash) throw new Error(`"${clash.title}" 일정과 시간이 겹쳐요`);
    return { ...input, title };
  }

  addEvent(input: EventInput): CalEvent {
    const event: CalEvent = { ...this.checkEvent(input), id: newId() };
    this.commit({ ...this.data, events: [...this.data.events, event] });
    return event;
  }

  updateEvent(id: string, input: EventInput): void {
    const checked = this.checkEvent(input, id);
    this.commit({
      ...this.data,
      events: this.data.events.map((e) => (e.id === id ? { ...checked, id } : e)),
    });
  }

  deleteEvent(id: string): void {
    this.commit({ ...this.data, events: this.data.events.filter((e) => e.id !== id) });
  }

  addTodo(title: string, date: DateKey): Todo {
    const trimmed = title.trim();
    if (!trimmed) throw new Error('제목을 입력해 주세요');
    const todo: Todo = { id: newId(), title: trimmed, done: false, date };
    this.commit({ ...this.data, todos: [...this.data.todos, todo] });
    return todo;
  }

  toggleTodo(id: string): void {
    this.commit({
      ...this.data,
      todos: this.data.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    });
  }

  deleteTodo(id: string): void {
    this.commit({ ...this.data, todos: this.data.todos.filter((t) => t.id !== id) });
  }

  addExpense(input: Omit<Expense, 'id'>): Expense {
    if (!Number.isInteger(input.amount) || input.amount <= 0) {
      throw new Error('금액은 1원 이상 정수로 입력해 주세요');
    }
    const expense: Expense = { ...input, memo: input.memo.trim(), id: newId() };
    this.commit({ ...this.data, expenses: [...this.data.expenses, expense] });
    return expense;
  }

  deleteExpense(id: string): void {
    this.commit({ ...this.data, expenses: this.data.expenses.filter((x) => x.id !== id) });
  }
}
```

`src/store/index.ts`
```ts
import { useSyncExternalStore } from 'react';
import { createLocalStorage } from '../storage/localStorage';
import type { AppData } from '../types';
import { DataStore } from './dataStore';

export const store = new DataStore(createLocalStorage());

export function useAppData(): AppData {
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/store`
Expected: PASS (전부)

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "feat: add DataStore with validation and subscriptions" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: 날짜별 집계와 정원 단계

**Files:**
- Create: `src/lib/summary.ts`, `src/lib/garden.ts`
- Test: `src/lib/summary.test.ts`, `src/lib/garden.test.ts`

**Interfaces:**
- Consumes: `AppData`, `DateKey`
- Produces:
  ```ts
  export interface DaySummary { events: number; spent: number }
  export function summarizeByDate(data: AppData): Record<DateKey, DaySummary>
  export type GardenStage = 'empty' | 'seed' | 'sprout' | 'bloom'
  export function gardenStage(done: number, total: number): GardenStage
  export const STAGE_EMOJI: Record<GardenStage, string>
  ```

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/summary.test.ts`
```ts
import { describe, expect, it } from 'vitest';
import { emptyData } from '../storage/storage';
import { summarizeByDate } from './summary';

describe('summarizeByDate', () => {
  it('빈 데이터는 빈 객체', () => {
    expect(summarizeByDate(emptyData())).toEqual({});
  });

  it('날짜별 일정 수와 지출 합계를 센다', () => {
    const data = {
      events: [
        { id: '1', title: 'a', date: '2026-10-05', start: '09:00', end: '10:00' },
        { id: '2', title: 'b', date: '2026-10-05', start: '11:00', end: '12:00' },
        { id: '3', title: 'c', date: '2026-10-06', start: '09:00', end: '10:00' },
      ],
      todos: [],
      expenses: [
        { id: 'x', amount: 1000, category: '식비', memo: '', date: '2026-10-05' },
        { id: 'y', amount: 2500, category: '카페', memo: '', date: '2026-10-05' },
        { id: 'z', amount: 700, category: '교통', memo: '', date: '2026-10-07' },
      ],
    };
    expect(summarizeByDate(data)).toEqual({
      '2026-10-05': { events: 2, spent: 3500 },
      '2026-10-06': { events: 1, spent: 0 },
      '2026-10-07': { events: 0, spent: 700 },
    });
  });
});
```

`src/lib/garden.test.ts`
```ts
import { describe, expect, it } from 'vitest';
import { gardenStage } from './garden';

describe('gardenStage', () => {
  it('할 일이 없으면 empty', () => expect(gardenStage(0, 0)).toBe('empty'));
  it('하나도 못 했으면 seed', () => expect(gardenStage(0, 3)).toBe('seed'));
  it('일부 완료면 sprout', () => expect(gardenStage(1, 3)).toBe('sprout'));
  it('전부 완료면 bloom', () => expect(gardenStage(3, 3)).toBe('bloom'));
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/lib/summary.test.ts src/lib/garden.test.ts`
Expected: FAIL (모듈 없음)

- [ ] **Step 3: 구현**

`src/lib/summary.ts`
```ts
import type { AppData, DateKey } from '../types';

export interface DaySummary {
  events: number;
  spent: number;
}

export function summarizeByDate(data: AppData): Record<DateKey, DaySummary> {
  const out: Record<DateKey, DaySummary> = {};
  const at = (d: DateKey) => (out[d] ??= { events: 0, spent: 0 });
  for (const e of data.events) at(e.date).events += 1;
  for (const x of data.expenses) at(x.date).spent += x.amount;
  return out;
}
```

`src/lib/garden.ts`
```ts
export type GardenStage = 'empty' | 'seed' | 'sprout' | 'bloom';

export function gardenStage(done: number, total: number): GardenStage {
  if (total === 0) return 'empty';
  if (done === 0) return 'seed';
  if (done < total) return 'sprout';
  return 'bloom';
}

export const STAGE_EMOJI: Record<GardenStage, string> = {
  empty: '🪴',
  seed: '🌰',
  sprout: '🌱',
  bloom: '🌸',
};
```

- [ ] **Step 4: 통과 확인**

Run: `npm test`
Expected: PASS (지금까지 모든 테스트)

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "feat: add per-date summary and garden stage helpers" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: 디자인 토큰, 레이아웃, 내비게이션, 플레이그라운드

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/global.css`, `src/components/Playground.tsx`, `src/components/DateNav.tsx`
- Modify: `src/App.tsx`, `src/main.tsx` (css import)
- Create (임시 스텁, 이후 Task에서 교체): `src/pages/TodoPage.tsx`, `src/pages/ExpensePage.tsx`, `src/pages/CalendarPage.tsx`

**Interfaces:**
- Consumes: `toDateKey`, `addDays`, `parseDateKey` (`../lib/date`)
- Produces: `DateNav` — `{ date: DateKey; onChange: (d: DateKey) => void }`; CSS 클래스 `.card`, `.btn`, `.btn--ghost`, `.input`, `.error`, `.row`; 페이지 컴포넌트 export 이름 `TodoPage`, `ExpensePage`, `CalendarPage`(인자 없음)

- [ ] **Step 1: 디자인 토큰**

`src/styles/tokens.css`
```css
:root {
  --sky: #bfe6ff;
  --sky-deep: #8fd0f5;
  --cloud: #ffffff;
  --grass: #8ad66b;
  --grass-deep: #4fa94a;
  --soil: #8b5e3c;
  --accent: #ff8fab;
  --ink: #2c3a2f;
  --ink-soft: #5b6b5e;
  --card: rgba(255, 255, 255, 0.88);
  --radius: 20px;
  --shadow: 0 6px 0 rgba(44, 58, 47, 0.12);
  --font: 'Jua', 'Pretendard', system-ui, -apple-system, sans-serif;
}
```

- [ ] **Step 2: 전역 스타일**

`src/styles/global.css`
```css
* { box-sizing: border-box; }
html, body, #root { min-height: 100%; }
body {
  margin: 0;
  font-family: var(--font);
  color: var(--ink);
  background: linear-gradient(var(--sky) 0%, var(--sky-deep) 100%) fixed;
  overflow-x: hidden;
}
button, input, select { font: inherit; color: inherit; }
button { cursor: pointer; }

/* 레이아웃: 폰은 하단 탭, 768px 이상은 좌측 사이드바 */
.app { min-height: 100vh; display: flex; flex-direction: column; }
.main { flex: 1; width: 100%; max-width: 760px; margin: 0 auto; padding: 16px 16px 120px; }
.nav {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 10;
  display: flex; justify-content: space-around;
  padding: 8px 8px calc(8px + env(safe-area-inset-bottom));
  background: var(--card); border-top: 4px solid var(--grass);
}
.nav__item {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 6px; border: 0; border-radius: 14px; background: transparent; font-size: 0.85rem;
}
.nav__item[aria-current='page'] { background: var(--grass); }
.nav__icon { font-size: 1.4rem; }
.brand { display: none; }
.soil {
  height: 56px; margin: 24px -16px -120px;
  background: var(--soil); border-top: 10px solid var(--grass-deep);
  border-radius: 28px 28px 0 0;
}

@media (min-width: 768px) {
  .app { flex-direction: row; }
  .nav {
    position: sticky; top: 0; height: 100vh; width: 200px; flex-direction: column;
    justify-content: flex-start; gap: 8px; padding: 24px 12px;
    border-top: 0; border-right: 4px solid var(--grass);
  }
  .nav__item { flex: 0; flex-direction: row; gap: 10px; padding: 12px 14px; font-size: 1rem; }
  .brand { display: block; font-size: 1.4rem; margin-bottom: 16px; }
  .main { padding-bottom: 40px; }
  .soil { margin-bottom: 0; }
}

/* 공통 컴포넌트 */
.card {
  background: var(--card); border-radius: var(--radius);
  box-shadow: var(--shadow); padding: 16px; margin-bottom: 16px;
}
.row { display: flex; align-items: center; gap: 8px; }
.btn {
  border: 0; border-radius: 999px; padding: 10px 18px;
  background: var(--accent); box-shadow: 0 3px 0 rgba(44, 58, 47, 0.18);
}
.btn:active { transform: translateY(2px); box-shadow: 0 1px 0 rgba(44, 58, 47, 0.18); }
.btn--ghost { background: transparent; box-shadow: none; border: 2px solid var(--ink-soft); }
.input {
  width: 100%; min-width: 0; padding: 10px 12px; border-radius: 14px;
  border: 2px solid var(--sky-deep); background: #fff;
}
.error { color: #c0392b; margin: 8px 0 0; }
.muted { color: var(--ink-soft); }
.title { margin: 0 0 12px; font-size: 1.3rem; }

/* 날짜 이동 */
.datenav { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px; }
.datenav__label { font-size: 1.15rem; text-align: center; flex: 1; }

/* 플레이그라운드 */
.playground { position: fixed; right: 12px; top: 12px; z-index: 20; }
.playground__panel { background: #fff; border-radius: 16px; padding: 12px; margin-top: 8px; box-shadow: var(--shadow); }
.playground__panel label { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin: 6px 0; }
```

- [ ] **Step 3: DateNav**

`src/components/DateNav.tsx`
```tsx
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
```

- [ ] **Step 4: 플레이그라운드 (DEV 전용)**

`src/components/Playground.tsx`
```tsx
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
```

- [ ] **Step 5: 페이지 스텁과 App**

`src/pages/TodoPage.tsx`
```tsx
export function TodoPage() {
  return <div className="card">할 일 (준비 중)</div>;
}
```

`src/pages/ExpensePage.tsx`
```tsx
export function ExpensePage() {
  return <div className="card">가계부 (준비 중)</div>;
}
```

`src/pages/CalendarPage.tsx`
```tsx
export function CalendarPage() {
  return <div className="card">캘린더 (준비 중)</div>;
}
```

`src/App.tsx`
```tsx
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
```

`src/main.tsx` 맨 위 import 아래에 추가:
```tsx
import './styles/tokens.css';
import './styles/global.css';
```

- [ ] **Step 6: 브라우저에서 확인**

Run: `npm run dev` 후 브라우저로 열기
Expected: 하늘색 배경, 폭 375px에서는 하단 탭 3개, 1280px에서는 좌측 사이드바. 탭을 누르면 스텁 카드가 바뀜. 🎨 버튼으로 색을 바꾸면 즉시 반영되고 새로고침 후에도 유지됨. 가로 스크롤 없음.

- [ ] **Step 7: 타입 검사 후 Commit**

Run: `npm run build`
Expected: 성공

```bash
git add -A
git commit -m "feat: add design tokens, responsive layout, nav and dev playground" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: 할 일 페이지 (정원 새싹)

**Files:**
- Modify: `src/pages/TodoPage.tsx` (스텁 교체)
- Modify: `src/styles/global.css` (끝에 추가)

**Interfaces:**
- Consumes: `store`, `useAppData` (`../store`); `DateNav`; `toDateKey`; `gardenStage`, `STAGE_EMOJI` (`../lib/garden`)

- [ ] **Step 1: 페이지 구현**

`src/pages/TodoPage.tsx`
```tsx
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
```

- [ ] **Step 2: 스타일 추가**

`src/styles/global.css` 끝에 추가:
```css
.garden { text-align: center; }
.garden__plant { font-size: 3.5rem; transition: transform 0.3s; }
.garden__plant--sprout { transform: scale(1.15); }
.garden__plant--bloom { animation: bounce 0.8s ease 1; transform: scale(1.3); }
@keyframes bounce { 50% { transform: scale(1.5) rotate(-6deg); } }
.list { list-style: none; margin: 0 0 16px; }
.list__item { padding: 8px 0; border-bottom: 2px dashed var(--sky); }
.list__item:last-child { border-bottom: 0; }
.list input[type='checkbox'] { width: 22px; height: 22px; accent-color: var(--grass-deep); }
.done { text-decoration: line-through; color: var(--ink-soft); }
```

- [ ] **Step 3: 브라우저에서 확인**

Run: `npm run dev`
Expected: 할 일을 추가하면 🌰, 하나 체크하면 🌱, 전부 체크하면 🌸. 공백만 입력하면 "제목을 입력해 주세요". 새로고침해도 유지. 날짜를 넘기면 그 날 목록만 보임.

- [ ] **Step 4: Commit**

```bash
npm run build
git add -A
git commit -m "feat: add todo page with growing garden plant" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: 가계부 페이지

**Files:**
- Modify: `src/pages/ExpensePage.tsx` (스텁 교체)

**Interfaces:**
- Consumes: `store`, `useAppData`; `DateNav`; `toDateKey`; `formatWon`; `EXPENSE_CATEGORIES`

- [ ] **Step 1: 페이지 구현**

`src/pages/ExpensePage.tsx`
```tsx
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
```

- [ ] **Step 2: 브라우저에서 확인**

Run: `npm run dev`
Expected: 4500 + 카페 기록 → 목록과 합계 "4,500원". `0`, `-5`, `1.5`, `abc`, 빈 값은 "금액은 1원 이상 정수로 입력해 주세요". 375px에서 폼이 넘치지 않음.

- [ ] **Step 3: Commit**

```bash
npm run build
git add -A
git commit -m "feat: add expense page" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 9: 캘린더 월간 뷰

**Files:**
- Create: `src/pages/MonthView.tsx`
- Modify: `src/pages/CalendarPage.tsx` (스텁 교체), `src/styles/global.css` (끝에 추가)
- Temporary: `CalendarPage`는 이 Task에서 선택된 날짜를 `DayView` 자리표시자 카드로 보여주고, Task 10에서 실제 `DayView`로 교체한다.

**Interfaces:**
- Consumes: `monthGrid`, `toDateKey`; `summarizeByDate`, `DaySummary`; `formatShortWon`; `useAppData`
- Produces: `MonthView` — `{ year: number; month: number; today: DateKey; summary: Record<DateKey, DaySummary>; onSelect: (d: DateKey) => void; onShift: (delta: number) => void }`

- [ ] **Step 1: MonthView**

`src/pages/MonthView.tsx`
```tsx
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
```

- [ ] **Step 2: CalendarPage**

`src/pages/CalendarPage.tsx`
```tsx
import { useMemo, useState } from 'react';
import { toDateKey } from '../lib/date';
import { summarizeByDate } from '../lib/summary';
import { useAppData } from '../store';
import type { DateKey } from '../types';
import { MonthView } from './MonthView';

export function CalendarPage() {
  const data = useAppData();
  const today = toDateKey(new Date());
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() };
  });
  const [selected, setSelected] = useState<DateKey | null>(null);
  const summary = useMemo(() => summarizeByDate(data), [data]);

  const shift = (delta: number) =>
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  if (selected) {
    return (
      <div className="card">
        <button className="btn btn--ghost" onClick={() => setSelected(null)}>← 달력</button>
        <p>{selected} (일간 뷰 준비 중)</p>
      </div>
    );
  }

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
```

- [ ] **Step 3: 스타일 추가**

`src/styles/global.css` 끝에 추가:
```css
.month__grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px; }
.month__weekday { text-align: center; color: var(--ink-soft); padding: 4px 0; }
.cell {
  min-height: 64px; padding: 4px 2px; border: 2px solid transparent; border-radius: 14px;
  background: #fff; display: flex; flex-direction: column; align-items: center; gap: 2px; overflow: hidden;
}
.cell--empty { background: transparent; }
.cell--today { border-color: var(--accent); background: #fff3f7; }
.cell__num { font-size: 0.95rem; }
.chip { font-size: 0.65rem; background: var(--sky); border-radius: 999px; padding: 0 6px; white-space: nowrap; }
.chip--spent { background: #ffe9a8; }
@media (min-width: 768px) { .cell { min-height: 88px; } .chip { font-size: 0.75rem; } }
```

- [ ] **Step 4: 브라우저에서 확인**

Run: `npm run dev`
Expected: 이번 달 격자, 오늘 칸 강조, ◀▶로 달 이동(12월→1월 연도 변경 포함), 2026-08은 6줄, 2026-02는 4줄. 할 일 페이지에서 가계부에 쓴 금액이 해당 날짜 칸에 `4,500`처럼 표시됨. 375px에서 가로 스크롤 없음. 날짜를 누르면 자리표시자가 보이고 "← 달력"으로 돌아옴.

- [ ] **Step 5: Commit**

```bash
npm run build
git add -A
git commit -m "feat: add calendar month view with event/spend chips" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 10: 일간 뷰와 일정 폼

**Files:**
- Create: `src/pages/DayView.tsx`, `src/pages/EventForm.tsx`
- Modify: `src/pages/CalendarPage.tsx` (자리표시자를 `DayView`로 교체), `src/styles/global.css` (끝에 추가)

**Interfaces:**
- Consumes: `store`, `useAppData`; `hourRange`, `parseDateKey` (`../lib/date`); `formatWon`; `CalEvent`
- Produces:
  ```ts
  export interface EventDraft { id?: string; title: string; start: string; end: string }
  EventForm props: { date: DateKey; draft: EventDraft; onClose: () => void }
  DayView props:   { date: DateKey; onBack: () => void }
  ```

- [ ] **Step 1: EventForm**

`src/pages/EventForm.tsx`
```tsx
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
```

- [ ] **Step 2: DayView**

`src/pages/DayView.tsx`
```tsx
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
      {draft && <EventForm key={draft.id ?? `${draft.start}`} date={date} draft={draft} onClose={() => setDraft(null)} />}
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
```

- [ ] **Step 3: CalendarPage에 연결**

`src/pages/CalendarPage.tsx`에서 `if (selected) { ... }` 블록 전체를 아래로 교체하고 `import { DayView } from './DayView';`를 추가:
```tsx
  if (selected) return <DayView date={selected} onBack={() => setSelected(null)} />;
```

- [ ] **Step 4: 스타일 추가**

`src/styles/global.css` 끝에 추가:
```css
.timetable { padding: 8px 12px; }
.timetable__row { display: flex; gap: 10px; min-height: 44px; border-bottom: 2px dashed var(--sky); padding: 4px 0; }
.timetable__row:last-child { border-bottom: 0; }
.timetable__hour { width: 48px; flex: none; color: var(--ink-soft); padding-top: 8px; font-size: 0.85rem; }
.timetable__slot { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.timetable__add {
  align-self: flex-start; border: 2px dashed var(--grass); border-radius: 12px;
  background: transparent; color: var(--grass-deep); padding: 0 12px; min-height: 32px;
}
.event {
  text-align: left; border: 0; border-radius: 12px; padding: 8px 12px;
  background: var(--grass); box-shadow: 0 3px 0 rgba(44, 58, 47, 0.15);
}
.event span { font-size: 0.8rem; color: var(--ink-soft); }
.eventform { border: 3px solid var(--accent); }
```

- [ ] **Step 5: 브라우저에서 확인**

Run: `npm run dev`
Expected:
- 월간에서 날짜 선택 → 0~23시 시간표. 빈 시간대의 `+`를 누르면 해당 시각으로 채워진 폼이 열림.
- 제목 없이 저장 → "제목을 입력해 주세요". 끝 ≤ 시작 → "끝나는 시간이 시작보다 늦어야 해요".
- 10:00~11:00 일정 후 10:30~12:00 → "겹쳐요". 11:00~12:00은 저장됨.
- 23시 칸의 `+`는 23:00~23:59로 채워짐.
- 일정 클릭 → 수정/삭제 가능. 새로고침해도 유지.
- "← 달력"으로 돌아오면 해당 날짜 칸에 `📌n`이 보임.
- 375px, 1280px 모두 가로 스크롤 없음.

- [ ] **Step 6: 전체 테스트와 빌드 후 Commit**

Run: `npm test && npm run build`
Expected: 전부 PASS, 빌드 성공

```bash
git add -A
git commit -m "feat: add day timetable view and event form" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 11: 마무리 점검

**Files:**
- Create: `README.md`

- [ ] **Step 1: README 작성**

`README.md`
```markdown
# 하루 정원

나만 쓰는 일정 + 할 일 + 가계부 앱.

## 실행
    npm install
    npm run dev      # 같은 와이파이의 폰에서는 터미널에 나온 Network 주소로 접속
    npm test
    npm run build

## 데이터
브라우저 localStorage(`daily-garden:v1`)에 저장돼요. 브라우저/기기마다 따로 저장되고, 나중에 DB로 옮길 때는 `src/storage/`에 `DataStorage` 구현체를 추가해서 `src/store/index.ts`에서 교체하면 돼요.
```

- [ ] **Step 2: 최종 검증**

Run: `npm test && npm run build && npm run preview`
Expected: 테스트 전부 통과, 빌드 성공. 프리뷰 주소에서 🎨 플레이그라운드 버튼이 **보이지 않음**(프로덕션 빌드). 위 Task 7~10의 "브라우저에서 확인" 항목을 프리뷰에서 한 번씩 다시 훑는다.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "docs: add README" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```
