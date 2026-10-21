"use client";
import { useEffect } from "react";
import { signIn } from "next-auth/react";
import { GOOGLE_HL, type Key } from "@/lib/i18n";
import { emoLang, wordText } from "@/lib/emotions";
import Blob from "./Blob";
import Footer from "./Footer";
import GCalLogo from "./GCalLogo";
import GoogleG from "./GoogleG";
import Icon from "./Icon";
import Summary from "./Summary";
import Logo from "./Logo";
import { useI18n } from "./I18n";
import { GithubMark, JiraMark, NotionMark } from "./WorkList";

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
const FLOATERS = [
  { l: "6%", t: "30%", s: 78, lv: 4, n: 5, r: -10, d: 0 }, { l: "15%", t: "56%", s: 56, lv: 3, n: 4, r: 8, d: 1.2 },
  { l: "90%", t: "17%", s: 58, lv: 2, n: 3, r: 10, d: 0.6 }, { l: "90%", t: "52%", s: 84, lv: 4, n: 6, r: -8, d: 1.8 },
];
const START_FLOATERS = [
  { l: "7%", t: "22%", s: 70, lv: 4, n: 5, r: -10, d: 0 }, { l: "17%", t: "62%", s: 48, lv: 3, n: 4, r: 8, d: 1 },
  { l: "84%", t: "20%", s: 56, lv: 2, n: 3, r: 10, d: 0.5 }, { l: "91%", t: "58%", s: 76, lv: 4, n: 6, r: -8, d: 1.6 },
];
const INTEGRATIONS: { name: string; tone: string; icon: React.ReactNode; d: Key }[] = [
  { name: "GitHub", tone: "yellow", icon: <GithubMark size={26} />, d: "land.i.gh" },
  { name: "Jira", tone: "blue", icon: <JiraMark size={26} />, d: "land.i.jira" },
  { name: "Notion", tone: "pink", icon: <NotionMark size={26} />, d: "land.i.notion" },
  { name: "Google Calendar · Tasks", tone: "green", icon: <GCalLogo size={28} />, d: "land.i.google" },
];
const TRUST = ["t1", "t2", "t3", "t4", "t5"] as const;
const LANDING_BG = "#fbf7f3";
const LANDING_BG_DARK = "#0e0f11"; // the page colour: the phone's status bar takes it, so the top of the page does not start with a black strip

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
        <b className="blk draft" style={{ top: 240 }}><small>14:00 – 15:00</small></b>
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
      <div className="sm-review">
        <small>{t("wk.tab")}</small>
        <b>{t("wk.good")}</b>
        <p>{t("land.mk.diary")}</p>
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
  const { t } = useI18n();
  return (
    <div className="sm sm-pattern">
      <b>{t("pt.exercise")}</b>
      <div className="two">
        <div><small>{t("pt.exYes")}</small><strong>4.1</strong><em>{t("pt.days", { n: 24 })}</em></div>
        <div><small>{t("pt.exNo")}</small><strong>3.5</strong><em>{t("pt.days", { n: 41 })}</em></div>
      </div>
      <p className="verdict">{t("pt.up", { label: t("pt.exSubject"), d: "0.6" })}</p>
      <div className="faint">
        <b>{t("pt.waste")}</b>
        <small>{t("pt.need", { n: 5 })}</small>
      </div>
    </div>
  );
}

const SCENES = [
  { k: "a", tone: "yellow", mock: <DayMock /> },
  { k: "b", tone: "blue", mock: <GridMock /> },
  { k: "c", tone: "pink", mock: <EmotionMock /> },
  { k: "d", tone: "green", mock: <MoneyMock /> },
  { k: "e", tone: "lav", mock: <BodyMock /> },
  { k: "f", tone: "yellow", mock: <PatternMock /> },
] as const;

export default function Landing() {
  const { t, fmt, locale } = useI18n();
  const go = () => signIn("google", undefined, { hl: GOOGLE_HL[locale] });
  const gbtn = () => (
    <button className="gbtn" onClick={go}><GoogleG size={18} />{t("login.cta")}</button>
  );

  // the browser chrome (status bar) takes the page colour, cream or charcoal; the app's own dark/light colours come back when leaving
  useEffect(() => {
    const metas = [...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')];
    const before = metas.map((m) => m.content);
    const root = document.documentElement.dataset.theme;
    const dark = root === "dark" || (root !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    metas.forEach((m) => { m.content = dark ? LANDING_BG_DARK : LANDING_BG; });
    return () => metas.forEach((m, i) => { m.content = before[i]; });
  }, []);

  return (
    <div className="land">
      <div className="hero">
        <nav className="topbar">
          <div className="brand"><Logo height={26} /></div>
          <div className="topbar-links">
            <a href="#features">{t("land.nav.f")}</a>
            <a href="#privacy">{t("land.nav.privacy")}</a>
          </div>
        </nav>

        {FLOATERS.map((f, i) => (
          <span key={i} className="floater" aria-hidden="true"
            style={{ left: f.l, top: f.t, width: f.s, height: f.s, transform: `rotate(${f.r}deg)`, animationDelay: `${f.d}s` }}>
            <Blob level={f.lv} label={f.n} />
          </span>
        ))}

        <div className="hero-copy">
          <h1>{t("login.tagline")}</h1>
          {gbtn()}
        </div>

        <div className="win" aria-hidden="true">
          <div className="win-bar"><i /><i /><i /></div>
          <div className="win-body">
            <aside className="win-side">
              {NAV.map((n, i) => (
                <span key={n.k} className={i === 0 ? "on" : ""}><Icon name={n.icon} size={16} />{t(n.k)}</span>
              ))}
            </aside>
            <div className="win-main">
              <h4>{fmt.monthYear("2026-10")}</h4>
              <Summary items={[[t("cal.rate"), "86%"], [t("cal.done"), "42 / 49"], [t("cal.streak"), t("cal.days", { n: 5 })]]} />
              <div className="win-head">{MON.map((d) => <span key={d}>{fmt.weekdayShort(d)}</span>)}</div>
              <div className="win-grid">
                {MONTH.map(([lv, n], i) => <span key={i}><Blob level={lv} label={lv ? n : ""} /></span>)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <section id="features" className="scenes">
        {SCENES.map((s, i) => (
          <article key={s.k} className={`scene${i % 2 ? " flip" : ""}`}>
            <div className="scene-copy">
              <span className="eyebrow">{t(`land.${s.k}.e` as Key)}</span>
              <h2>{t(`land.${s.k}.t` as Key)}</h2>
              <p>{t(`land.${s.k}.d` as Key)}</p>
            </div>
            <div className={`stage ${s.tone}`} aria-hidden="true">{s.mock}</div>
          </article>
        ))}
      </section>

      <section className="more">
        <h2>{t("land.more.title")}</h2>
        <ul className="integ">
          {INTEGRATIONS.map((x) => (
            <li key={x.name}><span className={`logo ${x.tone}`} aria-hidden="true">{x.icon}</span><b>{x.name}</b><small>{t(x.d)}</small></li>
          ))}
        </ul>
      </section>

      <section id="privacy" className="trustsec">
        <h2>{t("land.trust.title")}</h2>
        <dl>
          {TRUST.map((k) => (
            <div key={k}><dt>{t(`land.${k}.t` as Key)}</dt><dd>{t(`land.${k}.d` as Key)}</dd></div>
          ))}
        </dl>
      </section>

      <section className="start">
        {START_FLOATERS.map((f, i) => (
          <span key={i} className="floater" aria-hidden="true"
            style={{ left: f.l, top: f.t, width: f.s, height: f.s, transform: `rotate(${f.r}deg)`, animationDelay: `${f.d}s` }}>
            <Blob level={f.lv} label={f.n} />
          </span>
        ))}
        <h2>{t("land.final.title")}</h2>
        <p>{t("land.final.sub")}</p>
        {gbtn()}
      </section>

      <Footer />
    </div>
  );
}
