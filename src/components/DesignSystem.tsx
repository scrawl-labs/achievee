"use client";
import { useEffect, useState } from "react";
import { Mark } from "./Logo";
import Wordmark from "./Wordmark";
import Icon, { type IconName } from "./Icon";
import CategoryGlyph from "./CategoryGlyph";
import { CATEGORIES } from "@/lib/i18n";
import "./design.css";

/**
 * /design: Achievee's design system as a page people enjoy reading. Everything on it is drawn with the system's own
 * tokens (scoped to .ds, so the app's styles are untouched) and the components are live: type in the paper, toggle
 * the chips, open the dialog.
 */

type T = "light" | "dark";
const COLORS: { group: string; items: { name: string; light: string; dark: string; use: string; text?: boolean }[] }[] = [
  { group: "바탕과 면", items: [
    { name: "bg", light: "#f6f5f2", dark: "#0f0f0e", use: "페이지 바탕" },
    { name: "surface", light: "#ffffff", dark: "#191918", use: "카드, 패널, 대화상자" },
    { name: "surface-sunk", light: "#f0efeb", dark: "#242422", use: "칩, 타일, 눌린 버튼" },
    { name: "line", light: "#e7e5e0", dark: "#2e2d2a", use: "카드 안 구분선" },
  ] },
  { group: "글자", items: [
    { name: "ink", light: "#1a1917", dark: "#efeee9", use: "본문, 숫자", text: true },
    { name: "ink-2", light: "#5c5a55", dark: "#a8a6a0", use: "분류, 요일, 보조 설명", text: true },
    { name: "ink-3", light: "#6b6861", dark: "#8d8a83", use: "개수, 시간, 안내", text: true },
  ] },
  { group: "행동과 상태", items: [
    { name: "accent", light: "#4a5bf0", dark: "#8b96ff", use: "주요 버튼, 선택, 링크" },
    { name: "accent-soft", light: "#eceefe", dark: "#262a52", use: "고른 칩, 고른 날" },
    { name: "good", light: "#1a7d48", dark: "#5fd394", use: "필요, 저장됨, 수입", text: true },
    { name: "danger", light: "#c9353b", dark: "#ff7b7f", use: "불필요, 삭제, 오류", text: true },
  ] },
];
const PETALS = [
  { name: "petal", hex: "#fb78a2", use: "로고, 다 끝낸 날" },
  { name: "petal-peach", hex: "#ffb199", use: "식비, 조금 한 날" },
  { name: "petal-butter", hex: "#ffd980", use: "카페, 반쯤 한 날" },
  { name: "petal-mint", hex: "#9be3b4", use: "교통, 목표 달성" },
  { name: "petal-lilac", hex: "#c3a6ff", use: "문화, 멜로의 감정" },
  { name: "petal-sky", hex: "#8fb8ff", use: "고정비, 비 오는 날" },
];
const TYPE = [
  { name: "display-1", spec: "둥근미소 36 / 40", cls: "t-d1", sample: "11월 22일" },
  { name: "display-2", spec: "둥근미소 28 / 34", cls: "t-d2", sample: "₩83,550" },
  { name: "title", spec: "Pretendard 20 / 28 · 700", cls: "t-title", sample: "2026년 11월" },
  { name: "writing", spec: "Pretendard 17 / 30", cls: "t-writing", sample: "오늘은 발표가 생각보다 잘 끝났다." },
  { name: "body", spec: "Pretendard 15 / 22", cls: "t-body", sample: "은행 서류 제출" },
  { name: "label", spec: "Pretendard 13 / 18 · 600", cls: "t-label", sample: "오늘 마음은" },
  { name: "caption", spec: "Pretendard 12 / 16 · 500", cls: "t-caption", sample: "38자 · 저장됨" },
];
const SPACE = [4, 8, 12, 16, 24, 32, 48];
const NAV_ICONS: IconName[] = ["home", "chart", "book", "wallet", "activity", "calendar", "plug", "user", "search", "plus", "edit", "check"];
const CAT_NAME: Record<string, string> = { food: "식비", cafe: "카페", transport: "교통", shopping: "쇼핑", culture: "문화", fixed: "고정비", other: "기타" };
const PLACES = [["meadow", "들판"], ["forest", "숲"], ["subway", "지하철"], ["rain", "비 오는 정류장"], ["beach", "바닷가"]];
const VOICE = [
  ["저장", "확인"],
  ["이 기록을 지울까요?", "정말 삭제하시겠습니까?"],
  ["오늘 하루는 어땠어?", "내용을 입력해주세요."],
  ["불러오지 못했어요. 다시 시도해 주세요.", "오류가 발생했습니다!"],
];

function Flower({ level, n }: { level: number; n?: number }) {
  const petals = [0, 60, 120, 180, 240, 300].map((a) => [22 + 11 * Math.sin((a * Math.PI) / 180), 22 - 11 * Math.cos((a * Math.PI) / 180)]);
  return (
    <svg className={`ds-flower l${level}`} viewBox="0 0 44 44" aria-hidden="true">
      <g className="b">{petals.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="7.5" />)}<circle cx="22" cy="22" r="11" /></g>
      {n !== undefined && <text x="22" y="22" textAnchor="middle" dominantBaseline="central">{n}</text>}
    </svg>
  );
}

function Section({ id, kicker, title, lead, children }: { id: string; kicker: string; title: string; lead: string; children: React.ReactNode }) {
  return (
    <section className="ds-sec" id={id} aria-labelledby={`${id}-t`}>
      <header className="ds-sec-h">
        <span className="ds-kicker">{kicker}</span>
        <h2 id={`${id}-t`}>{title}</h2>
        <p>{lead}</p>
      </header>
      {children}
    </section>
  );
}

export default function DesignSystem() {
  const [theme, setTheme] = useState<T>("light");
  useEffect(() => { if (window.matchMedia("(prefers-color-scheme: dark)").matches) setTheme("dark"); }, []);
  const [words, setWords] = useState(["뿌듯하다", "홀가분하다"]);
  const [body, setBody] = useState("오늘은 회사에서 발표가 있었는데 생각보다 잘 끝났다. 저녁엔 친구랑 떡볶이.");
  const [confirm, setConfirm] = useState(false);
  const [gone, setGone] = useState(false);
  const [filter, setFilter] = useState("전체");

  return (
    <div className="ds" data-t={theme}>
      <nav className="ds-top">
        <a href="/" className="ds-brand" aria-label="Achievee"><Mark size={26} /><Wordmark height={18} /></a>
        <div className="ds-links">
          {[["principles", "원칙"], ["color", "색"], ["type", "글자"], ["shape", "모양"], ["components", "컴포넌트"], ["icons", "아이콘"], ["voice", "말투"], ["mallow", "멜로"]].map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
        </div>
        <div className="ds-seg" role="group" aria-label="테마">
          {(["light", "dark"] as T[]).map((t) => <button key={t} type="button" className={theme === t ? "on" : ""} aria-pressed={theme === t} onClick={() => setTheme(t)}>{t === "light" ? "라이트" : "다크"}</button>)}
        </div>
      </nav>

      <header className="ds-hero">
        <div className="ds-hero-text">
          <span className="ds-kicker">Achievee Design System</span>
          <h1>신청서가 아니라<br />수첩처럼.</h1>
          <p>하루를 기록하는 화면의 규칙이에요. 상자를 겹겹이 쌓지 않고, 글은 종이에 쓰듯, 색은 꽃잎에서 가져와요.</p>
        </div>
        <div className="ds-cover" aria-hidden="true">
          <div className="c-slab"><Flower level={0} /></div>
          <div className="c-accent" />
          <div className="c-ink" />
          <div className="c-butter" />
          <div className="c-mint" />
          <img className="c-mallow" src="/mallow/mallow.webp" alt="" />
        </div>
      </header>

      <Section id="principles" kicker="원칙" title="다섯 가지만 지켜요" lead="딱딱해 보이는 화면은 대부분 상자를 너무 많이 써서 생겨요. 아래 다섯 가지가 모든 화면의 기준이에요.">
        <div className="ds-principles">
          <article><div className="pv pv-box"><i><i><i /></i></i><b /></div><h3>상자는 하나만</h3><p>한 묶음은 <code>surface</code> 한 장. 그 안은 간격으로 나누고, 꼭 필요할 때만 선 한 줄.</p></article>
          <article><div className="pv pv-shadow"><i /></div><h3>테두리 대신 그림자</h3><p>바깥은 <code>shadow-surface</code>, 안쪽은 <code>surface-sunk</code> 면. 1px 테두리로 두르지 않아요.</p></article>
          <article><div className="pv pv-paper"><i /><i /><i /><i /></div><h3>쓰는 곳은 종이</h3><p>일기는 테두리 없이 17px, 30px 줄. 짧은 값은 밑줄만.</p></article>
          <article><div className="pv pv-hero"><b>22</b><i /><i /></div><h3>주인공은 하나</h3><p>날짜나 큰 숫자 하나가 먼저 보이고, 나머지는 물러나요.</p></article>
          <article><div className="pv pv-color"><b /><i /><i /><i /></div><h3>행동색은 하나</h3><p>누르는 건 <code>accent</code> 하나. 꽃잎 색은 그림에만.</p></article>
        </div>
      </Section>

      <Section id="color" kicker="색" title="조용한 바탕, 한 가지 파랑, 여섯 꽃잎" lead="같은 이름의 토큰이 라이트와 다크에서 각자 맞는 값을 가져요. 글자 색은 모두 자기 바탕에서 4.5:1 이상이에요.">
        <div className="ds-petals">{PETALS.map((p) => <div key={p.name} style={{ background: p.hex }}><b>{p.name}</b><span>{p.use}</span><code>{p.hex}</code></div>)}</div>
        <div className="ds-colors">
          {COLORS.map((g) => (
            <div key={g.group} className="ds-cgroup">
              <h3>{g.group}</h3>
              {g.items.map((c) => (
                <div key={c.name} className="ds-crow">
                  <span className="sw"><i style={{ background: c.light }} /><i style={{ background: c.dark }} /></span>
                  <span className="nm"><b>{c.name}</b><small>{c.use}</small></span>
                  <code>{theme === "light" ? c.light : c.dark}</code>
                </div>
              ))}
            </div>
          ))}
        </div>
      </Section>

      <Section id="type" kicker="글자" title="일곱 단계, 그 사이는 없어요" lead="본문은 Pretendard, 날짜와 큰 숫자는 둥근미소. 크기는 일곱 개뿐이라 화면마다 강약이 분명해요.">
        <div className="ds-card ds-type">
          {TYPE.map((s) => (
            <div key={s.name} className="ds-trow"><span className="meta"><b>{s.name}</b><small>{s.spec}</small></span><span className={s.cls}>{s.sample}</span></div>
          ))}
        </div>
      </Section>

      <Section id="shape" kicker="모양" title="간격, 모서리, 그림자" lead="간격은 4부터 48까지 일곱 단계, 모서리는 세 가지, 그림자는 두 가지예요.">
        <div className="ds-shape">
          <div className="ds-card">
            <h3>간격</h3>
            {SPACE.map((s, i) => <div key={s} className="ds-space"><code>space-{i + 1}</code><i style={{ width: s * 4 }} /><small>{s}px</small></div>)}
          </div>
          <div className="ds-card">
            <h3>모서리</h3>
            <div className="ds-radii"><div><i style={{ borderRadius: 10 }} /><small>control · 10</small></div><div><i style={{ borderRadius: 18 }} /><small>surface · 18</small></div><div><i className="pill" /><small>pill</small></div></div>
            <h3>그림자</h3>
            <div className="ds-shadows"><div className="sh1">shadow-surface<small>쉬고 있는 카드</small></div><div className="sh2">shadow-float<small>대화상자, 멜로 버튼</small></div></div>
          </div>
        </div>
      </Section>

      <Section id="components" kicker="컴포넌트" title="직접 만져보세요" lead="아래는 그림이 아니라 실제로 동작하는 컴포넌트예요. 칩을 눌러 보고, 종이에 써 보고, 기록을 지워 보세요.">
        <div className="ds-comp">
          <div className="ds-card ds-diary">
            <div className="ds-date"><b>11월 22일</b><span>일요일</span></div>
            <p className="ds-lbl">오늘 마음은</p>
            <div className="ds-chips">
              {words.map((w) => <button key={w} type="button" className="ds-chip on" onClick={() => setWords(words.filter((x) => x !== w))}>{w} <span aria-hidden="true">×</span></button>)}
              {words.length < 3 && <button type="button" className="ds-chip add" onClick={() => setWords([...words, ["설렌다", "고맙다", "편안하다"].find((x) => !words.includes(x))!])}>＋ 단어</button>}
            </div>
            <label className="ds-lbl" htmlFor="ds-paper">일기</label>
            <textarea id="ds-paper" className="ds-paper" value={body} onChange={(e) => setBody(e.target.value)} placeholder="오늘 하루는 어땠어?" />
            <div className="ds-foot"><small>{[...body].length}자</small><small className="saved">저장됨</small></div>
          </div>

          <div className="ds-stack">
            <div className="ds-card">
              <h3>버튼</h3>
              <div className="ds-row-wrap"><button type="button" className="ds-btn primary">저장</button><button type="button" className="ds-btn">단어 고르기</button><button type="button" className="ds-btn ghost">취소</button><button type="button" className="ds-btn quiet">연결 해제</button><button type="button" className="ds-btn primary" disabled>저장</button></div>
            </div>
            <div className="ds-card">
              <h3>하루 꽃</h3>
              <div className="ds-flowers">{[[0, 0, "안 함"], [1, 1, "조금"], [2, 2, "반쯤"], [3, 3, "거의"], [4, 4, "다 함"]].map(([l, n, t]) => <div key={l}><Flower level={l as number} n={n as number} /><small>{t}</small></div>)}</div>
            </div>
            <div className="ds-card">
              <h3>탭과 필터</h3>
              <div className="ds-tabs"><span className="on">일기</span><span>주간 회고</span><span>내 감정</span></div>
              <div className="ds-chips">{["전체", "불필요만", "식비", "카페"].map((f) => <button key={f} type="button" className={`ds-chip${filter === f ? " on" : ""}`} onClick={() => setFilter(f)}>{f}</button>)}</div>
            </div>
          </div>

          <div className="ds-list-demo">
            <div className="ds-day"><span>11월 22일 (일)</span><span>−₩16,500</span></div>
            <div className="ds-list">
              {!gone && (
                <div className="ds-lrow"><CategoryGlyph c="food" /><span className="t"><b>점심</b><small>식비 <em>불필요</em></small></span><b className="n">₩12,000</b>
                  <button type="button" className="ds-x" aria-label="삭제" onClick={() => setConfirm(true)}><Icon name="close" size={16} /></button></div>
              )}
              <div className="ds-lrow"><CategoryGlyph c="cafe" /><span className="t"><b>아메리카노</b><small>카페</small></span><b className="n">₩4,500</b></div>
            </div>
            {gone && <button type="button" className="ds-btn ghost ds-undo" onClick={() => setGone(false)}>예시 되돌리기</button>}
          </div>
        </div>
      </Section>

      <Section id="icons" kicker="아이콘" title="직접 그린 선 아이콘 한 벌" lead="24px 격자, 선 굵기 1.75, 둥근 끝. 메뉴와 지출 분류가 같은 규칙으로 그려져요. 이모지와 컬러 아이콘은 쓰지 않아요.">
        <div className="ds-card ds-icons">
          {NAV_ICONS.map((n) => <div key={n}><Icon name={n} size={24} /><small>{n}</small></div>)}
          {CATEGORIES.map((c) => <div key={c}><CategoryGlyph c={c} /><small>{CAT_NAME[c]}</small></div>)}
        </div>
      </Section>

      <Section id="voice" kicker="말투" title="짧고 부드럽게, 일어날 일을 그대로" lead="해요체로 짧게 써요. 버튼은 무엇이 일어나는지 말하고, 빈 화면은 질문 한 줄로. 멜로만 반말을 써요.">
        <div className="ds-voice">
          {VOICE.map(([good, bad]) => <div key={good} className="ds-card"><p className="do">{good}</p><p className="dont">{bad}</p></div>)}
        </div>
      </Section>

      <Section id="mallow" kicker="멜로" title="미리 그려 둔 다섯 장소" lead="멜로와 장소는 Blender로 렌더한 그림이에요. 화면에서 3D를 그리지 않아서 폰에서도 가볍게 떠요.">
        <div className="ds-places">{PLACES.map(([id, name]) => <figure key={id}><img src={`/mallow/${id}/wide-base.webp`} alt={`${name}의 멜로`} loading="lazy" /><figcaption>{name}</figcaption></figure>)}</div>
      </Section>

      <footer className="ds-foot-page"><Mark size={22} /><span>Achievee Design System · 2026</span><a href="/">Achievee로 가기</a></footer>

      {confirm && (
        <div className="ds-dim" onMouseDown={(e) => { if (e.target === e.currentTarget) setConfirm(false); }}>
          <div className="ds-dialog" role="alertdialog" aria-modal="true" aria-labelledby="ds-cf" onKeyDown={(e) => { if (e.key === "Escape") setConfirm(false); }}>
            <h3 id="ds-cf">이 기록을 지울까요?</h3>
            <p>11월 22일 · 점심 · ₩12,000</p>
            <small>지우면 되돌릴 수 없어요.</small>
            <div className="acts"><button type="button" className="ds-btn" autoFocus onClick={() => setConfirm(false)}>취소</button><button type="button" className="ds-btn danger" onClick={() => { setGone(true); setConfirm(false); }}>삭제</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
