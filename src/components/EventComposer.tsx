"use client";
import { Button, Checkbox, Chip, ChipRow, Field } from "@achievee/ui";
import type { EventKind } from "@/lib/nativeEvents";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "./I18n";

/** Small popover for naming a new event or to-do, or renaming / deleting an own event. Enter saves, Esc closes. */
export default function EventComposer({ initial = "", when, onSave, onCancel, onDelete, align = "left", top, placeholder, kind: initialKind, offerSameTitle }: {
  initial?: string; when: string; onSave: (title: string, kind?: EventKind, sameTitle?: boolean) => Promise<boolean>; onCancel: () => void;
  onDelete?: () => Promise<boolean>; align?: "left" | "right"; top: number | string; placeholder?: string;
  /** Own events only: an appointment shows in Upcoming, a plan block does not. Omit for to-dos. */
  kind?: EventKind;
  /** Editing: once the kind is switched, offer to switch every event with the same title too (for events made before kinds). */
  offerSameTitle?: boolean;
}) {
  const { t } = useI18n();
  const [title, setTitle] = useState(initial);
  const [kind, setKind] = useState<EventKind | undefined>(initialKind);
  const [sameTitle, setSameTitle] = useState(false);
  const kindChanged = offerSameTitle && kind !== initialKind;
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const form = useRef<HTMLFormElement>(null);
  // a chip click leaves focus on the input, so Enter still saves
  const pick = (k: EventKind) => { setKind(k); input.current?.focus({ preventScroll: true }); };
  // focus without scrolling, then bring the whole popover into view (it can open near the bottom of the time grid)
  useEffect(() => { input.current?.focus({ preventScroll: true }); input.current?.select(); form.current?.scrollIntoView?.({ block: "nearest" }); }, []);

  const run = async (job: () => Promise<boolean>) => {
    setBusy(true); setFailed(false);
    const ok = await job();
    setBusy(false);
    if (!ok) setFailed(true);
  };
  const label = placeholder ?? t("ev.titlePh");
  return (
    <form ref={form} className="composer" style={{ top, [align]: 2 }} role="dialog" aria-label={when}
      onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); onCancel(); } }}
      onSubmit={(e) => { e.preventDefault(); if (title.trim() && !busy) run(() => onSave(title.trim(), kind, kindChanged && sameTitle)); }}>
      <Field ref={input} value={title} maxLength={200} placeholder={label} aria-label={label} onChange={(e) => setTitle(e.target.value)} />
      {kind && (
        <ChipRow className="composer-kind" role="group" aria-label={t("ev.kind")}>
          <Chip selected={kind === "appointment"} onClick={() => pick("appointment")}>{t("ev.appointment")}</Chip>
          <Chip selected={kind === "plan"} onClick={() => pick("plan")}>{t("ev.plan")}</Chip>
        </ChipRow>
      )}
      {kindChanged && (
        <label className="composer-same"><Checkbox shape="square" checked={sameTitle} onChange={(e) => setSameTitle(e.target.checked)} />{t("ev.sameTitle")}</label>
      )}
      <small className="muted">{when}{kind && ` · ${kind === "appointment" ? t("ev.appointmentHint") : t("ev.planHint")}`}</small>
      {failed && <small className="error">{t("common.loadFail")}</small>}
      <div className="composer-actions">
        {onDelete && <Button variant="danger" type="button" disabled={busy} onClick={() => run(onDelete)}>{t("common.delete")}</Button>}
        <span className="grow" />
        <Button type="button" onClick={onCancel}>{t("common.cancel")}</Button>
        <Button variant="primary" type="submit" disabled={busy || !title.trim()}>{t("common.save")}</Button>
      </div>
    </form>
  );
}
