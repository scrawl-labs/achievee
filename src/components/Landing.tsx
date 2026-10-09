"use client";
import { signIn } from "next-auth/react";
import { GOOGLE_HL, type Key } from "@/lib/i18n";
import Blob from "./Blob";
import Footer from "./Footer";
import GoogleG from "./GoogleG";
import Icon from "./Icon";
import Summary from "./Summary";
import Wordmark from "./Wordmark";
import { useI18n } from "./I18n";

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
const STEPS: { t: Key; d: Key }[] = [
  { t: "land.s1.t", d: "land.s1.d" }, { t: "land.s2.t", d: "land.s2.d" }, { t: "land.s3.t", d: "land.s3.d" },
];
const TRUST: { t: Key; d: Key }[] = [
  { t: "land.t1.t", d: "land.t1.d" }, { t: "land.t2.t", d: "land.t2.d" },
  { t: "land.t3.t", d: "land.t3.d" }, { t: "land.t4.t", d: "land.t4.d" },
];

export default function Landing() {
  const { t, fmt, locale } = useI18n();
  const go = () => signIn("google", undefined, { hl: GOOGLE_HL[locale] });
  const gbtn = (cls = "") => (
    <button className={`gbtn ${cls}`} onClick={go}><GoogleG size={18} />{t("login.cta")}</button>
  );

  return (
    <div className="land">
      <div className="hero">
        <nav className="topbar">
          <div className="brand"><Wordmark height={24} /></div>
          <div className="topbar-links">
            <a href="#features">{t("land.nav.f")}</a>
            <a href="#how">{t("land.nav.how")}</a>
            <a href="#privacy">{t("land.nav.privacy")}</a>
          </div>
          {gbtn("small")}
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

      <section id="features" className="sec">
        <h2>{t("land.f.title")}</h2>
        <div className="cards">
          <article className="card yellow">
            <h3>{t("land.f1.t")}</h3><p>{t("land.f1.d")}</p>
            <div className="mini badges">{[2, 3, 4, 4, 1, 3, 4].map((lv, i) => <span key={i}><Blob level={lv} label={lv + 1} /></span>)}</div>
          </article>
          <article className="card green">
            <h3>{t("land.f2.t")}</h3><p>{t("land.f2.d")}</p>
            <div className="mini bars">
              {[55, 90, 100, 80, 35, 20, 10].map((h, i) => <i key={i} style={{ height: `${h}%`, background: i < 4 ? "var(--c3)" : "var(--c2)" }} />)}
            </div>
          </article>
          <article className="card blue">
            <h3>{t("land.f3.t")}</h3><p>{t("land.f3.d")}</p>
            <div className="mini events">
              <span style={{ ["--ev" as string]: "#7c8cff" }}><b>10:00</b>{t("land.mock.e1")}</span>
              <span style={{ ["--ev" as string]: "#34a853" }}><b>13:30</b>{t("land.mock.e2")}</span>
              <span style={{ ["--ev" as string]: "#f6a623" }}><b>19:00</b>{t("land.mock.e3")}</span>
            </div>
          </article>
          <article className="card pink">
            <h3>{t("land.f4.t")}</h3><p>{t("land.f4.d")}</p>
            <div className="mini note">
              <div className="note-dots"><i className="on" /><i className="on" /><i className="on" /><i className="on" /><i /></div>
              <b>{t("land.mock.note")}</b>
              <em>{fmt.money(12800)}</em>
            </div>
          </article>
        </div>
      </section>

      <section id="how" className="sec center">
        <h2>{t("land.how.title")}</h2>
        <ol className="steps">
          {STEPS.map((s, i) => (
            <li key={s.t}><span>{i + 1}</span><h3>{t(s.t)}</h3><p>{t(s.d)}</p></li>
          ))}
        </ol>
      </section>

      <section id="privacy" className="band">
        <h2>{t("land.trust.title")}</h2>
        <div className="trust">
          {TRUST.map((x) => (
            <article key={x.t}><h3>{t(x.t)}</h3><p>{t(x.d)}</p></article>
          ))}
        </div>
        <small>{t("login.note")}</small>
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
