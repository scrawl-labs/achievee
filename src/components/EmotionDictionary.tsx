"use client";
import { FAMILIES, emoLang, wordsOfFamily } from "@/lib/emotions";
import { useI18n } from "./I18n";

/** Browse every emotion word grouped by family, with a one-line description. Credits the research that inspired it. */
export default function EmotionDictionary() {
  const { t, locale } = useI18n();
  const lang = emoLang(locale);
  return (
    <div className="emodict">
      <p className="muted emodict-intro">{t("emo.dictIntro")}{locale !== "ko" && locale !== "en" ? ` ${t("emo.langNote")}` : ""}</p>
      {FAMILIES.map((f) => (
        <section key={f.id} className="emodict-fam">
          <h3>{f[lang]}</h3>
          <dl>
            {wordsOfFamily(f.id).map((w) => (
              <div key={w.id}><dt>{w[lang][0]}</dt><dd>{w[lang][1]}</dd></div>
            ))}
          </dl>
        </section>
      ))}

      <section className="emodict-src">
        <h3>{t("emo.sourceTitle")}</h3>
        <p>{t("emo.sourceBody")}</p>
        <ul>
          <li>
            Jung, Y., Shin, H., &amp; Bergen, B. K. (2026). <i>EVOKE: Emotion Vocabulary Of Korean and English</i>.{" "}
            <a href="https://arxiv.org/abs/2602.10414" target="_blank" rel="noreferrer">arXiv:2602.10414</a>
          </li>
          <li>
            Park, I. J., &amp; Min, K. H. (2005). 한국어 감정단어의 목록 작성과 차원 탐색 [Making a list of Korean emotion terms and exploring dimensions of emotion]. <i>Korean Journal of Social and Personality Psychology, 19</i>(1), 109–129.{" "}
            <a href="https://accesson.kr/ksppa/assets/pdf/14556/journal-19-1-109.pdf" target="_blank" rel="noreferrer">PDF</a>
          </li>
          <li>
            EVOKE dataset (CC BY-NC 4.0):{" "}
            <a href="https://github.com/yoonwonj/EVOKE" target="_blank" rel="noreferrer">github.com/yoonwonj/EVOKE</a>
          </li>
        </ul>
      </section>
    </div>
  );
}
