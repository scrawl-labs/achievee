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
          <button type="button" className="dd-copy" onClick={() => { void navigator.clipboard?.writeText(code).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1200); }, () => undefined); }}>{copied ? "복사했어요" : "복사"}</button>
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

const Pill = ({ children }: { children: React.ReactNode }) => <span className="dd-pill">{children}</span>;
const DoDont = ({ dos, donts }: { dos: string[]; donts: string[] }) => (
  <div className="dd-dodont">
    <div className="do"><b>이렇게 써요</b><ul>{dos.map((d) => <li key={d}>{d}</li>)}</ul></div>
    <div className="dont"><b>이러면 안 돼요</b><ul>{donts.map((d) => <li key={d}>{d}</li>)}</ul></div>
  </div>
);

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
        {gone ? <div className="ds-lrow"><span className="t"><small>지웠어요.</small></span><button type="button" className="ds-btn ghost sm" onClick={() => setGone(false)}>되돌리기</button></div> : (
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
      { id: "what", title: "무엇인가요", body: <><p>Achievee는 할 일, 일정, 지출, 운동, 그날의 마음을 한곳에 적는 앱이에요. 이 디자인 시스템은 그 화면들이 <b>신청서가 아니라 수첩처럼</b> 느껴지도록 정한 규칙이에요.</p><p>색과 글자 같은 기준값(토큰), 그 위에서 만든 컴포넌트, 그리고 글을 쓰는 말투까지 담았어요.</p></> },
      { id: "why", title: "왜 새로 만들었나요", body: <p>예전 화면은 카드 안에 회색 칸, 그 안에 테두리 입력칸이 겹겹이 쌓여 있었어요. 기능은 문제없었지만 딱딱하고 사무적으로 보였어요. 그래서 상자를 덜어내고, 쓰는 곳은 종이처럼, 색은 로고의 꽃잎에서 가져오는 쪽으로 정리했어요.</p> },
      { id: "look", title: "한눈에 보기", demo: (
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
      { id: "start", title: "어디서부터 보면 되나요", body: <Rows rows={[
        [<Link key="p" href="/design/principles">원칙</Link>, "모든 화면이 지키는 다섯 가지. 가장 먼저 읽어 주세요."],
        [<Link key="c" href="/design/color">색</Link>, "바탕, 글자, 행동색, 꽃잎 팔레트."],
        [<Link key="k" href="/design/components">전체 컴포넌트</Link>, "버튼부터 대화상자까지, 직접 눌러볼 수 있어요."],
        [<Link key="v" href="/design/voice">말투</Link>, "버튼 이름과 안내 문장을 쓰는 법."],
      ]} /> },
    ];
    case "principles": return [
      { id: "one-box", title: "상자는 하나만", desc: "내용 한 묶음은 surface 한 장에 담고, 그 안에 상자를 또 만들지 않아요. 안쪽은 간격으로 나누고 꼭 필요할 때만 line 한 줄.", demo: <div className="dd-compare"><div className="bad"><div className="dd-nest"><div><div><span>2026년 11월 22일</span></div></div></div><small>상자 안의 상자</small></div><div className="good"><div className="ds-card dd-mini"><div className="ds-date"><b>11월 22일</b><span>일요일</span></div><i className="dd-line" /><i className="dd-line s" /></div><small>한 장에 간격으로</small></div></div> },
      { id: "shadow", title: "테두리 대신 그림자와 면", desc: "바깥은 shadow-surface로 띄우고, 안쪽은 surface-sunk 면으로 구분해요. 1px 테두리로 두르지 않아요.", demo: <div className="dd-compare"><div className="bad"><div className="dd-bordered">버튼</div><small>테두리로 구분</small></div><div className="good"><div className="ds-card dd-mini"><span className="ds-chip">눌린 면</span></div><small>그림자와 면으로 구분</small></div></div> },
      { id: "paper", title: "쓰는 곳은 종이", desc: "일기처럼 글을 쓰는 곳은 테두리 없이 17px, 30px 줄로. 짧은 값은 밑줄만 남겨요.", demo: <PaperDemo /> },
      { id: "hero", title: "주인공은 하나", desc: "한 화면에서 날짜나 큰 숫자 하나만 크게 보여요. 나머지는 body와 caption으로 물러나요.", demo: <div className="ds-card dd-w"><span className="ds-lbl">이번 달 지출</span><b className="t-d2">₩83,550</b><span className="t-caption">필요 ₩43,200 · 불필요 ₩40,350</span></div> },
      { id: "one-color", title: "행동색은 하나", desc: "누르는 주요 행동은 accent 하나뿐이에요. 꽃잎 색은 그림과 면에만 쓰고 글자에는 쓰지 않아요.", demo: <div className="ds-row-wrap"><button type="button" className="ds-btn primary">저장</button><span className="dd-dot" style={{ background: "var(--peach)" }} /><span className="dd-dot" style={{ background: "var(--mint)" }} /><span className="dd-dot" style={{ background: "var(--lilac)" }} /></div> },
    ];
    case "voice": return [
      { id: "tone", title: "해요체로, 짧게", body: <p>부드러운 해요체로 한 문장에 하나만 말해요. 느낌표, 이모지, 과장된 말은 쓰지 않아요. 멜로만 반말을 써요.</p> },
      { id: "buttons", title: "버튼은 일어날 일 그대로", body: <Table head={["이렇게", "말고"]} rows={[["저장", "확인"], ["삭제", "OK"], ["단어 고르기", "선택하기"], ["연결 해제", "해제 진행"]]} /> },
      { id: "messages", title: "안내와 오류", body: <Table head={["상황", "이렇게", "말고"]} rows={[["지우기 전", "이 기록을 지울까요?", "정말 삭제하시겠습니까?"], ["빈 화면", "오늘 하루는 어땠어?", "내용을 입력해주세요."], ["불러오기 실패", "불러오지 못했어요. 다시 시도해 주세요.", "오류가 발생했습니다!"], ["저장 완료", "저장됨", "저장이 완료되었습니다."]]} /> },
      { id: "mallow", title: "멜로의 말", body: <p>멜로는 친구처럼 반말로 짧게 물어요. &quot;오늘 마음 어땠어?&quot;, &quot;멜로랑 같이 써볼래?&quot; 기록 화면에서는 카드 밖, 오른쪽 아래에 작게 있어요.</p> },
    ];
    case "color": return [
      { id: "petals", title: "꽃잎 팔레트", desc: "로고의 꽃에서 가져온 여섯 색이에요. 그림, 꽃, 비율 막대처럼 면에만 쓰고 글자에는 쓰지 않아요.", body: <div className="ds-petals">{PETALS.map((p) => <div key={p.name} style={{ background: p.hex }}><b>{p.name}</b><span>{p.use}</span><code>{p.hex}</code></div>)}</div> },
      ...COLORS.map((g): Block => ({ id: g.id, title: g.group, body: (
        <Table head={["토큰", "라이트", "다크", "쓰는 곳"]} rows={g.items.map((c) => [
          <code key="n">{c.name}</code>,
          <span key="l" className="dd-sw"><i style={{ background: c.light }} />{c.light}</span>,
          <span key="d" className="dd-sw"><i style={{ background: c.dark }} />{c.dark}</span>,
          c.use,
        ])} />
      ) })),
      { id: "contrast", title: "대비", body: <p>모든 글자 색은 자기 바탕에서 4.5:1 이상이에요. 상태는 색만으로 알리지 않고 &quot;불필요&quot;, &quot;저장됨&quot; 같은 말을 함께 붙여요. 지금 보고 있는 값은 {theme === "light" ? "라이트" : "다크"} 테마예요.</p> },
    ];
    case "typography": return [
      { id: "families", title: "서체", body: <Rows rows={[[<b key="a">Pretendard</b>, "본문, 버튼, 숫자. 모든 읽는 글자."], [<b key="b" className="t-d2">둥근미소</b>, "날짜와 큰 숫자. 한 화면에 하나만."]]} /> },
      { id: "scale", title: "크기 단계", desc: "일곱 단계뿐이에요. 그 사이 크기는 만들지 않아요.", body: <div className="dd-type">{TYPE.map((s) => <div key={s.name}><span className="meta"><code>{s.name}</code><small>{s.spec}</small></span><span className={s.cls}>{s.sample}</span></div>)}</div> },
      { id: "numbers", title: "숫자", body: <p>금액과 개수처럼 세로로 맞춰 읽는 숫자는 <code>tabular-nums</code>로 자리를 맞춰요.</p> },
    ];
    case "shape": return [
      { id: "spacing", title: "간격", body: <div className="dd-space">{[4, 8, 12, 16, 24, 32, 48].map((s, i) => <div key={s}><code>space-{i + 1}</code><i style={{ width: s * 4 }} /><small>{s}px</small></div>)}</div> },
      { id: "radius", title: "모서리", demo: <div className="ds-radii"><div><i style={{ borderRadius: 10 }} /><small>radius-control · 10</small></div><div><i style={{ borderRadius: 18 }} /><small>radius-surface · 18</small></div><div><i className="pill" /><small>radius-pill</small></div></div> },
      { id: "shadow", title: "그림자", demo: <div className="ds-shadows"><div className="sh1">shadow-surface<small>쉬고 있는 카드</small></div><div className="sh2">shadow-float<small>대화상자, 멜로 버튼</small></div></div> },
    ];
    case "icons": return [
      { id: "rules", title: "규칙", body: <p>24px 격자, 선 굵기 1.75, 둥근 끝으로 직접 그렸어요. 색은 <code>ink-2</code>, 선택되면 <code>ink</code>. 이모지와 컬러 아이콘 세트는 쓰지 않아요.</p> },
      { id: "app", title: "앱 아이콘", body: <div className="dd-icons">{NAV_ICONS.map((n) => <div key={n}><Icon name={n} size={24} /><small>{n}</small></div>)}</div> },
      { id: "category", title: "지출 분류", body: <div className="dd-icons">{CATEGORIES.map((c) => <div key={c}><CategoryGlyph c={c} /><small>{CAT_NAME[c]}</small></div>)}</div> },
    ];
    case "components": return [];
    case "button": return [
      { id: "overview", title: "기본", demo: <button type="button" className="ds-btn primary">저장</button>, code: `<button class="ac-btn primary">저장</button>` },
      { id: "variant", title: "Variant", level: 3, desc: "역할에 따라 다섯 가지예요. 주요 버튼(primary)은 한 surface에 하나만.", demo: <div className="dd-variants">{[["primary", "저장"], ["soft", "단어 고르기"], ["ghost", "취소"], ["quiet", "연결 해제"], ["danger", "삭제"]].map(([v, l]) => <div key={v}><small>{v}</small><button type="button" className={`ds-btn ${v === "soft" ? "" : v}`}>{l}</button></div>)}</div>, code: `<button class="ac-btn primary">저장</button>\n<button class="ac-btn">단어 고르기</button>\n<button class="ac-btn ghost">취소</button>\n<button class="ac-btn quiet">연결 해제</button>\n<button class="ac-btn danger">삭제</button>` },
      { id: "size", title: "Size", level: 3, desc: "기본 40px, 작은 버튼 32px.", demo: <div className="ds-row-wrap"><button type="button" className="ds-btn">＋ 할 일</button><button type="button" className="ds-btn sm">＋ 할 일</button></div>, code: `<button class="ac-btn">＋ 할 일</button>\n<button class="ac-btn sm">＋ 할 일</button>` },
      { id: "disabled", title: "Disabled", level: 3, desc: "꺼진 버튼은 흐린 파랑이 아니라 회색이에요.", demo: <button type="button" className="ds-btn primary" disabled>저장</button>, code: `<button class="ac-btn primary" disabled>저장</button>` },
      { id: "usage", title: "사용 규칙", body: <DoDont dos={["버튼 이름은 일어날 일 그대로: 저장, 삭제", "글을 쓰는 화면은 저장 버튼 대신 자동 저장", "드문 행동(연결 해제)은 quiet"]} donts={["한 surface에 primary 두 개", "확인, OK 같은 이름", "danger를 대화상자 밖에서 쓰기"]} /> },
      { id: "props", title: "Props", body: <Table head={["속성", "기본값", "값"]} rows={[["variant", <Pill key="a">soft</Pill>, <span key="b" className="dd-pills"><Pill>primary</Pill><Pill>soft</Pill><Pill>ghost</Pill><Pill>quiet</Pill><Pill>danger</Pill></span>], ["size", <Pill key="c">md</Pill>, <span key="d" className="dd-pills"><Pill>md · 40</Pill><Pill>sm · 32</Pill></span>], ["disabled", <Pill key="e">false</Pill>, "boolean"]]} /> },
    ];
    case "chip": return [
      { id: "overview", title: "감정 단어", desc: "고른 단어는 accent-soft 위에 accent-ink. 눌러서 빼고, ＋ 단어로 더해요.", demo: <ChipDemo />, code: `<button class="ac-chip on">뿌듯하다 <span class="x">×</span></button>\n<button class="ac-chip add">＋ 단어</button>` },
      { id: "filter", title: "필터", level: 3, desc: "목록 위에서 하나만 고르는 필터. 폰에서는 옆으로 넘겨요.", demo: <FilterDemo />, code: `<button class="ac-chip on">전체</button>\n<button class="ac-chip">불필요만</button>` },
      { id: "usage", title: "사용 규칙", body: <DoDont dos={["짧은 말만, 높이 34px", "고른 것은 on, 고를 수 있는 것은 기본"]} donts={["칩 안에 아이콘이나 이모지", "긴 문장을 칩으로"]} /> },
      { id: "props", title: "Props", body: <Table head={["속성", "기본값", "값"]} rows={[["state", <Pill key="a">off</Pill>, <span key="b" className="dd-pills"><Pill>off</Pill><Pill>on</Pill><Pill>add</Pill></span>], ["onRemove", "–", "× 를 보여주고 누르면 빼요"]]} /> },
    ];
    case "paper": return [
      { id: "overview", title: "기본", desc: "테두리와 크기 조절 손잡이 없이, 17px 글씨를 30px 줄 위에 써요. 직접 써 보세요.", demo: <PaperDemo />, code: `<label class="ac-label" for="diary">일기</label>\n<textarea id="diary" class="ac-paper" placeholder="오늘 하루는 어땠어?"></textarea>\n<div class="ac-paper-foot"><span class="ac-caption">38자</span><span class="ac-caption ac-saved">저장됨</span></div>` },
      { id: "empty", title: "빈 상태", level: 3, desc: "긴 안내 대신 질문 한 줄.", demo: <PaperDemo empty />, code: `<textarea class="ac-paper" placeholder="오늘 하루는 어땠어?"></textarea>` },
      { id: "usage", title: "사용 규칙", body: <DoDont dos={["쓰는 동안 자동 저장, 아래에 '저장됨'만", "placeholder는 질문으로"]} donts={["Paper 아래에 저장 버튼", "Paper를 회색 상자에 넣기"]} /> },
    ];
    case "field": return [
      { id: "overview", title: "기본", desc: "짧은 값은 밑줄 하나. 누르면 밑줄이 accent로 바뀌어요.", demo: <div className="ds-card dd-w dd-fields"><label className="ds-lbl" htmlFor="dd-f1">금액</label><input id="dd-f1" className="ds-field" defaultValue="12,000" inputMode="numeric" /><label className="ds-lbl" htmlFor="dd-f2">메모</label><input id="dd-f2" className="ds-field" placeholder="무엇에 썼어요?" /></div>, code: `<label class="ac-label" for="amount">금액</label>\n<input id="amount" class="ac-field" inputmode="numeric">` },
      { id: "usage", title: "사용 규칙", body: <DoDont dos={["라벨은 위에, label 스타일로", "숫자는 inputmode=numeric"]} donts={["회색 면에 테두리까지 두른 입력칸"]} /> },
    ];
    case "surface": return [
      { id: "overview", title: "기본", desc: "내용 한 묶음을 담는 단 하나의 면이에요. 그림자로 바탕에서 떠 있어요.", demo: <div className="ds-card dd-w"><div className="ds-date"><b>11월 22일</b><span>일요일</span></div><p className="ds-lbl">오늘 할 일</p><span className="t-body">은행 서류 제출</span><span className="t-body">택배 반품</span></div>, code: `<section class="ac-surface">\n  <div class="ac-date"><b>11월 22일</b><span>일요일</span></div>\n  …\n</section>` },
      { id: "usage", title: "사용 규칙", body: <DoDont dos={["한 화면에 surface는 두세 장", "안쪽 구분은 간격이나 hr 한 줄"]} donts={["surface 안에 surface", "border로 상자 두르기"]} /> },
    ];
    case "list-row": return [
      { id: "overview", title: "기본", desc: "날짜와 그날 합계 아래, 한 건은 한 줄. 마우스를 올리거나 누르면 지우기가 나와요.", demo: <DialogDemo />, code: `<div class="ac-day"><span>11월 22일 (일)</span><span>−₩12,000</span></div>\n<div class="ac-list">\n  <button class="ac-row">…<span class="t"><b>점심</b><small>식비 <em>불필요</em></small></span><span class="n">₩12,000</span></button>\n</div>` },
      { id: "usage", title: "사용 규칙", body: <DoDont dos={["메모가 제목, 분류는 작은 글씨", "불필요는 글자로도 표시"]} donts={["한 건마다 카드 한 장", "수정·삭제 아이콘을 늘 보여주기"]} /> },
    ];
    case "day-flower": return [
      { id: "overview", title: "단계", desc: "하루 계획 중 얼마나 했는지 꽃 색으로 보여줘요. 숫자는 한 개수예요.", demo: <div className="ds-flowers">{[[0, "안 함"], [1, "조금"], [2, "반쯤"], [3, "거의"], [4, "다 함"]].map(([l, t]) => <div key={l}><Flower level={l as number} n={l as number} /><small>{t}</small></div>)}</div>, code: `<svg class="ac-flower l3" viewBox="0 0 44 44">…<text>3</text></svg>` },
      { id: "usage", title: "사용 규칙", body: <DoDont dos={["계획이 없는 날은 빈 회색 꽃", "다 끝낸 날만 색종이"]} donts={["꽃 안에 글자나 아이콘"]} /> },
    ];
    case "tabs": return [
      { id: "overview", title: "기본", desc: "한 탭 안에서 보기를 바꿔요. 고른 탭은 굵은 글씨와 밑줄.", demo: <TabsDemo />, code: `<div class="ac-tabs" role="tablist">\n  <button class="ac-tab on" role="tab" aria-selected="true">일기</button>\n  <button class="ac-tab" role="tab">주간 회고</button>\n</div>` },
      { id: "usage", title: "사용 규칙", body: <DoDont dos={["두 개에서 다섯 개, 짧은 이름"]} donts={["앱 메뉴 대신 쓰기"]} /> },
    ];
    case "dialog": return [
      { id: "overview", title: "기본", desc: "지우기 전에 무엇이 지워지는지 보여주고 한 번 물어요.", demo: <StaticDialog />, code: `<div class="ac-dialog" role="alertdialog">\n  <h3>이 기록을 지울까요?</h3>\n  <p>11월 22일 · 점심 · ₩12,000</p>\n  <span class="ac-caption">지우면 되돌릴 수 없어요.</span>\n  <div class="acts"><button class="ac-btn">취소</button><button class="ac-btn danger">삭제</button></div>\n</div>` },
      { id: "try", title: "직접 해보기", level: 3, desc: "X를 눌러 보세요. 취소, Esc, 바깥 누르기는 지우지 않아요.", demo: <DialogDemo /> },
      { id: "usage", title: "사용 규칙", body: <DoDont dos={["저장된 기록을 지울 때마다", "취소에 먼저 포커스"]} donts={["할 일처럼 가벼운 것까지 묻기", "확인 / 취소 같은 이름"]} /> },
    ];
    default: return [];
  }
}

/* ---------- page ---------- */

export default function DesignDocs({ slug }: { slug: string }) {
  const [theme, setTheme] = useState<Theme>("light");
  useEffect(() => {
    try { const s = localStorage.getItem("achievee:dsTheme"); if (s === "light" || s === "dark") { setTheme(s); return; } } catch { /* no storage */ }
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) setTheme("dark");
  }, []);
  const pick = (t: Theme) => { setTheme(t); try { localStorage.setItem("achievee:dsTheme", t); } catch { /* no storage */ } };
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
