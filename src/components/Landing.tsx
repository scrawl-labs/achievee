"use client";
import { signIn } from "next-auth/react";
import type { Key } from "@/lib/i18n";
import Blob from "./Blob";
import Footer from "./Footer";
import GoogleG from "./GoogleG";
import Icon from "./Icon";
import Summary from "./Summary";
import Wordmark from "./Wordmark";
import { useI18n } from "./I18n";

const FEATURES: { icon: "calendar" | "chart" | "external" | "book"; t: Key; d: Key }[] = [
  { icon: "calendar", t: "land.f1.t", d: "land.f1.d" },
  { icon: "chart", t: "land.f2.t", d: "land.f2.d" },
  { icon: "external", t: "land.f3.t", d: "land.f3.d" },
  { icon: "book", t: "land.f4.t", d: "land.f4.d" },
];
const STEPS: { t: Key; d: Key }[] = [
  { t: "land.s1.t", d: "land.s1.d" }, { t: "land.s2.t", d: "land.s2.d" }, { t: "land.s3.t", d: "land.s3.d" },
];
const TRUST: { t: Key; d: Key }[] = [
  { t: "land.t1.t", d: "land.t1.d" }, { t: "land.t2.t", d: "land.t2.d" },
  { t: "land.t3.t", d: "land.t3.d" }, { t: "land.t4.t", d: "land.t4.d" },
];

// A made-up month for the hero card: level 0..4 per day (Monday first, 5 weeks).
const MOCK: number[] = [
  0, 2, 3, 4, 1, 0, 0,
  3, 4, 4, 3, 4, 2, 0,
  4, 3, 4, 4, 2, 1, 0,
  3, 4, 3, 4, 4, 0, 0,
  4, 2, 0, 0, 0, 0, 0,
];
const MOCK_DONE = [0, 2, 4, 5, 2, 0, 0, 3, 5, 6, 4, 5, 3, 0, 5, 4, 6, 5, 3, 1, 0, 4, 5, 4, 6, 5, 0, 0, 5, 3, 0, 0, 0, 0, 0];

export default function Landing() {
  const { t, fmt, locale } = useI18n();
  const go = () => signIn("google", undefined, { hl: locale });
  const cta = (
    <button className="btn primary land-cta" onClick={go}>
      <span className="gmark"><GoogleG size={16} /></span>{t("login.cta")}
    </button>
  );
  const monday = [1, 2, 3, 4, 5, 6, 0];

  return (
    <div className="land">
      <header className="land-nav">
        <div className="brand"><Wordmark height={26} /></div>
      </header>

      <section className="land-hero">
        <div className="land-copy">
          <h1>{t("login.tagline")}</h1>
          <p className="land-sub">{t("land.hero.sub")}</p>
          {cta}
          <p className="muted land-note">{t("land.hero.note")}</p>
        </div>
        <div className="land-visual" aria-hidden="true">
          <div className="mock">
            <Summary items={[[t("cal.rate"), "86%"], [t("cal.done"), "42 / 49"], [t("cal.streak"), t("cal.days", { n: 5 })]]} />
            <div className="mock-head">{monday.map((d) => <span key={d}>{fmt.weekdayShort(d)}</span>)}</div>
            <div className="mock-grid">
              {MOCK.map((lv, i) => (
                <span key={i} className="mock-cell"><Blob level={lv} label={lv ? MOCK_DONE[i] : ""} /></span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="land-sec">
        <h2>{t("land.f.title")}</h2>
        <div className="land-cards">
          {FEATURES.map((f) => (
            <article key={f.t} className="land-card">
              <span className="land-ico"><Icon name={f.icon} size={22} /></span>
              <h3>{t(f.t)}</h3>
              <p>{t(f.d)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="land-sec">
        <h2>{t("land.how.title")}</h2>
        <ol className="land-steps">
          {STEPS.map((s, i) => (
            <li key={s.t}><span className="land-num">{i + 1}</span><h3>{t(s.t)}</h3><p>{t(s.d)}</p></li>
          ))}
        </ol>
      </section>

      <section className="land-sec">
        <h2>{t("land.trust.title")}</h2>
        <div className="land-cards four">
          {TRUST.map((x) => (
            <article key={x.t} className="land-card">
              <h3>{t(x.t)}</h3>
              <p>{t(x.d)}</p>
            </article>
          ))}
        </div>
        <p className="muted land-note center">{t("login.note")}</p>
      </section>

      <section className="land-final">
        <h2>{t("land.final.title")}</h2>
        {cta}
      </section>

      <Footer />
    </div>
  );
}
