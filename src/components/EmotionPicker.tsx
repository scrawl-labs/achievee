"use client";
import { useState } from "react";
import { FAMILIES, MAX_EMOTIONS, type Energy, type Focus, type Intensity, type Lean, emoLang, familyById, rankWords, wordById, wordText, wordsOfFamily } from "@/lib/emotions";
import type { Key } from "@/lib/i18n";
import { useI18n } from "./I18n";

const Q: { title: Key; opts: [string, Key][] }[] = [
  { title: "emo.q1", opts: [["pos", "emo.q1pos"], ["neg", "emo.q1neg"], ["mixed", "emo.q1mixed"]] },
  { title: "emo.q2", opts: [["self", "emo.q2self"], ["other", "emo.q2other"], ["situation", "emo.q2situation"], ["skip", "emo.skip"]] },
  { title: "emo.q3", opts: [["high", "emo.q3high"], ["low", "emo.q3low"], ["skip", "emo.skip"]] },
  { title: "emo.q4", opts: [["mild", "emo.q4mild"], ["strong", "emo.q4strong"], ["skip", "emo.skip"]] },
];
const PAGE = 6;

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
  const [mode, setMode] = useState<"ask" | "browse">("ask");
  const [ans, setAns] = useState<{ lean?: Lean; focus?: Focus | "skip"; energy?: Energy | "skip"; intensity?: Intensity | "skip" }>({});
  const [pages, setPages] = useState(1);
  const total = ans.lean === "mixed" ? 3 : 4; // "how strong" says little when the feeling is mixed
  const step = !ans.lean ? 1 : !ans.focus ? 2 : !ans.energy ? 3 : total === 4 && !ans.intensity ? 4 : 5;
  const ranked = step === 5
    ? rankWords({ lean: ans.lean!, focus: ans.focus === "skip" ? undefined : ans.focus, energy: ans.energy === "skip" ? undefined : ans.energy, intensity: ans.intensity === "skip" ? undefined : ans.intensity })
    : [];
  const results = ranked.slice(0, PAGE * pages);
  const back = () => setAns(ans.intensity ? { ...ans, intensity: undefined } : ans.energy ? { ...ans, energy: undefined } : ans.focus ? { ...ans, focus: undefined } : {});
  const restart = () => { setAns({}); setPages(1); };

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
      </div>

      {open && (
        <div className="emo-panel">
          <div className="emo-fams" role="tablist">
            <button role="tab" aria-selected={mode === "ask"} type="button" className={mode === "ask" ? "on" : ""} onClick={() => setMode("ask")}>{t("emo.help")}</button>
            <button role="tab" aria-selected={mode === "browse"} type="button" className={mode === "browse" ? "on" : ""} onClick={() => setMode("browse")}>{t("emo.browse")}</button>
          </div>
          {mode === "ask" ? (
            <div className="emo-ask">
              {step <= 4 ? (
                <>
                  <div className="emo-step"><small>{step} / {total}</small><b>{t(Q[step - 1].title)}</b></div>
                  <div className="emo-opts">
                    {Q[step - 1].opts.map(([k, label]) => (
                      <button key={k} type="button" className="btn" onClick={() => setAns(step === 1 ? { lean: k as Lean } : step === 2 ? { ...ans, focus: k as Focus | "skip" } : step === 3 ? { ...ans, energy: k as Energy | "skip" } : { ...ans, intensity: k as Intensity | "skip" })}>{t(label)}</button>
                    ))}
                  </div>
                  {step > 1 && <button type="button" className="btn ghost emo-back" onClick={back}>{t("emo.back")}</button>}
                </>
              ) : (
                <>
                  <small className="muted">{t("emo.helpResult")}</small>
                  <div className="emo-near">
                    {results.map((w) => {
                      const on = value.includes(w.id);
                      return (
                        <div className="emo-nearrow" key={w.id}>
                          <div><b>{w[lang][0]}<small className="muted"> · {familyById(w.family)?.[lang]}</small></b><span>{w[lang][1]}</span></div>
                          <button type="button" className={`btn${on ? " primary" : ""}`} disabled={!on && full} onClick={() => toggle(w.id)}>{on ? t("emo.chosen") : t("emo.choose")}</button>
                        </div>
                      );
                    })}
                  </div>
                  {full && <small className="muted">{t("emo.max")}</small>}
                  {ranked.length > results.length && <button type="button" className="btn ghost emo-back" onClick={() => setPages(pages + 1)}>{t("emo.more")}</button>}
                  <button type="button" className="btn ghost emo-back" onClick={() => setMode("browse")}>{t("emo.noneFit")}</button>
                  <button type="button" className="btn ghost emo-back" onClick={restart}>{t("emo.again")}</button>
                </>
              )}
            </div>
          ) : (
            <>
          <div className="emo-fams" role="tablist">
            {FAMILIES.map((f) => (
              <button key={f.id} role="tab" aria-selected={fam === f.id} type="button" className={fam === f.id ? "on" : ""} onClick={() => { setFam(f.id); setFocus(wordsOfFamily(f.id)[0]?.id ?? null); }}>{f[lang]}</button>
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
            </>
          )}
        </div>
      )}
    </section>
  );
}
