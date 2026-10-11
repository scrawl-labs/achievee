"use client";
import { useState } from "react";
import { FAMILIES, MAX_EMOTIONS, emoLang, wordById, wordText, wordsOfFamily } from "@/lib/emotions";
import { useI18n } from "./I18n";

/**
 * "What exactly am I feeling?" — pick up to 3 emotion words. Tapping a word selects it and shows what it means,
 * plus a few similar-but-different words, so "서운해" can become "아쉬웠어" or "불안했어" when that is closer.
 */
export default function EmotionPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const { t, locale } = useI18n();
  const lang = emoLang(locale);
  const [open, setOpen] = useState(false);
  const [fam, setFam] = useState(FAMILIES[0].id);
  const [focus, setFocus] = useState<string | null>(null);

  const pick = (id: string) => {
    const w = wordById(id);
    if (!w) return;
    setFam(w.family);
    setFocus(id);
    if (value.includes(id)) onChange(value.filter((x) => x !== id));
    else if (value.length < MAX_EMOTIONS) onChange([...value, id]);
  };
  const toggle = (id: string) => {
    if (value.includes(id)) onChange(value.filter((x) => x !== id));
    else if (value.length < MAX_EMOTIONS) onChange([...value, id]);
  };
  const focused = focus ? wordById(focus) : null;
  const full = value.length >= MAX_EMOTIONS;

  return (
    <section className="emo">
      <div className="emo-head">
        <h3>{t("emo.title")}</h3>
        <small>{t("emo.hint")}</small>
      </div>

      <div className="emo-sel">
        {value.map((id) => (
          <button key={id} type="button" className="emo-chip on" onClick={() => onChange(value.filter((x) => x !== id))} title={t("common.delete")}>
            {wordText(id, lang)}<span aria-hidden="true">×</span>
          </button>
        ))}
        <button type="button" className="btn" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? t("common.close") : t("emo.pick")}</button>
        {locale !== "ko" && locale !== "en" && <small className="muted">{t("emo.langNote")}</small>}
      </div>

      {open && (
        <div className="emo-panel">
          <div className="emo-fams" role="tablist">
            {FAMILIES.map((f) => (
              <button key={f.id} role="tab" aria-selected={fam === f.id} type="button" className={fam === f.id ? "on" : ""} onClick={() => setFam(f.id)}>{f[lang]}</button>
            ))}
          </div>
          <div className="emo-words">
            {wordsOfFamily(fam).map((w) => {
              const on = value.includes(w.id);
              return (
                <button key={w.id} type="button" className={`emo-chip${on ? " on" : ""}${focus === w.id ? " focus" : ""}`} disabled={!on && full} onClick={() => pick(w.id)}>
                  {w[lang][0]}
                </button>
              );
            })}
          </div>
          {full && <small className="muted">{t("emo.max")}</small>}
          {focused && (
            <div className="emo-desc">
              <b>{focused[lang][0]}</b>
              <p>{focused[lang][1]}</p>
              {focused.near && (
                <div className="emo-near">
                  <small>{t("emo.near")}</small>
                  {focused.near.map((id) => {
                    const w = wordById(id);
                    if (!w) return null;
                    const on = value.includes(id);
                    return (
                      <div className="emo-nearrow" key={id}>
                        <div><b>{w[lang][0]}</b><span>{w[lang][1]}</span></div>
                        <button type="button" className={`btn${on ? " primary" : ""}`} disabled={!on && full} onClick={() => toggle(id)}>
                          {on ? t("emo.chosen") : t("emo.choose")}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
