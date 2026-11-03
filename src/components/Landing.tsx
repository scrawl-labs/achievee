"use client";
import { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import LandingBori from "./LandingBori";
import { GOOGLE_HL, type Key } from "@/lib/i18n";
import { FAMILIES, WORDS, emoLang, wordText } from "@/lib/emotions";
import Blob from "./Blob";
import Footer from "./Footer";
import GCalLogo from "./GCalLogo";
import GoogleG from "./GoogleG";
import Icon from "./Icon";
import Summary from "./Summary";
import Logo from "./Logo";
import { useI18n } from "./I18n";
import { GithubMark, JiraMark, NotionMark } from "./WorkList";
import "./landing.css";

const MON = [1, 2, 3, 4, 5, 6, 0];
// A made-up month for the hero window (level 0..4, tasks done), Monday first.
const MONTH: [number, number][] = [
  [0, 0], [2, 2], [3, 4], [4, 5], [1, 2], [0, 0], [0, 0],
  [3, 3], [4, 5], [4, 6], [3, 4], [4, 5], [2, 3], [0, 0],
  [4, 5], [3, 4], [4, 6], [4, 5], [2, 3], [1, 1], [0, 0],
];
const NAV: { icon: "calendar" | "chart" | "book" | "wallet" | "external"; k: Key }[] = [
  { icon: "calendar", k: "nav.calendar" }, { icon: "chart", k: "nav.stats" }, { icon: "book", k: "nav.diary" },
  { icon: "wallet", k: "nav.expense" }, { icon: "external", k: "nav.google" },
];
const INTEGRATIONS: { name: string; icon: React.ReactNode; d: Key }[] = [
  { name: "GitHub", icon: <GithubMark size={24} />, d: "land.i.gh" },
  { name: "Jira", icon: <JiraMark size={24} />, d: "land.i.jira" },
  { name: "Notion", icon: <NotionMark size={24} />, d: "land.i.notion" },
  { name: "Google Calendar and Tasks", icon: <GCalLogo size={24} />, d: "land.i.google" },
];
const TRUST = ["t1", "t2", "t3", "t4", "t5"] as const;
const LANDING_BG = "#fbf7f3"; // the page colour: the phone's status bar takes it, so the top of the page does not start with a black strip

/*
 * The product shown as it really looks, with sample data. Each scene pairs a short text with one of these.
 * They are decoration only (aria-hidden): nothing in them is a control.
 */
function DayMock() {
  const { t, fmt, locale } = useI18n();
  const lang = emoLang(locale);
  return (
    <div className="sm sm-day">
      <h4>{fmt.monthDay("2026-10-19")} <small>{fmt.weekdayLong(1)}</small></h4>
      <div className="sm-goal"><i className="ring" />{t("land.mk.goal")}</div>
      <ul className="sm-tasks">
        <li className="done"><i className="check on" />{t("land.mk.todo1")}</li>
        <li><i className="check" />{t("land.mk.todo2")}</li>
      </ul>
      <div className="sm-line"><time>10:00</time>{t("land.mk.event")}</div>
      <div className="sm-row"><span className="kind">{t("wo.k.run")}</span><b>{t("foc.min", { m: 45 })}</b></div>
      <div className="sm-row"><span>{t("in.title")}</span><b>{t("in.dayLine", { water: "1.25L", protein: "72g" })}</b></div>
      <div className="sm-row"><span>{t("cal.spent")}</span><b>{fmt.money(4500)}</b></div>
      <div className="sm-diary">
        <span className="tags"><i>{wordText("proud", lang)}</i><i>{wordText("relieved", lang)}</i></span>
        <p>{t("land.mk.diary")}</p>
      </div>
    </div>
  );
}

function GridMock() {
  const { t } = useI18n();
  return (
    <div className="sm sm-grid">
      <div className="sm-strip"><span className="chip"><i className="check" />{t("land.mk.todo2")}</span></div>
      <div className="sm-hours">
        {[9, 10, 11, 12, 13, 14, 15].map((h) => <div key={h}><em>{h}</em></div>)}
        <b className="blk blue" style={{ top: 48 }}>{t("land.mk.event")}<small>10:00</small></b>
        <b className="blk pink" style={{ top: 144 }}>{t("land.mk.lunch")}<small>12:00</small></b>
        <b className="blk draft" style={{ top: 240 }}><small>14:00</small></b>
        <span className="ghost">{t("land.mk.plan")}</span>
      </div>
    </div>
  );
}

function EmotionMock() {
  const { t, locale } = useI18n();
  const lang = emoLang(locale);
  return (
    <div className="sm sm-emo">
      <small>1 / 3</small>
      <b className="q">{t("emo.q1")}</b>
      <div className="opts"><span className="on">{t("emo.q1pos")}</span><span>{t("emo.q1neg")}</span><span>{t("emo.q1mixed")}</span></div>
      <div className="words">
        {["proud", "glad", "relieved", "happy"].map((id, i) => <i key={id} className={i === 0 ? "on" : ""}>{wordText(id, lang)}</i>)}
      </div>
    </div>
  );
}

function MoneyMock() {
  const { t, fmt, locale } = useI18n();
  const month = new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" });
  const rows: [number, number, number, number][] = [[7, 19, 22, 45], [8, 19, 17, 52], [9, 19, 12, 58]]; // month, fixed %, variable %, saved %
  return (
    <div className="sm sm-money">
      <div className="nums">
        <div><small>{t("inc.income")}</small><b>{fmt.money(3700000)}</b></div>
        <div><small>{t("cal.spent")}</small><b>{fmt.money(805000)}</b></div>
        <div><small>{t("sav.title")}</small><b>{fmt.money(2000000)}</b></div>
        <div><small>{t("inc.balance")}</small><b>{fmt.money(895000)}</b></div>
      </div>
      <div className="bars">
        {rows.map(([m, a, b, c]) => (
          <div key={m}><span>{month.format(new Date(Date.UTC(2026, m, 1)))}</span>
            <div><i style={{ width: `${a}%`, background: "var(--c6)" }} /><i style={{ width: `${b}%`, background: "var(--c1)" }} /><i style={{ width: `${c}%`, background: "var(--c3)" }} /></div>
          </div>
        ))}
      </div>
      <div className="legend"><span><i style={{ background: "var(--c6)" }} />{t("wk.fixed")}</span><span><i style={{ background: "var(--c1)" }} />{t("wk.variable")}</span><span><i style={{ background: "var(--c3)" }} />{t("sav.title")}</span></div>
    </div>
  );
}

function BodyMock() {
  const { t, fmt } = useI18n();
  return (
    <div className="sm sm-body">
      <div className="week">
        {MON.map((d, i) => <div key={d} className={[0, 2, 3, 5].includes(i) ? "on" : ""}><i>{[0, 2, 3, 5].includes(i) && <Icon name="check" size={14} />}</i><span>{fmt.weekdayShort(d)}</span></div>)}
      </div>
      <div className="meters">
        <div><span>{t("in.water")}</span><div><i style={{ width: "62%" }} /></div><b>1.25L / 2L</b></div>
        <div><span>{t("in.protein")}</span><div><i style={{ width: "72%" }} /></div><b>72g / 100g</b></div>
      </div>
      <div className="trend">
        <small>{t("bw.title")}</small>
        <svg viewBox="0 0 240 70" role="presentation"><polyline fill="none" points="8,12 50,18 92,26 134,32 176,44 232,54" /><circle cx="232" cy="54" r="4" /></svg>
        <b>21.4%</b>
      </div>
    </div>
  );
}

function PatternMock() {
  const { t, locale } = useI18n();
  const lang = emoLang(locale);
  const name = (id: string) => FAMILIES.find((f) => f.id === id)?.[lang] ?? id;
  const BARS: [string, number][] = [["weary", 78], ["anx", 52], ["joy", 40], ["calm", 24]];
  return (
    <div className="sm sm-pattern">
      <b>{t("emo.pTitle")}</b>
      <div className="fams">
        {BARS.map(([id, w], i) => (
          <div key={id}><span>{name(id)}</span><i><u style={{ width: `${w}%`, background: `var(--c${[2, 5, 3, 6][i]})` }} /></i></div>
        ))}
      </div>
      <p className="verdict">{t("emo.cEx", { f: name("weary"), a: 12, b: 38 })}</p>
      <div className="faint">
        <b>{t("emo.pLight", { d: new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" }).format(Date.UTC(2026, 9, 3)) })}</b>
        <small>{t("emo.cNote")}</small>
      </div>
    </div>
  );
}

const SCENES = [
  { k: "c", tone: "pink", mock: <EmotionMock /> },
  { k: "f", tone: "yellow", mock: <PatternMock /> },
  { k: "a", tone: "blue", mock: <DayMock /> },
  { k: "b", tone: "lav", mock: <GridMock /> },
  { k: "d", tone: "green", mock: <MoneyMock /> },
  { k: "e", tone: "yellow", mock: <BodyMock /> },
] as const;

export default function Landing() {
  const { t, fmt, locale } = useI18n();
  const [scene, setScene] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const go = () => signIn("google", undefined, { hl: GOOGLE_HL[locale] });
  const gbtn = () => (
    <button type="button" className="gbtn" onClick={go}><GoogleG size={18} />{t("login.cta")}</button>
  );
  const pick = (i: number, focus = false) => {
    const n = (i + SCENES.length) % SCENES.length;
    setScene(n);
    if (focus) tabs.current[n]?.focus();
  };

  // the page is light (cream), so the browser chrome around it must be too; the app's own dark/light colours come back when leaving
  useEffect(() => {
    const metas = [...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')];
    const before = metas.map((m) => m.content);
    metas.forEach((m) => { m.content = LANDING_BG; });
    return () => metas.forEach((m, i) => { m.content = before[i]; });
  }, []);

  return (
    <div className="land">
      <header className="ld-nav">
        <div className="brand"><Logo height={26} /></div>
        <nav className="ld-nav-links" aria-label={t("land.nav.f")}>
          <a href="#features">{t("land.nav.f")}</a>
          <a href="#privacy">{t("land.nav.privacy")}</a>
        </nav>
      </header>

      <section className="ld-hero" aria-labelledby="ld-hero-title">
        <div className="ld-hero-copy">
          <h1 id="ld-hero-title">{t("login.tagline")}</h1>
          <p>{t("land.hero.sub", { n: WORDS.length })}</p>
          <div className="ld-hero-actions">
            {gbtn()}
            <a className="try-bori" href="/bori"><img src="/buddy/bori.png" alt="" width={34} height={34} />{t("buddy.tryCta")}</a>
          </div>
        </div>

        <div className="ld-hero-stage" aria-hidden="true">
          <div className="ld-app">
            <aside className="ld-app-side">
              {NAV.map((n, i) => (
                <span key={n.k} className={i === 0 ? "on" : ""}><Icon name={n.icon} size={16} />{t(n.k)}</span>
              ))}
            </aside>
            <div className="ld-app-main">
              <h4>{fmt.monthYear("2026-10")}</h4>
              <Summary items={[[t("cal.rate"), "86%"], [t("cal.done"), "42 / 49"], [t("cal.streak"), t("cal.days", { n: 5 })]]} />
              <div className="ld-app-head">{MON.map((d) => <span key={d}>{fmt.weekdayShort(d)}</span>)}</div>
              <div className="ld-app-grid">
                {MONTH.map(([lv, n], i) => <span key={i}><Blob level={lv} label={lv ? n : ""} /></span>)}
              </div>
            </div>
          </div>
        </div>
      </section>

      <LandingBori />

      <section id="features" className="ld-feats">
        <div className="ld-tabs" role="tablist" aria-label={t("land.nav.f")}>
          {SCENES.map((s, i) => (
            <button key={s.k} ref={(el) => { tabs.current[i] = el; }} type="button" role="tab" id={`ld-tab-${s.k}`} aria-controls={`ld-panel-${s.k}`}
              aria-selected={i === scene} tabIndex={i === scene ? 0 : -1} onClick={() => pick(i)}
              onKeyDown={(e) => { if (e.key === "ArrowRight") pick(i + 1, true); if (e.key === "ArrowLeft") pick(i - 1, true); }}>
              {t(`land.${s.k}.e` as Key)}
            </button>
          ))}
        </div>
        {SCENES.map((s, i) => (
          <article key={s.k} role="tabpanel" id={`ld-panel-${s.k}`} aria-labelledby={`ld-tab-${s.k}`} hidden={i !== scene} className="ld-scene">
            <div className="ld-scene-copy">
              <h2>{t(`land.${s.k}.t` as Key)}</h2>
              <p>{t(`land.${s.k}.d` as Key, { n: WORDS.length })}</p>
            </div>
            <div className={`ld-stage ${s.tone}`} aria-hidden="true">{s.mock}</div>
          </article>
        ))}
      </section>

      <section className="ld-integ" aria-labelledby="ld-integ-title">
        <h2 id="ld-integ-title">{t("land.more.title")}</h2>
        <ul>
          {INTEGRATIONS.map((x) => (
            <li key={x.name}><span className="ld-integ-logo" aria-hidden="true">{x.icon}</span><b>{x.name}</b><span>{t(x.d)}</span></li>
          ))}
        </ul>
      </section>

      <section id="privacy" className="ld-trust" aria-labelledby="ld-trust-title">
        <h2 id="ld-trust-title">{t("land.trust.title")}</h2>
        <dl>
          {TRUST.map((k) => (
            <div key={k}><dt>{t(`land.${k}.t` as Key)}</dt><dd>{t(`land.${k}.d` as Key)}</dd></div>
          ))}
        </dl>
      </section>

      <section className="ld-start" aria-labelledby="ld-start-title">
        <div>
          <h2 id="ld-start-title">{t("land.final.title")}</h2>
          <p>{t("land.final.sub")}</p>
        </div>
        {gbtn()}
      </section>

      <Footer theme={false} />
    </div>
  );
}
