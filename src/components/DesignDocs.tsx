"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, ButtonLink, Checkbox, Chip, ChipRow, ConfirmDialog, DayFlower, DayHeader, Field, Label, List, ListRow, Paper, SaveStatus, Select, Surface, Tabs } from "@achievee/ui";
import { Mark } from "./Logo";
import Wordmark from "./Wordmark";
import Icon, { type IconName } from "./Icon";
import CategoryGlyph from "./CategoryGlyph";
import { CATEGORIES } from "@/lib/i18n";
import { DOC_PAGES, type DocPage } from "@/lib/designDocs";
import "./design.css";

/**
 * /design: the docs of the design system package (@achievee/ui), laid out like a component library site. Every example
 * is the package's real component, so the docs and the app cannot drift apart. The page switches theme with
 * data-theme on its root, which the package tokens follow.
 */

type Theme = "light" | "dark";
let shownTheme: Theme | null = null; // the theme on screen, kept across page changes
type Block = { id: string; title: string; level?: 2 | 3; desc?: string; demo?: React.ReactNode; code?: string; body?: React.ReactNode; align?: "center" | "start" };
const GROUPS = ["시작하기", "파운데이션", "컴포넌트"] as const;

/* ---------- docs building blocks ---------- */

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
const Pills = ({ v }: { v: string[] }) => <span className="dd-pills">{v.map((x) => <Pill key={x}>{x}</Pill>)}</span>;
const DoDont = ({ dos, donts }: { dos: string[]; donts: string[] }) => (
  <div className="dd-dodont">
    <div className="do"><b>권장</b><ul>{dos.map((d) => <li key={d}>{d}</li>)}</ul></div>
    <div className="dont"><b>지양</b><ul>{donts.map((d) => <li key={d}>{d}</li>)}</ul></div>
  </div>
);
const Props = ({ rows }: { rows: [string, string, React.ReactNode][] }) => <Table head={["속성", "기본값", "값"]} rows={rows.map(([a, b, c]) => [<code key="a">{a}</code>, b === "–" ? "–" : <Pill key="b">{b}</Pill>, c])} />;
const IMPORT = (names: string) => `import { ${names} } from "@achievee/ui";\n\n`;

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

/* ---------- live demos, built from the package ---------- */

function ChipDemo() {
  const [words, setWords] = useState(["뿌듯하다", "홀가분하다"]);
  return (
    <ChipRow>
      {words.map((w) => <Chip key={w} selected removable onClick={() => setWords(words.filter((x) => x !== w))}>{w}</Chip>)}
      {words.length < 3 && <Chip add onClick={() => setWords([...words, ["설렌다", "고맙다", "편안하다"].find((x) => !words.includes(x))!])}>＋ 단어</Chip>}
    </ChipRow>
  );
}
function FilterDemo() {
  const [f, setF] = useState("전체");
  return <ChipRow scroll className="dd-w">{["전체", "불필요만", "식비", "카페", "교통", "쇼핑"].map((x) => <Chip key={x} selected={f === x} onClick={() => setF(x)}>{x}</Chip>)}</ChipRow>;
}
function PaperDemo({ empty }: { empty?: boolean }) {
  const [body, setBody] = useState(empty ? "" : "오늘은 회사에서 발표가 있었는데 생각보다 잘 끝났다. 저녁엔 친구랑 떡볶이.");
  const id = empty ? "dd-p2" : "dd-p1";
  return (
    <Surface className="dd-w">
      <Label htmlFor={id}>일기</Label>
      <Paper id={id} value={body} onChange={(e) => setBody(e.target.value)} placeholder="오늘 하루는 어땠어?" />
      <SaveStatus count={`${[...body].length}자`} state="saved" labels={{ saved: "저장됐어요", saving: "저장 중…", retry: "다시 시도" }} />
    </Surface>
  );
}
function TabsDemo() {
  const [t, setT] = useState<"diary" | "week" | "mine" | "dict">("diary");
  return <Tabs label="일기 보기" value={t} onChange={setT} items={[{ value: "diary", label: "일기" }, { value: "week", label: "주간 회고" }, { value: "mine", label: "내 감정" }, { value: "dict", label: "감정 사전" }]} />;
}
function RowsDemo({ withDialog }: { withDialog?: boolean }) {
  const [openRow, setOpenRow] = useState<number | null>(null);
  const [ask, setAsk] = useState(false);
  const [gone, setGone] = useState(false);
  const del = <button type="button" className="dd-x" aria-label="삭제" onClick={() => setAsk(true)}><Icon name="close" size={16} /></button>;
  return (
    <div className="dd-w">
      <DayHeader day="11월 22일 (일)" total="−₩16,500" />
      <List>
        {gone ? <ListRow title="삭제됨" actions={<Button variant="ghost" size="sm" onClick={() => setGone(false)}>되돌리기</Button>} open /> : (
          <ListRow icon={<CategoryGlyph c="food" />} title="점심" meta="식비" flag="불필요" amount="₩12,000" open={openRow === 0} onClick={() => setOpenRow(openRow === 0 ? null : 0)} actions={withDialog ? del : <Button variant="ghost" size="sm">불필요로 표시</Button>} />
        )}
        <ListRow icon={<CategoryGlyph c="cafe" />} title="아메리카노" meta="카페" amount="₩4,500" open={openRow === 1} onClick={() => setOpenRow(openRow === 1 ? null : 1)} actions={del} />
      </List>
      {ask && <ConfirmDialog title="이 기록을 지울까요?" detail="11월 22일 · 점심 · ₩12,000" note="지우면 되돌릴 수 없어요." cancelLabel="취소" confirmLabel="삭제" onCancel={() => setAsk(false)} onConfirm={() => { setGone(true); setAsk(false); }} />}
    </div>
  );
}

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
  button: <div className="dd-row"><Button variant="primary" size="sm" tabIndex={-1}>저장</Button><Button size="sm" tabIndex={-1}>단어 고르기</Button><Button variant="ghost" size="sm" tabIndex={-1}>취소</Button></div>,
  chip: <ChipRow><Chip selected tabIndex={-1}>뿌듯하다</Chip><Chip tabIndex={-1}>카페</Chip><Chip add tabIndex={-1}>＋ 단어</Chip></ChipRow>,
  paper: <div className="dd-thumb-paper"><span>오늘은 발표가 잘 끝났다.</span><i /><i /></div>,
  field: <div className="dd-thumb-field"><small>금액</small><span>12,000</span></div>,
  select: <div className="dd-thumb-field"><small>분류</small><Select defaultValue="cafe" tabIndex={-1} aria-hidden="true"><option value="cafe">카페</option></Select></div>,
  checkbox: <div className="dd-thumb-checks"><span><Checkbox defaultChecked tabIndex={-1} aria-hidden="true" />은행 서류 제출</span><span><Checkbox tabIndex={-1} aria-hidden="true" />택배 반품</span></div>,
  surface: <div className="dd-thumb-surface"><b>11월 22일</b><i /><i /></div>,
  "list-row": <List className="dd-thumb-list"><ListRow icon={<CategoryGlyph c="cafe" />} title="아메리카노" meta="카페" amount="₩4,500" tabIndex={-1} /></List>,
  "day-flower": <div className="dd-row dd-thumb-flowers">{([0, 1, 2, 3, 4] as const).map((l) => <DayFlower key={l} level={l} count={l} size={34} />)}</div>,
  tabs: <div className="ac-tabs"><span className="ac-tab ac-tab--on">일기</span><span className="ac-tab">주간 회고</span><span className="ac-tab">내 감정</span></div>,
  dialog: <div className="dd-thumb-dialog"><b>이 기록을 지울까요?</b><span><i /><i className="d" /></span></div>,
};

function pageBlocks(slug: string, theme: Theme): Block[] {
  switch (slug) {
    case "intro": return [
      { id: "what", title: "개요", body: <><p>Achievee는 할 일, 일정, 지출, 운동, 감정 기록을 한곳에서 관리하는 앱. 이 문서는 Achievee 화면에 쓰이는 디자인 토큰, 컴포넌트, UI 문구 기준을 정리함.</p><p>토큰과 컴포넌트는 저장소 안의 패키지 <code>@achievee/ui</code>로 제공됨. 앱과 이 문서는 같은 패키지를 사용함.</p></> },
      { id: "install", title: "사용 방법", body: <pre className="dd-code dd-code--block"><code>{`// app/layout.tsx\nimport "@achievee/ui/tokens.css";\nimport "@achievee/ui/styles.css";\n\n// 화면\nimport { Button, Chip, Paper, Surface } from "@achievee/ui";`}</code></pre> },
      { id: "tokens", title: "토큰", body: <p>토큰의 기준 파일은 <code>packages/ui/tokens.json</code> 하나. 수정 후 <code>npm run tokens</code>를 실행하면 <code>tokens.css</code>(<code>--ac-*</code> 변수, 라이트·다크)가 다시 생성됨.</p> },
      { id: "look", title: "예시", desc: "일기 화면에 시스템을 적용한 예시.", demo: (
        <div className="dd-hero-demo">
          <Surface className="dd-w">
            <div className="dd-date"><b>11월 22일</b><span>일요일</span></div>
            <Label>오늘 마음은</Label>
            <ChipRow><Chip selected removable>뿌듯하다</Chip><Chip selected removable>홀가분하다</Chip><Chip add>＋ 단어</Chip></ChipRow>
            <Paper defaultValue="오늘은 회사에서 발표가 있었는데 생각보다 잘 끝났다." aria-label="일기" style={{ minHeight: 120 }} />
            <SaveStatus count="27자" state="saved" labels={{ saved: "저장됐어요", saving: "저장 중…", retry: "다시 시도" }} />
          </Surface>
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
      { id: "nesting", title: "중첩은 한 겹까지", desc: "Surface 안에는 surface-sunk 면 한 겹만 허용. 면 안에 다시 면이나 테두리 박스를 두지 않음.", body: <CodeRule bad={`<Surface>
  <div className="box">          {/* 2겹 */}
    <div className="box">        {/* 3겹 */}
      <input className="bordered" />
    </div>
  </div>
</Surface>`} good={`<Surface>
  <DatePicker />
  <Paper placeholder="오늘 하루는 어땠어?" />
</Surface>`} /> },
      { id: "border", title: "border로 영역을 나누지 않음", desc: "Surface는 그림자, 내부 요소는 배경색으로 구분. 목록 행 사이 구분선만 예외.", body: <CodeRule bad={`.card {
  border: 1px solid var(--ac-line);
}
.chip {
  border: 1px solid var(--ac-line);
}`} good={`.card {
  box-shadow: var(--ac-shadow-surface);
}
.chip {
  background: var(--ac-surface-sunk);
}`} /> },
      { id: "input", title: "입력 영역은 면 + 포커스 링", desc: "입력은 Field, Paper를 사용. 직접 만들 때는 테두리 없는 surface-sunk 면에 accent 2px 포커스 링.", body: <CodeRule bad={`<input
  style={{ border: "1px solid #ddd" }}
/>`} good={`<Field inputMode="numeric" />
<Paper placeholder="오늘 하루는 어땠어?" />`} /> },
      { id: "display", title: "display 스타일은 화면당 하나", desc: "display-1, display-2는 날짜나 핵심 숫자 하나에만 사용. 나머지는 title 이하.", body: <CodeRule bad={`<h2 className="display-1">11월 22일</h2>
<b className="display-2">₩83,550</b>
<b className="display-2">6회</b>`} good={`<h2 className="display-1">11월 22일</h2>
<span className="body">₩83,550</span>
<span className="caption">운동 6회</span>`} /> },
      { id: "accent", title: "primary와 accent는 하나", desc: "primary 버튼은 Surface당 하나. petal 색상은 텍스트에 사용하지 않음.", body: <CodeRule bad={`<Button variant="primary">저장</Button>
<Button variant="primary">취소</Button>

.label { color: var(--ac-petal-mint); }`} good={`<Button variant="primary">저장</Button>
<Button variant="ghost">취소</Button>

.label { color: var(--ac-good); }`} /> },
    ];
    case "ux-writing": return [
      { id: "tone", title: "기본 어조", body: <p>UI 문구는 해요체로 씀. 한 문장에는 한 가지 내용만 담고, 느낌표와 이모지는 사용하지 않음. 마스코트 멜로의 대사만 반말을 사용함.</p> },
      { id: "buttons", title: "버튼", desc: "버튼 레이블에는 실행될 동작을 씀.", body: <Table head={["권장", "지양"]} rows={[["저장", "확인"], ["삭제", "OK"], ["단어 고르기", "선택하기"], ["연결 해제", "해제 진행"]]} /> },
      { id: "messages", title: "안내와 오류", body: <Table head={["상황", "권장", "지양"]} rows={[["지우기 전", "이 기록을 지울까요?", "정말 삭제하시겠습니까?"], ["빈 화면", "오늘 하루는 어땠어?", "내용을 입력해주세요."], ["불러오기 실패", "불러오지 못했어요. 다시 시도해 주세요.", "오류가 발생했습니다!"], ["저장 완료", "저장됨", "저장이 완료되었습니다."]]} /> },
      { id: "mallow", title: "멜로 대사", body: <p>멜로의 대사는 반말로 짧게 씀. 예: &quot;오늘 마음 어땠어?&quot;, &quot;멜로랑 같이 써볼래?&quot;</p> },
    ];
    case "color": return [
      { id: "petals", title: "꽃잎 팔레트", desc: "브랜드 로고에서 가져온 보조 색상. 그래픽, DayFlower, 비율 막대 등 면에만 사용하고 텍스트에는 사용하지 않음.", body: <div className="dd-petals">{PETALS.map((p) => <div key={p.name} style={{ background: p.hex }}><b>{p.name}</b><span>{p.use}</span><code>{p.hex}</code></div>)}</div> },
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
      { id: "radius", title: "모서리", demo: <div className="dd-radii"><div><i style={{ borderRadius: 10 }} /><small>radius-control · 10</small></div><div><i style={{ borderRadius: 18 }} /><small>radius-surface · 18</small></div><div><i className="pill" /><small>radius-pill</small></div></div> },
      { id: "shadow", title: "그림자", demo: <div className="dd-shadows"><div className="sh1">shadow-surface<small>Surface 기본</small></div><div className="sh2">shadow-float<small>Dialog, 플로팅 버튼</small></div></div> },
    ];
    case "icons": return [
      { id: "rules", title: "규칙", body: <p>모든 아이콘은 24px 격자, 선 굵기 1.75, 둥근 선 끝으로 제작함. 기본 색상은 <code>ink-2</code>, 선택 상태는 <code>ink</code>. 이모지와 외부 아이콘 세트는 사용하지 않음.</p> },
      { id: "app", title: "앱 아이콘", body: <div className="dd-icons">{NAV_ICONS.map((n) => <div key={n}><Icon name={n} size={24} /><small>{n}</small></div>)}</div> },
      { id: "category", title: "지출 분류", body: <div className="dd-icons">{CATEGORIES.map((c) => <div key={c}><CategoryGlyph c={c} /><small>{CAT_NAME[c]}</small></div>)}</div> },
    ];
    case "components": return [];
    case "button": return [
      { id: "overview", title: "기본", demo: <Button variant="primary">저장</Button>, code: IMPORT("Button") + `<Button variant="primary">저장</Button>` },
      { id: "variant", title: "Variant", level: 3, desc: "Button의 역할에 따라 스타일을 지정함. primary는 Surface당 하나만 사용함.", demo: <div className="dd-variants">{([["primary", "저장"], ["soft", "단어 고르기"], ["ghost", "취소"], ["quiet", "연결 해제"], ["danger", "삭제"]] as const).map(([v, l]) => <div key={v}><small>{v}</small><Button variant={v}>{l}</Button></div>)}</div>, code: `<Button variant="primary">저장</Button>\n<Button>단어 고르기</Button>\n<Button variant="ghost">취소</Button>\n<Button variant="quiet">연결 해제</Button>\n<Button variant="danger">삭제</Button>` },
      { id: "size", title: "Size", level: 3, desc: "Button의 높이를 지정함. md는 40px, sm은 32px.", demo: <div className="dd-row"><Button>＋ 할 일</Button><Button size="sm">＋ 할 일</Button></div>, code: `<Button>＋ 할 일</Button>\n<Button size="sm">＋ 할 일</Button>` },
      { id: "disabled", title: "Disabled", level: 3, desc: "비활성 상태에서는 variant와 관계없이 회색으로 표시됨.", demo: <Button variant="primary" disabled>저장</Button>, code: `<Button variant="primary" disabled>저장</Button>` },
      { id: "link", title: "ButtonLink", level: 3, desc: "다른 사이트나 페이지로 이동할 때는 같은 모양의 ButtonLink(a 요소)를 사용함. variant, size는 Button과 같음.", demo: <ButtonLink href="https://calendar.google.com" target="_blank" rel="noreferrer">Google 캘린더 열기</ButtonLink>, code: IMPORT("ButtonLink") + `<ButtonLink href="https://calendar.google.com" target="_blank" rel="noreferrer">
  Google 캘린더 열기
</ButtonLink>` },
      { id: "usage", title: "사용 규칙", body: <DoDont dos={["레이블에 실행될 동작을 씀 (저장, 삭제)", "자주 쓰지 않는 동작(연결 해제)에는 quiet를 사용함", "긴 글 작성 화면은 버튼 대신 자동 저장을 사용함"]} donts={["한 Surface에 primary를 두 개 이상 두지 않음", "확인, OK 같은 모호한 레이블", "Dialog 밖에서 danger 사용"]} /> },
      { id: "props", title: "Props", body: <Props rows={[["variant", "soft", <Pills key="v" v={["primary", "soft", "ghost", "quiet", "danger"]} />], ["size", "md", <Pills key="s" v={["md · 40", "sm · 32"]} />], ["...button", "–", "disabled, onClick 등 button 속성"]]} /> },
    ];
    case "chip": return [
      { id: "overview", title: "선택 항목", desc: "선택된 Chip은 accent-soft 배경에 accent-ink 텍스트로 표시됨. 누르면 선택이 해제됨.", demo: <ChipDemo />, code: IMPORT("Chip, ChipRow") + `<ChipRow>\n  <Chip selected removable onClick={remove}>뿌듯하다</Chip>\n  <Chip add onClick={openPicker}>＋ 단어</Chip>\n</ChipRow>` },
      { id: "filter", title: "필터", level: 3, desc: "목록 상단에서 단일 선택 필터로 사용함. scroll을 주면 한 줄로 두고 가로로 스크롤됨.", demo: <FilterDemo />, code: `<ChipRow scroll>\n  {filters.map((f) => (\n    <Chip key={f} selected={f === value} onClick={() => setValue(f)}>{f}</Chip>\n  ))}\n</ChipRow>` },
      { id: "usage", title: "사용 규칙", body: <DoDont dos={["한두 단어의 짧은 레이블을 사용함", "선택된 항목에만 selected를 적용함"]} donts={["Chip 안에 아이콘이나 이모지 사용", "문장 형태의 레이블"]} /> },
      { id: "props", title: "Props", body: <Props rows={[["selected", "false", "boolean"], ["add", "false", "boolean · ＋ 추가 칩"], ["removable", "false", "boolean · × 표시"], ["scroll (ChipRow)", "false", "boolean · 한 줄 가로 스크롤"]]} /> },
    ];
    case "paper": return [
      { id: "overview", title: "기본", desc: "테두리 없이 surface-sunk 면, radius 14, 17px 글자로 표시됨. 포커스 시 accent 링이 표시되고 크기 조절 핸들은 없음.", demo: <PaperDemo />, code: IMPORT("Label, Paper, SaveStatus") + `<Label htmlFor="diary">일기</Label>\n<Paper id="diary" value={body} onChange={onChange} placeholder="오늘 하루는 어땠어?" />\n<SaveStatus count={\`\${body.length}자\`} state={state} labels={labels} onRetry={save} />` },
      { id: "empty", title: "빈 상태", level: 3, desc: "내용이 없을 때는 placeholder로 질문 한 줄을 표시함.", demo: <PaperDemo empty />, code: `<Paper placeholder="오늘 하루는 어땠어?" />` },
      { id: "usage", title: "사용 규칙", body: <DoDont dos={["입력 중 자동 저장하고 SaveStatus로 저장 상태를 표시함", "placeholder는 질문 형태로 씀"]} donts={["Paper 하단에 저장 버튼 배치", "Paper에 테두리 추가", "Paper를 또 다른 면이나 카드로 감싸기"]} /> },
      { id: "props", title: "Props", body: <Props rows={[["...textarea", "–", "value, onChange, placeholder 등 textarea 속성"], ["SaveStatus.state", "–", <Pills key="s" v={["saved", "saving", "failed"]} />]]} /> },
    ];
    case "field": return [
      { id: "overview", title: "기본", desc: "테두리 없이 surface-sunk 면으로 표시되며, 포커스 시 accent 링이 표시됨.", demo: <Surface className="dd-w dd-fields"><Label htmlFor="dd-f1">금액</Label><Field id="dd-f1" defaultValue="12,000" inputMode="numeric" /><Label htmlFor="dd-f2">메모</Label><Field id="dd-f2" placeholder="무엇에 썼어요?" /></Surface>, code: IMPORT("Field, Label") + `<Label htmlFor="amount">금액</Label>\n<Field id="amount" inputMode="numeric" />` },
      { id: "usage", title: "사용 규칙", body: <DoDont dos={["레이블은 입력 필드 위에 Label로 표시함", "숫자 입력에는 inputMode=\"numeric\"을 지정함"]} donts={["배경색과 테두리를 함께 사용한 입력 필드", "면 안에 또 다른 면을 둔 입력 필드"]} /> },
      { id: "props", title: "Props", body: <Props rows={[["...input", "–", "value, onChange, placeholder, inputMode 등 input 속성"]]} /> },
    ];
    case "select": return [
      { id: "overview", title: "기본", desc: "Field와 같은 surface-sunk 면에 오른쪽 화살표가 붙음. 포커스 시 accent 링이 표시됨.", demo: <Surface className="dd-w dd-fields"><Label htmlFor="dd-s1">분류</Label><Select id="dd-s1" defaultValue="cafe">{Object.entries(CAT_NAME).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Surface>, code: IMPORT("Label, Select") + `<Label htmlFor="category">분류</Label>\n<Select id="category" value={category} onChange={(e) => setCategory(e.target.value)}>\n  <option value="food">식비</option>\n  <option value="cafe">카페</option>\n</Select>` },
      { id: "size", title: "Size", level: 3, desc: "md는 44px로 Field와 높이가 같음. sm은 28px로 하단의 언어, 테마 설정에만 사용함.", demo: <div className="dd-row"><Select defaultValue="ko" aria-label="언어 (md)" style={{ width: 160 }}><option value="ko">한국어</option></Select><Select size="sm" defaultValue="ko" aria-label="언어 (sm)"><option value="ko">한국어</option></Select></div>, code: `<Select>…</Select>\n<Select size="sm">…</Select>` },
      { id: "usage", title: "사용 규칙", body: <DoDont dos={["선택지가 다섯 개 이상이거나 화면이 좁을 때 사용함", "선택지가 두세 개면 Chip이나 Tabs를 먼저 고려함"]} donts={["select 요소에 직접 스타일 지정", "선택 즉시 되돌릴 수 없는 작업 실행"]} /> },
      { id: "props", title: "Props", body: <Props rows={[["size", "md", <Pills key="s" v={["md · 44", "sm · 28"]} />], ["...select", "–", "value, onChange, disabled 등 select 속성"]]} /> },
    ];
    case "checkbox": return [
      { id: "overview", title: "기본", desc: "할 일과 목표의 완료 여부는 둥근 Checkbox로 표시함. 체크하면 accent 면에 체크 표시가 나타남.", demo: <Surface className="dd-w dd-checks"><label><Checkbox defaultChecked />은행 서류 제출</label><label><Checkbox />택배 반품</label></Surface>, code: IMPORT("Checkbox") + `<Checkbox checked={done} onChange={(e) => onToggle(e.target.checked)} aria-label="은행 서류 제출 완료" />` },
      { id: "shape", title: "Shape", level: 3, desc: "목록에서 항목을 켜고 끌 때(표시할 캘린더)는 square를 사용함.", demo: <Surface className="dd-w dd-checks"><label><Checkbox shape="square" defaultChecked />내 캘린더</label><label><Checkbox shape="square" />공휴일</label></Surface>, code: `<label>\n  <Checkbox shape="square" checked={on} onChange={toggle} />내 캘린더\n</label>` },
      { id: "usage", title: "사용 규칙", body: <DoDont dos={["텍스트와 함께 label로 감싸거나 aria-label을 지정함", "완료 표시는 round, 설정 켜기·끄기는 square"]} donts={["체크박스 하나만으로 저장 버튼 대신 사용", "브라우저 기본 체크박스 사용"]} /> },
      { id: "props", title: "Props", body: <Props rows={[["shape", "round", <Pills key="s" v={["round · 20", "square · 18"]} />], ["...input", "–", "checked, onChange, disabled 등 input 속성"]]} /> },
    ];
    case "surface": return [
      { id: "overview", title: "기본", desc: "surface 배경, shadow-surface 그림자, radius-surface 모서리를 사용함.", demo: <Surface className="dd-w"><div className="dd-date"><b>11월 22일</b><span>일요일</span></div><Label>오늘 할 일</Label><span className="t-body">은행 서류 제출</span><span className="t-body">택배 반품</span></Surface>, code: IMPORT("Surface") + `<Surface>\n  …\n</Surface>` },
      { id: "usage", title: "사용 규칙", body: <DoDont dos={["화면당 Surface는 두세 개 이내로 사용함", "내부 영역은 간격으로 나누고, 입력 영역만 surface-sunk 면으로 표시함"]} donts={["Surface 안에 Surface 중첩", "면 안에 면을 두는 두 겹 이상의 중첩", "border로 영역 구분"]} /> },
      { id: "props", title: "Props", body: <Props rows={[["flush", "false", "boolean · 여백 없이 (목록용)"]]} /> },
    ];
    case "list-row": return [
      { id: "overview", title: "기본", desc: "날짜 헤더와 일별 합계 아래에 기록을 한 줄씩 표시함. 행을 누르거나 마우스를 올리면 actions가 나타남.", demo: <RowsDemo />, code: IMPORT("DayHeader, List, ListRow") + `<DayHeader day="11월 22일 (일)" total="−₩16,500" />\n<List>\n  <ListRow icon={<CategoryGlyph c="food" />} title="점심" meta="식비" flag="불필요"\n    amount="₩12,000" open={open} onClick={toggle} actions={actions} />\n</List>` },
      { id: "usage", title: "사용 규칙", body: <DoDont dos={["메모를 제목으로, 분류를 보조 텍스트로 표시함", "불필요 지출은 flag 텍스트로도 표시함"]} donts={["기록마다 별도 카드 사용", "수정·삭제 버튼 상시 노출"]} /> },
      { id: "props", title: "Props", body: <Props rows={[["title", "–", "ReactNode"], ["meta", "–", "ReactNode · 분류"], ["flag", "–", "ReactNode · 빨간 선 + 텍스트"], ["amount", "–", "ReactNode"], ["tone", "default", <Pills key="t" v={["default", "good"]} />], ["actions", "–", "ReactNode · hover 또는 open 시 표시"], ["open", "false", "boolean"]]} /> },
    ];
    case "day-flower": return [
      { id: "overview", title: "단계", desc: "완료 비율에 따라 다섯 단계로 표시하며, 가운데 숫자는 완료한 개수.", demo: <div className="dd-flowers">{([[0, "안 함"], [1, "조금"], [2, "반쯤"], [3, "거의"], [4, "다 함"]] as const).map(([l, t]) => <div key={l}><DayFlower level={l} count={l} /><small>{t}</small></div>)}</div>, code: IMPORT("DayFlower") + `<DayFlower level={3} count={3} />` },
      { id: "usage", title: "사용 규칙", body: <DoDont dos={["계획이 없는 날은 count 없이 level 0", "선택된 날이 level 4일 때만 축하 효과를 표시함"]} donts={["숫자 외의 텍스트나 아이콘 표시"]} /> },
      { id: "props", title: "Props", body: <Props rows={[["level", "–", <Pills key="l" v={["0", "1", "2", "3", "4"]} />], ["count", "–", "number · 완료 개수"], ["size", "44", "number"], ["label", "–", "string · 스크린리더용"]]} /> },
    ];
    case "tabs": return [
      { id: "overview", title: "기본", desc: "선택된 탭은 ink 색상, 굵은 글자, 2px 하단 선으로 표시됨.", demo: <TabsDemo />, code: IMPORT("Tabs") + `<Tabs\n  value={view}\n  onChange={setView}\n  items={[{ value: "diary", label: "일기" }, { value: "week", label: "주간 회고" }]}\n/>` },
      { id: "usage", title: "사용 규칙", body: <DoDont dos={["탭은 2~5개, 짧은 레이블로 구성함"]} donts={["앱 전체 내비게이션 용도로 사용"]} /> },
      { id: "props", title: "Props", body: <Props rows={[["items", "–", "{ value, label }[]"], ["value", "–", "선택된 value"], ["onChange", "–", "(value) => void"]]} /> },
    ];
    case "dialog": return [
      { id: "overview", title: "기본", desc: "삭제될 항목의 정보를 표시하고 사용자 확인을 받음. X를 누르면 열림. 취소, Esc, 바깥 영역 클릭 시 삭제되지 않음.", demo: <RowsDemo withDialog />, code: IMPORT("ConfirmDialog") + `{asking && (\n  <ConfirmDialog\n    title="이 기록을 지울까요?"\n    detail="11월 22일 · 점심 · ₩12,000"\n    note="지우면 되돌릴 수 없어요."\n    cancelLabel="취소"\n    confirmLabel="삭제"\n    onCancel={() => setAsking(false)}\n    onConfirm={remove}\n  />\n)}` },
      { id: "usage", title: "사용 규칙", body: <DoDont dos={["저장된 기록을 삭제할 때 사용함", "열릴 때 취소 버튼에 포커스가 감 (기본 동작)"]} donts={["할 일처럼 가벼운 항목 삭제에 사용", "확인 / 취소 같은 모호한 레이블"]} /> },
      { id: "props", title: "Props", body: <Props rows={[["title", "–", "string"], ["detail", "–", "ReactNode · 삭제될 항목"], ["note", "–", "ReactNode"], ["cancelLabel / confirmLabel", "–", "string"], ["onCancel / onConfirm", "–", "() => void"]]} /> },
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
    <div className="ds dd" data-theme={theme}>
      <header className="dd-top">
        <button type="button" className="dd-burger" aria-label="메뉴" aria-expanded={menu} onClick={() => setMenu(!menu)}><Icon name="more" /></button>
        <Link href="/design" className="dd-brand"><Mark size={24} /><Wordmark height={17} /><span>Design</span></Link>
        <nav className="dd-groups">{GROUPS.map((g) => { const first = DOC_PAGES.find((p) => p.group === g)!; return <Link key={g} href={href(first)} className={page.group === g ? "on" : ""}>{g}</Link>; })}</nav>
        <div className="dd-seg" role="group" aria-label="테마">{(["light", "dark"] as Theme[]).map((t) => <button key={t} type="button" className={theme === t ? "on" : ""} aria-pressed={theme === t} onClick={() => pick(t)}>{t === "light" ? "라이트" : "다크"}</button>)}</div>
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
