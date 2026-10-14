"use client";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "./I18n";

/** Small popover for naming a new event, or renaming / deleting an own one. Enter saves, Esc closes. */
export default function EventComposer({ initial = "", when, onSave, onCancel, onDelete, align = "left", top }: {
  initial?: string; when: string; onSave: (title: string) => Promise<boolean>; onCancel: () => void;
  onDelete?: () => Promise<boolean>; align?: "left" | "right"; top: number;
}) {
  const { t } = useI18n();
  const [title, setTitle] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { input.current?.focus(); input.current?.select(); }, []);

  const run = async (job: () => Promise<boolean>) => {
    setBusy(true); setFailed(false);
    const ok = await job();
    setBusy(false);
    if (!ok) setFailed(true);
  };
  return (
    <form className="composer" style={{ top, [align]: 2 }} role="dialog" aria-label={when}
      onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); onCancel(); } }}
      onSubmit={(e) => { e.preventDefault(); if (title.trim() && !busy) run(() => onSave(title.trim())); }}>
      <input ref={input} value={title} maxLength={200} placeholder={t("ev.titlePh")} aria-label={t("ev.titlePh")} onChange={(e) => setTitle(e.target.value)} />
      <small className="muted">{when}</small>
      {failed && <small className="error">{t("common.loadFail")}</small>}
      <div className="composer-actions">
        {onDelete && <button type="button" className="btn danger" disabled={busy} onClick={() => run(onDelete)}>{t("common.delete")}</button>}
        <span className="grow" />
        <button type="button" className="btn" onClick={onCancel}>{t("common.cancel")}</button>
        <button className="btn primary" disabled={busy || !title.trim()}>{t("common.save")}</button>
      </div>
    </form>
  );
}
