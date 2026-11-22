"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Mark } from "./Logo";
import Wordmark from "./Wordmark";
import Icon, { type IconName } from "./Icon";
import CategoryGlyph from "./CategoryGlyph";
import { CATEGORIES } from "@/lib/i18n";
import { DOC_PAGES, type DocPage } from "@/lib/designDocs";
import "./design.css";

/**
 * /design: the design system as docs, laid out like a component library site: groups on the left, the page in the
 * middle (title, one line, then sections each with a live Preview and its Code), the page's outline on the right.
 * Everything is drawn with the system's own tokens, scoped to .ds, so the app's styles are untouched.
 */

type Theme = "light" | "dark";
let shownTheme: Theme | null = null; // the theme on screen, kept across page changes
type Block = { id: string; title: string; level?: 2 | 3; desc?: string; demo?: React.ReactNode; code?: string; body?: React.ReactNode; align?: "center" | "start" };
const GROUPS = ["시작하기", "파운데이션", "컴포넌트"] as const;

/* ---------- small building blocks drawn in the system's style ---------- */

function Flower({ level, n }: { level: number; n?: number }) {
  const petals = [0, 60, 120, 180, 240, 300].map((a) => [22 + 11 * Math.sin((a * Math.PI) / 180), 22 - 11 * Math.cos((a * Math.PI) / 180)]);
  return (
    <svg className={`ds-flower l${level}`} viewBox="0 0 44 44" aria-hidden="true">
      <g className="b">{petals.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="7.5" />)}<circle cx="22" cy="22" r="11" /></g>
      {n !== undefined && <text x="22" y="22" textAnchor="middle" dominantBaseline="central">{n}</text>}
    </svg>
  );
}

function Preview({ demo, code, align = "center" }: { demo: React.ReactNode; code?: string; align?: "center" | "start" }) {
  const [tab, setTab] = useState<"preview" | "code">("preview");
  const [copied, setCopied] = useState(false);
  return (
    <div className="dd-preview">
      <div className="dd-ptabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "preview"} className={tab === "preview" ? "on" : ""} onClick={() => setTab("preview")}>Preview</button>
        {code && <button type="button" role="tab" aria-selected={tab === "code"} className={tab === "code" ? "on" : ""} onClick={() => setTab("code")}>Code</button>}
        {tab === "code" && code && (
          <button type="button" className="dd-copy" onClick={() => { void navigator.clipboard?.writeText(code).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1200); }, () => undefined); }}>{copied ? "복사됨" : "복사"}</button>
        )}
      </div>
      {tab === "preview" ? <div className={`dd-canvas ${align}`}>{demo}</div> : <pre className="dd-code"><code>{code}</code></pre>}
    </div>
  );
}

function Rows({ rows }: { rows: [React.ReactNode, React.ReactNode][] }) {
  return <div className="dd-rows">{rows.map(([k, v], i) => <div key={i}><span>{k}</span><div>{v}</div></div>)}</div>;
}

function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="dd-table-wrap">
      <table className="dd-table"><thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody></table>
    </div>
  );
}

/** A rule as code: the pattern to avoid next to the one to use. */
const CodeRule = ({ bad, good }: { bad: string; good: string }) => (
  <div className="dd-coderule">
    <div className="bad"><b>지양</b><pre><code>{bad}</code></pre></div>
    <div className="good"><b>권장</b><pre><code>{good}</code></pre></div>
  </div>
);
const Pill = ({ children }: { children: React.ReactNode }) => <span className="dd-pill">{children}</span>;
const DoDont = ({ dos, donts }: { dos: string[]; donts: string[] }) => (
  <div className="dd-dodont">
    <div className="do"><b>권장</b><ul>{dos.map((d) => <li key={d}>{d}</li>)}</ul></div>
    <div className="dont"><b>지양</b><ul>{donts.map((d) => <li key={d}>{d}</li>)}</ul></div>
  </div>
);

function Cover() {
  // the system's cover: its colours as blocks, the logo's flower cut out of the pink slab, the name in the wordmark face
  const petals = [0, 60, 120, 180, 240, 300].map((a) => [640 + 30 * Math.sin((a * Math.PI) / 180), 144 - 30 * Math.cos((a * Math.PI) / 180)]);
  return (
    <div className="dd-cover" aria-hidden="true">
      <svg viewBox="540 0 420 288" preserveAspectRatio="xMinYMid slice">
        <rect className="c-petal" x="560" y="-24" width="160" height="336" rx="18" />
        {petals.map(([x, y], i) => <circle key={i} className="c-cut" cx={x} cy={y} r="23" />)}<circle className="c-cut" cx="640" cy="144" r="30" />
        <rect className="c-accent" x="736" y="40" width="144" height="136" rx="18" />
        <rect className="c-ink" x="896" y="-18" width="80" height="138" rx="18" />
        <rect className="c-butter" x="736" y="192" width="144" height="48" rx="24" />
        <circle className="c-mint" cx="912" cy="216" r="40" />
      </svg>
      <div className="dd-cover-name"><b>Achievee</b><span>할 일, 일정, 지출, 감정 기록 앱의 디자인 시스템.</span></div>
    </div>
  );
}

/* ---------- live demos ---------- */

function ChipDemo() {
  const [words, setWords] = useState(["뿌듯하다", "홀가분하다"]);
  return (
    <div className="ds-chips">
      {words.map((w) => <button key={w} type="button" className="ds-chip on" onClick={() => setWords(words.filter((x) => x !== w))}>{w} <span aria-hidden="true">×</span></button>)}
      {words.length < 3 && <button type="button" className="ds-chip add" onClick={() => setWords([...words, ["설렌다", "고맙다", "편안하다"].find((x) => !words.includes(x))!])}>＋ 단어</button>}
    </div>
  );
}
function FilterDemo() {
  const [f, setF] = useState("전체");
  return <div className="ds-chips">{["전체", "불필요만", "식비", "카페", "교통"].map((x) => <button key={x} type="button" className={`ds-chip${f === x ? " on" : ""}`} onClick={() => setF(x)}>{x}</button>)}</div>;
}
function PaperDemo({ empty }: { empty?: boolean }) {
  const [body, setBody] = useState(empty ? "" : "오늘은 회사에서 발표가 있었는데 생각보다 잘 끝났다. 저녁엔 친구랑 떡볶이.");
  return (
    <div className="ds-card dd-w">
      <label className="ds-lbl" htmlFor={empty ? "dd-p2" : "dd-p1"}>일기</label>
      <textarea id={empty ? "dd-p2" : "dd-p1"} className="ds-paper" value={body} onChange={(e) => setBody(e.target.value)} placeholder="오늘 하루는 어땠어?" />
      <div className="ds-foot"><small>{[...body].length}자</small>{body && <small className="saved">저장됨</small>}</div>
    </div>
  );
}
function TabsDemo() {
  const [t, setT] = useState("일기");
  return <div className="ds-tabs" role="tablist">{["일기", "주간 회고", "내 감정", "감정 사전"].map((x) => <button key={x} type="button" role="tab" aria-selected={t === x} className={t === x ? "on" : ""} onClick={() => setT(x)}>{x}</button>)}</div>;
}
function DialogDemo() {
  const [open, setOpen] = useState(false);
  const [gone, setGone] = useState(false);
  return (
    <div className="dd-w">
      <div className="ds-day"><span>11월 22일 (일)</span><span>−₩12,000</span></div>
      <div className="ds-list">
        {gone ? <div className="ds-lrow"><span className="t"><small>삭제됨</small></span><button type="button" className="ds-btn ghost sm" onClick={() => setGone(false)}>되돌리기</button></div> : (
          <div className="ds-lrow"><CategoryGlyph c="food" /><span className="t"><b>점심</b><small>식비 <em>불필요</em></small></span><b className="n">₩12,000</b>
            <button type="button" className="ds-x" aria-label="삭제" onClick={() => setOpen(true)}><Icon name="close" size={16} /></button></div>
        )}
      </div>
      {open && (
        <div className="ds-dim" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="ds-dialog" role="alertdialog" aria-modal="true" aria-labelledby="dd-cf" onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}>
            <h3 id="dd-cf">이 기록을 지울까요?</h3>
            <p>11월 22일 · 점심 · ₩12,000</p>
            <small>지우면 되돌릴 수 없어요.</small>
            <div className="acts"><button type="button" className="ds-btn" autoFocus onClick={() => setOpen(false)}>취소</button><button type="button" className="ds-btn danger" onClick={() => { setGone(true); setOpen(false); }}>삭제</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
const StaticDialog = () => (
  <div className="ds-dialog"><h3>이 기록을 지울까요?</h3><p>11월 22일 · 점심 · ₩12,000</p><small>지우면 되돌릴 수 없어요.</small><div className="acts"><button type="button" className="ds-btn">취소</button><button type="button" className="ds-btn danger">삭제</button></div></div>
);

/* ---------- data ---------- */

const COLORS: { group: string; id: string; items: { name: string; light: string; dark: string; use: string }[] }[] = [
  { group: "바탕과 면", id: "surfaces", items: [
    { name: "bg", light: "#f6f5f2", dark: "#0f0f0e", use: "페이지 바탕" },
    { name: "surface", light: "#ffffff", dark: "#191918", use: "카드, 패널, 대화상자" },
    { name: "surface-sunk", light: "#f0efeb", dark: "#242422", use: "칩, 타일, 눌린 버튼" },
    { name: "line", light: "#e7e5e0", dark: "#2e2d2a", use: "카드 안 구분선" },
  ] },
  { group: "글자", id: "ink", items: [
    { name: "ink", light: "#1a1917", dark: "#efeee9", use: "본문, 숫자 · 17:1" },
    { name: "ink-2", light: "#5c5a55", dark: "#a8a6a0", use: "분류, 요일, 보조 설명 · 6.9:1" },
    { name: "ink-3", light: "#6b6861", dark: "#8d8a83", use: "개수, 시간, 안내 · 4.8:1" },
  ] },
  { group: "행동과 상태", id: "action", items: [
    { name: "accent", light: "#4a5bf0", dark: "#8b96ff", use: "주요 버튼, 선택, 링크" },
    { name: "accent-soft", light: "#eceefe", dark: "#262a52", use: "고른 칩, 고른 날" },
    { name: "good", light: "#1a7d48", dark: "#5fd394", use: "필요, 저장됨, 수입" },
    { name: "danger", light: "#c9353b", dark: "#ff7b7f", use: "불필요, 삭제, 오류" },
  ] },
];
const PETALS = [
  { name: "petal", hex: "#fb78a2", use: "로고, 다 끝낸 날" }, { name: "petal-peach", hex: "#ffb199", use: "식비, 조금 한 날" },
  { name: "petal-butter", hex: "#ffd980", use: "카페, 반쯤 한 날" }, { name: "petal-mint", hex: "#9be3b4", use: "교통, 목표 달성" },
  { name: "petal-lilac", hex: "#c3a6ff", use: "문화, 멜로의 감정" }, { name: "petal-sky", hex: "#8fb8ff", use: "고정비, 비 오는 날" },
];
const TYPE = [
  { name: "display-1", spec: "둥근미소 · 36 / 40", cls: "t-d1", sample: "11월 22일" },
  { name: "display-2", spec: "둥근미소 · 28 / 34", cls: "t-d2", sample: "₩83,550" },
  { name: "title", spec: "Pretendard · 20 / 28 · 700", cls: "t-title", sample: "2026년 11월" },
  { name: "writing", spec: "Pretendard · 17 / 30", cls: "t-writing", sample: "오늘은 발표가 생각보다 잘 끝났다." },
  { name: "body", spec: "Pretendard · 15 / 22", cls: "t-body", sample: "은행 서류 제출" },
  { name: "label", spec: "Pretendard · 13 / 18 · 600", cls: "t-label", sample: "오늘 마음은" },
  { name: "caption", spec: "Pretendard · 12 / 16 · 500", cls: "t-caption", sample: "38자 · 저장됨" },
];
const NAV_ICONS: IconName[] = ["home", "chart", "book", "wallet", "activity", "calendar", "plug", "user", "search", "plus", "edit", "check", "close", "left", "right", "more"];
const CAT_NAME: Record<string, string> = { food: "식비", cafe: "카페", transport: "교통", shopping: "쇼핑", culture: "문화", fixed: "고정비", other: "기타" };

/** Each component's card picture on the overview grid. */
const THUMB: Record<string, React.ReactNode> = {
  button: <div className="ds-row-wrap"><button type="button" className="ds-btn primary sm">저장</button><button type="button" className="ds-btn sm">단어 고르기</button><button type="button" className="ds-btn ghost sm">취소</button></div>,
  chip: <div className="ds-chips"><span className="ds-chip on">뿌듯하다</span><span className="ds-chip">카페</span><span className="ds-chip add">＋ 단어</span></div>,
  paper: <div className="dd-thumb-paper"><span>오늘은 발표가 잘 끝났다.</span><i /><i /></div>,
  field: <div className="dd-thumb-field"><small>금액</small><span>12,000</span></div>,
  surface: <div className="dd-thumb-surface"><b>11월 22일</b><i /><i /></div>,
  "list-row": <div className="ds-list dd-thumb-list"><div className="ds-lrow"><CategoryGlyph c="cafe" /><span className="t"><b>아메리카노</b><small>카페</small></span><b className="n">₩4,500</b></div></div>,
  "day-flower": <div className="ds-flowers dd-thumb-flowers">{[0, 1, 2, 3, 4].map((l) => <Flower key={l} level={l} n={l} />)}</div>,
  tabs: <div className="ds-tabs"><button type="button" className="on">일기</button><button type="button">주간 회고</button><button type="button">내 감정</button></div>,
  dialog: <div className="dd-thumb-dialog"><b>이 기록을 지울까요?</b><span><i /><i className="d" /></span></div>,
};

function pageBlocks(slug: string, theme: Theme): Block[] {
  switch (slug) {
    case "intro": return [
      { id: "what", title: "개요", body: <><p>Achievee는 할 일, 일정, 지출, 운동, 감정 기록을 한곳에서 관리하는 앱. 이 문서는 Achievee 화면에 쓰이는 디자인 토큰, 컴포넌트, UI 문구 기준을 정리함.</p><p>새 화면을 만들거나 기존 화면을 고칠 때 이 문서의 토큰과 컴포넌트를 사용함.</p></> },
      { id: "why", title: "배경", body: <p>기존 화면은 카드 안에 회색 입력 영역과 테두리 입력칸이 중첩되어 있어 정보 구조에 비해 시각적 요소가 많았음. 이 시스템은 컨테이너 중첩을 줄이고, 긴 글 입력 영역을 단순화하고, 브랜드 로고의 색상을 보조 팔레트로 정리하는 데 초점을 둠.</p> },
      { id: "look", title: "예시", desc: "일기 화면에 시스템을 적용한 예시.", demo: (
        <div className="dd-hero-demo">
          <div className="ds-card dd-w">
            <div className="ds-date"><b>11월 22일</b><span>일요일</span></div>
            <p className="ds-lbl">오늘 마음은</p>
            <div className="ds-chips"><span className="ds-chip on">뿌듯하다</span><span className="ds-chip on">홀가분하다</span><span className="ds-chip add">＋ 단어</span></div>
            <p className="dd-paper-static">오늘은 회사에서 발표가 있었는데 생각보다 잘 끝났다.</p>
            <div className="ds-foot"><small>27자</small><small className="saved">저장됨</small></div>
          </div>
          <img className="dd-hero-mallow" src="/mallow/mallow.webp" alt="" />
        </div>
      ) },
      { id: "start", title: "문서 구성", body: <Rows rows={[
        [<Link key="p" href="/design/principles">원칙</Link>, "화면 설계의 기본 규칙"],
        [<Link key="c" href="/design/color">색</Link>, "색상 토큰과 대비 기준"],
        [<Link key="k" href="/design/components">전체 컴포넌트</Link>, "컴포넌트별 예시, 코드, 속성"],
        [<Link key="v" href="/design/ux-writing">UX writing</Link>, "버튼, 안내, 오류 문구 기준"],
      ]} /> },
    ];
    case "principles": return [
      { id: "intro", title: "적용 방법", body: <p>각 규칙은 코드로 확인할 수 있는 조건으로 씀. 리뷰 시 아래 지양 패턴이 보이면 권장 패턴으로 바꿈.</p> },
      { id: "nesting", title: "중첩은 한 겹까지", desc: "Surface 안에는 surface-sunk 면 한 겹만 허용. 면 안에 다시 면이나 테두리 박스를 두지 않음.", body: <CodeRule bad={`<section class="ac-surface">
  <div class="box">              <!-- 2겹 -->
    <div class="box">            <!-- 3겹 -->
      <input class="bordered" />
    </div>
  </div>
</section>`} good={`<section class="ac-surface">
  <div class="ac-date-pick">11월 22일</div>
  <textarea class="ac-paper"></textarea>
</section>`} /> },
      { id: "border", title: "border로 영역을 나누지 않음", desc: "Surface는 그림자, 내부 요소는 배경색으로 구분. 목록 행 사이 구분선만 예외.", body: <CodeRule bad={`.card {
  border: 1px solid var(--line);
}
.chip {
  border: 1px solid var(--line);
}`} good={`.ac-surface {
  box-shadow: var(--shadow-surface);
}
.ac-chip {
  background: var(--surface-sunk);
}`} /> },
      { id: "input", title: "입력 영역은 면 + 포커스 링", desc: "Paper, Field, 날짜 선택은 테두리 없는 surface-sunk 면. 포커스는 accent 2px 링으로 표시.", body: <CodeRule bad={`input {
  background: var(--bg);
  border: 1px solid var(--line);
}
input:focus {
  border-color: var(--accent);
}`} good={`.ac-field {
  background: var(--surface-sunk);
  border: 0;
}
.ac-field:focus {
  box-shadow: 0 0 0 2px var(--accent);
}`} /> },
      { id: "display", title: "display 스타일은 화면당 하나", desc: "display-1, display-2는 날짜나 핵심 숫자 하나에만 사용. 나머지는 title 이하.", body: <CodeRule bad={`<h2 class="display-1">11월 22일</h2>
<b class="display-2">₩83,550</b>
<b class="display-2">6회</b>`} good={`<h2 class="display-1">11월 22일</h2>
<span class="body">₩83,550</span>
<span class="caption">운동 6회</span>`} /> },
      { id: "accent", title: "primary와 accent는 하나", desc: "primary 버튼은 Surface당 하나. petal-* 색상은 텍스트에 사용하지 않음.", body: <CodeRule bad={`<button class="ac-btn primary">저장</button>
<button class="ac-btn primary">취소</button>

.label { color: var(--petal-mint); }`} good={`<button class="ac-btn primary">저장</button>
<button class="ac-btn ghost">취소</button>

.label { color: var(--good); }`} /> },
    ];
    case "ux-writing": return [
      { id: "tone", title: "기본 어조", body: <p>UI 문구는 해요체로 씀. 한 문장에는 한 가지 내용만 담고, 느낌표와 이모지는 사용하지 않음. 마스코트 멜로의 대사만 반말을 사용함.</p> },
      { id: "buttons", title: "버튼", desc: "버튼 레이블에는 실행될 동작을 씀.", body: <Table head={["권장", "지양"]} rows={[["저장", "확인"], ["삭제", "OK"], ["단어 고르기", "선택하기"], ["연결 해제", "해제 진행"]]} /> },
      { id: "messages", title: "안내와 오류", body: <Table head={["상황", "권장", "지양"]} rows={[["지우기 전", "이 기록을 지울까요?", "정말 삭제하시겠습니까?"], ["빈 화면", "오늘 하루는 어땠어?", "내용을 입력해주세요."], ["불러오기 실패", "불러오지 못했어요. 다시 시도해 주세요.", "오류가 발생했습니다!"], ["저장 완료", "저장됨", "저장이 완료되었습니다."]]} /> },
      { id: "mallow", title: "멜로 대사", body: <p>멜로의 대사는 반말로 짧게 씀. 예: &quot;오늘 마음 어땠어?&quot;, &quot;멜로랑 같이 써볼래?&quot;</p> },
    ];
    case "color": return [
      { id: "petals", title: "꽃잎 팔레트", desc: "브랜드 로고에서 가져온 보조 색상. 그래픽, DayFlower, 비율 막대 등 면에만 사용하고 텍스트에는 사용하지 않음.", body: <div className="ds-petals">{PETALS.map((p) => <div key={p.name} style={{ background: p.hex }}><b>{p.name}</b><span>{p.use}</span><code>{p.hex}</code></div>)}</div> },
      ...COLORS.map((g): Block => ({ id: g.id, title: g.group, body: (
        <Table head={["토큰", "라이트", "다크", "쓰는 곳"]} rows={g.items.map((c) => [
          <code key="n">{c.name}</code>,
          <span key="l" className="dd-sw"><i style={{ background: c.light }} />{c.light}</span>,
          <span key="d" className="dd-sw"><i style={{ background: c.dark }} />{c.dark}</span>,
          c.use,
        ])} />
      ) })),
      { id: "contrast", title: "대비", body: <p>모든 텍스트 색상은 배경 대비 4.5:1 이상(WCAG 2.1 AA). 상태는 색상만으로 표현하지 않고 &quot;불필요&quot;, &quot;저장됨&quot; 같은 텍스트를 함께 표시함. 현재 {theme === "light" ? "라이트" : "다크"} 테마 값이 표시됨.</p> },
    ];
    case "typography": return [
      { id: "families", title: "서체", body: <Rows rows={[[<b key="a">Pretendard</b>, "본문, 버튼, 숫자 등 모든 UI 텍스트"], [<b key="b" className="t-d2">둥근미소</b>, "날짜, 핵심 숫자 (display 스타일)"]]} /> },
      { id: "scale", title: "크기 단계", desc: "아래 일곱 가지 스타일만 사용함.", body: <div className="dd-type">{TYPE.map((s) => <div key={s.name}><span className="meta"><code>{s.name}</code><small>{s.spec}</small></span><span className={s.cls}>{s.sample}</span></div>)}</div> },
      { id: "numbers", title: "숫자", body: <p>금액, 개수처럼 세로로 정렬되는 숫자에는 <code>tabular-nums</code>를 적용함.</p> },
    ];
    case "shape": return [
      { id: "spacing", title: "간격", body: <div className="dd-space">{[4, 8, 12, 16, 24, 32, 48].map((s, i) => <div key={s}><code>space-{i + 1}</code><i style={{ width: s * 4 }} /><small>{s}px</small></div>)}</div> },
      { id: "radius", title: "모서리", demo: <div className="ds-radii"><div><i style={{ borderRadius: 10 }} /><small>radius-control · 10</small></div><div><i style={{ borderRadius: 18 }} /><small>radius-surface · 18</small></div><div><i className="pill" /><small>radius-pill</small></div></div> },
      { id: "shadow", title: "그림자", demo: <div className="ds-shadows"><div className="sh1">shadow-surface<small>Surface 기본</small></div><div className="sh2">shadow-float<small>Dialog, 플로팅 버튼</small></div></div> },
    ];
    case "icons": return [
      { id: "rules", title: "규칙", body: <p>모든 아이콘은 24px 격자, 선 굵기 1.75, 둥근 선 끝으로 제작함. 기본 색상은 <code>ink-2</code>, 선택 상태는 <code>ink</code>. 이모지와 외부 아이콘 세트는 사용하지 않음.</p> },
      { id: "app", title: "앱 아이콘", body: <div className="dd-icons">{NAV_ICONS.map((n) => <div key={n}><Icon name={n} size={24} /><small>{n}</small></div>)}</div> },
      { id: "category", title: "지출 분류", body: <div className="dd-icons">{CATEGORIES.map((c) => <div key={c}><CategoryGlyph c={c} /><small>{CAT_NAME[c]}</small></div>)}</div> },
    ];
    case "components": return [];
    case "button": return [
      { id: "overview", title: "기본", demo: <button type="button" className="ds-btn primary">저장</button>, code: `<button class="ac-btn primary">저장</button>` },
      { id: "variant", title: "Variant", level: 3, desc: "Button의 역할에 따라 스타일을 지정함. primary는 Surface당 하나만 사용함.", demo: <div className="dd-variants">{[["primary", "저장"], ["soft", "단어 고르기"], ["ghost", "취소"], ["quiet", "연결 해제"], ["danger", "삭제"]].map(([v, l]) => <div key={v}><small>{v}</small><button type="button" className={`ds-btn ${v === "soft" ? "" : v}`}>{l}</button></div>)}</div>, code: `<button class="ac-btn primary">저장</button>\n<button class="ac-btn">단어 고르기</button>\n<button class="ac-btn ghost">취소</button>\n<button class="ac-btn quiet">연결 해제</button>\n<button class="ac-btn danger">삭제</button>` },
      { id: "size", title: "Size", level: 3, desc: "Button의 높이를 지정함. md는 40px, sm은 32px.", demo: <div className="ds-row-wrap"><button type="button" className="ds-btn">＋ 할 일</button><button type="button" className="ds-btn sm">＋ 할 일</button></div>, code: `<button class="ac-btn">＋ 할 일</button>\n<button class="ac-btn sm">＋ 할 일</button>` },
      { id: "disabled", title: "Disabled", level: 3, desc: "비활성 상태에서는 variant와 관계없이 회색으로 표시됨.", demo: <button type="button" className="ds-btn primary" disabled>저장</button>, code: `<button class="ac-btn primary" disabled>저장</button>` },
      { id: "usage", title: "사용 규칙", body: <DoDont dos={["레이블에 실행될 동작을 씀 (저장, 삭제)", "자주 쓰지 않는 동작(연결 해제)에는 quiet를 사용함", "긴 글 작성 화면은 버튼 대신 자동 저장을 사용함"]} donts={["한 Surface에 primary를 두 개 이상 두지 않음", "확인, OK 같은 모호한 레이블", "Dialog 밖에서 danger 사용"]} /> },
      { id: "props", title: "Props", body: <Table head={["속성", "기본값", "값"]} rows={[["variant", <Pill key="a">soft</Pill>, <span key="b" className="dd-pills"><Pill>primary</Pill><Pill>soft</Pill><Pill>ghost</Pill><Pill>quiet</Pill><Pill>danger</Pill></span>], ["size", <Pill key="c">md</Pill>, <span key="d" className="dd-pills"><Pill>md · 40</Pill><Pill>sm · 32</Pill></span>], ["disabled", <Pill key="e">false</Pill>, "boolean"]]} /> },
    ];
    case "chip": return [
      { id: "overview", title: "선택 항목", desc: "선택된 Chip은 accent-soft 배경에 accent-ink 텍스트로 표시됨. × 를 누르면 선택이 해제됨.", demo: <ChipDemo />, code: `<button class="ac-chip on">뿌듯하다 <span class="x">×</span></button>\n<button class="ac-chip add">＋ 단어</button>` },
      { id: "filter", title: "필터", level: 3, desc: "목록 상단에서 단일 선택 필터로 사용함. 모바일에서는 가로로 스크롤됨.", demo: <FilterDemo />, code: `<button class="ac-chip on">전체</button>\n<button class="ac-chip">불필요만</button>` },
      { id: "usage", title: "사용 규칙", body: <DoDont dos={["한두 단어의 짧은 레이블을 사용함", "선택된 항목에만 on 상태를 적용함"]} donts={["Chip 안에 아이콘이나 이모지 사용", "문장 형태의 레이블"]} /> },
      { id: "props", title: "Props", body: <Table head={["속성", "기본값", "값"]} rows={[["state", <Pill key="a">off</Pill>, <span key="b" className="dd-pills"><Pill>off</Pill><Pill>on</Pill><Pill>add</Pill></span>], ["onRemove", "–", "× 버튼을 표시하고 클릭 시 호출됨"]]} /> },
    ];
    case "paper": return [
      { id: "overview", title: "기본", desc: "테두리 없이 surface-sunk 면, radius 14, 17px 글자로 표시됨. 포커스 시 accent 링이 표시되고 크기 조절 핸들은 없음.", demo: <PaperDemo />, code: `<label class="ac-label" for="diary">일기</label>\n<textarea id="diary" class="ac-paper" placeholder="오늘 하루는 어땠어?"></textarea>\n<div class="ac-paper-foot"><span class="ac-caption">38자</span><span class="ac-caption ac-saved">저장됨</span></div>` },
      { id: "empty", title: "빈 상태", level: 3, desc: "내용이 없을 때는 placeholder로 질문 한 줄을 표시함.", demo: <PaperDemo empty />, code: `<textarea class="ac-paper" placeholder="오늘 하루는 어땠어?"></textarea>` },
      { id: "usage", title: "사용 규칙", body: <DoDont dos={["입력 중 자동 저장하고 하단에 저장 상태를 표시함", "placeholder는 질문 형태로 씀"]} donts={["Paper 하단에 저장 버튼 배치", "Paper에 테두리 추가", "Paper를 또 다른 면이나 카드로 감싸기"]} /> },
    ];
    case "field": return [
      { id: "overview", title: "기본", desc: "테두리 없이 surface-sunk 면으로 표시되며, 포커스 시 accent 링이 표시됨.", demo: <div className="ds-card dd-w dd-fields"><label className="ds-lbl" htmlFor="dd-f1">금액</label><input id="dd-f1" className="ds-field" defaultValue="12,000" inputMode="numeric" /><label className="ds-lbl" htmlFor="dd-f2">메모</label><input id="dd-f2" className="ds-field" placeholder="무엇에 썼어요?" /></div>, code: `<label class="ac-label" for="amount">금액</label>\n<input id="amount" class="ac-field" inputmode="numeric">` },
      { id: "usage", title: "사용 규칙", body: <DoDont dos={["레이블은 입력 필드 위에 label 스타일로 표시함", "숫자 입력에는 inputmode=numeric을 지정함"]} donts={["배경색과 테두리를 함께 사용한 입력 필드", "면 안에 또 다른 면을 둔 입력 필드"]} /> },
    ];
    case "surface": return [
      { id: "overview", title: "기본", desc: "surface 배경, shadow-surface 그림자, radius-surface 모서리를 사용함.", demo: <div className="ds-card dd-w"><div className="ds-date"><b>11월 22일</b><span>일요일</span></div><p className="ds-lbl">오늘 할 일</p><span className="t-body">은행 서류 제출</span><span className="t-body">택배 반품</span></div>, code: `<section class="ac-surface">\n  <div class="ac-date"><b>11월 22일</b><span>일요일</span></div>\n  …\n</section>` },
      { id: "usage", title: "사용 규칙", body: <DoDont dos={["화면당 Surface는 두세 개 이내로 사용함", "내부 영역은 간격으로 나누고, 입력 영역만 surface-sunk 면으로 표시함"]} donts={["Surface 안에 Surface 중첩", "면 안에 면을 두는 두 겹 이상의 중첩", "border로 영역 구분"]} /> },
    ];
    case "list-row": return [
      { id: "overview", title: "기본", desc: "날짜 헤더와 일별 합계 아래에 기록을 한 줄씩 표시함. 수정·삭제 버튼은 hover 또는 탭 시 나타남.", demo: <DialogDemo />, code: `<div class="ac-day"><span>11월 22일 (일)</span><span>−₩12,000</span></div>\n<div class="ac-list">\n  <button class="ac-row">…<span class="t"><b>점심</b><small>식비 <em>불필요</em></small></span><span class="n">₩12,000</span></button>\n</div>` },
      { id: "usage", title: "사용 규칙", body: <DoDont dos={["메모를 제목으로, 분류를 보조 텍스트로 표시함", "불필요 지출은 텍스트로도 표시함"]} donts={["기록마다 별도 카드 사용", "수정·삭제 버튼 상시 노출"]} /> },
    ];
    case "day-flower": return [
      { id: "overview", title: "단계", desc: "완료 비율에 따라 다섯 단계로 표시하며, 가운데 숫자는 완료한 개수.", demo: <div className="ds-flowers">{[[0, "안 함"], [1, "조금"], [2, "반쯤"], [3, "거의"], [4, "다 함"]].map(([l, t]) => <div key={l}><Flower level={l as number} n={l as number} /><small>{t}</small></div>)}</div>, code: `<svg class="ac-flower l3" viewBox="0 0 44 44">…<text>3</text></svg>` },
      { id: "usage", title: "사용 규칙", body: <DoDont dos={["계획이 없는 날은 숫자 없이 l0으로 표시함", "선택된 날이 l4일 때만 축하 효과를 표시함"]} donts={["숫자 외의 텍스트나 아이콘 표시"]} /> },
    ];
    case "tabs": return [
      { id: "overview", title: "기본", desc: "선택된 탭은 ink 색상, 굵은 글자, 2px 하단 선으로 표시됨.", demo: <TabsDemo />, code: `<div class="ac-tabs" role="tablist">\n  <button class="ac-tab on" role="tab" aria-selected="true">일기</button>\n  <button class="ac-tab" role="tab">주간 회고</button>\n</div>` },
      { id: "usage", title: "사용 규칙", body: <DoDont dos={["탭은 2~5개, 짧은 레이블로 구성함"]} donts={["앱 전체 내비게이션 용도로 사용"]} /> },
    ];
    case "dialog": return [
      { id: "overview", title: "기본", desc: "삭제될 항목의 정보를 표시하고 사용자 확인을 받음.", demo: <StaticDialog />, code: `<div class="ac-dialog" role="alertdialog">\n  <h3>이 기록을 지울까요?</h3>\n  <p>11월 22일 · 점심 · ₩12,000</p>\n  <span class="ac-caption">지우면 되돌릴 수 없어요.</span>\n  <div class="acts"><button class="ac-btn">취소</button><button class="ac-btn danger">삭제</button></div>\n</div>` },
      { id: "try", title: "동작 예시", level: 3, desc: "삭제 버튼을 누르면 Dialog가 열림. 취소, Esc, 바깥 영역 클릭 시 삭제되지 않음.", demo: <DialogDemo /> },
      { id: "usage", title: "사용 규칙", body: <DoDont dos={["저장된 기록을 삭제할 때 사용함", "열릴 때 취소 버튼에 포커스를 둠"]} donts={["할 일처럼 가벼운 항목 삭제에 사용", "확인 / 취소 같은 모호한 레이블"]} /> },
    ];
    default: return [];
  }
}

/* ---------- page ---------- */

export default function DesignDocs({ slug }: { slug: string }) {
  // moving between pages remounts this component: start from the theme already chosen, so the page never flashes light first
  const [theme, setTheme] = useState<Theme>(() => shownTheme ?? "light");
  useEffect(() => {
    if (shownTheme) return;
    let t: Theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    try { const s = localStorage.getItem("achievee:dsTheme"); if (s === "light" || s === "dark") t = s; } catch { /* no storage */ }
    shownTheme = t; setTheme(t);
  }, []);
  const pick = (t: Theme) => { shownTheme = t; setTheme(t); try { localStorage.setItem("achievee:dsTheme", t); } catch { /* no storage */ } };
  const [menu, setMenu] = useState(false);
  useEffect(() => { setMenu(false); window.scrollTo(0, 0); }, [slug]);

  const page = DOC_PAGES.find((p) => p.slug === slug)!;
  const blocks = pageBlocks(slug, theme);
  const comps = DOC_PAGES.filter((p) => p.group === "컴포넌트" && p.slug !== "components");
  const i = DOC_PAGES.indexOf(page), prev = DOC_PAGES[i - 1], next = DOC_PAGES[i + 1];
  const href = (p: DocPage) => (p.slug === "intro" ? "/design" : `/design/${p.slug}`);

  return (
    <div className="ds dd" data-t={theme}>
      <header className="dd-top">
        <button type="button" className="dd-burger" aria-label="메뉴" aria-expanded={menu} onClick={() => setMenu(!menu)}><Icon name="more" /></button>
        <Link href="/design" className="dd-brand"><Mark size={24} /><Wordmark height={17} /><span>Design</span></Link>
        <nav className="dd-groups">{GROUPS.map((g) => { const first = DOC_PAGES.find((p) => p.group === g)!; return <Link key={g} href={href(first)} className={page.group === g ? "on" : ""}>{g}</Link>; })}</nav>
        <div className="ds-seg" role="group" aria-label="테마">{(["light", "dark"] as Theme[]).map((t) => <button key={t} type="button" className={theme === t ? "on" : ""} aria-pressed={theme === t} onClick={() => pick(t)}>{t === "light" ? "라이트" : "다크"}</button>)}</div>
      </header>

      <div className="dd-body">
        <aside className={`dd-side${menu ? " open" : ""}`}>
          {GROUPS.map((g) => (
            <div key={g}>
              <b>{g}</b>
              {DOC_PAGES.filter((p) => p.group === g).map((p) => <Link key={p.slug} href={href(p)} className={p.slug === slug ? "on" : ""} aria-current={p.slug === slug ? "page" : undefined}>{p.title}</Link>)}
            </div>
          ))}
        </aside>

        <main className="dd-main">
          {slug === "intro" && <Cover />}
          <h1>{page.title}</h1>
          <p className="dd-lead">{page.summary}</p>
          {slug === "components" ? (
            <>
              <hr />
              {["Action", "Input", "Layout", "Data Display", "Navigation", "Overlay"].map((tag) => {
                const list = comps.filter((c) => c.tag === tag);
                return list.length ? (
                  <section key={tag} className="dd-sec" id={tag.toLowerCase().replace(" ", "-")}>
                    <h2>{tag}</h2>
                    <div className="dd-grid">{list.map((c) => <Link key={c.slug} href={href(c)} className="dd-gcard"><div className="dd-gthumb" aria-hidden="true">{THUMB[c.slug]}</div><b>{c.title}</b><span>{c.summary}</span></Link>)}</div>
                  </section>
                ) : null;
              })}
            </>
          ) : blocks.map((b) => (
            <section key={b.id} className={`dd-sec${b.level === 3 ? " sub" : ""}`} id={b.id}>
              {b.level === 3 ? <h3>{b.title}</h3> : <h2>{b.title}</h2>}
              {b.desc && <p className="dd-desc">{b.desc}</p>}
              {b.demo && <Preview demo={b.demo} code={b.code} align={b.align} />}
              {b.body && <div className="dd-prose">{b.body}</div>}
            </section>
          ))}
          <nav className="dd-pager">
            {prev ? <Link href={href(prev)}><small>이전</small>{prev.title}</Link> : <span />}
            {next ? <Link href={href(next)} className="r"><small>다음</small>{next.title}</Link> : <span />}
          </nav>
        </main>

        <nav className="dd-toc" aria-label="이 페이지">
          <b>이 페이지</b>
          {(slug === "components" ? ["Action", "Input", "Layout", "Data Display", "Navigation", "Overlay"].filter((t) => comps.some((c) => c.tag === t)).map((t) => ({ id: t.toLowerCase().replace(" ", "-"), title: t, level: 2 })) : blocks).map((b) => <a key={b.id} href={`#${b.id}`} className={b.level === 3 ? "sub" : ""}>{b.title}</a>)}
        </nav>
      </div>
    </div>
  );
}
