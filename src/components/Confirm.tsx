"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "./I18n";

/**
 * "Delete this?" before anything is removed for good. `askConfirm` can be called from anywhere; one <ConfirmHost />
 * (in the app shell) shows the question and resolves the promise: true on Delete, false on Cancel, Escape or a tap outside.
 */
type Ask = { title: string; detail?: string; ok?: string };
type Pending = Ask & { resolve: (yes: boolean) => void };
let show: ((p: Pending) => void) | null = null;

export function askConfirm(ask: Ask): Promise<boolean> {
  return new Promise((resolve) => (show ? show({ ...ask, resolve }) : resolve(window.confirm(ask.title))));
}

export function ConfirmHost() {
  const { t } = useI18n();
  const [p, setP] = useState<Pending | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const back = useRef<Element | null>(null);
  useEffect(() => {
    show = (next) => { back.current = document.activeElement; setP(next); };
    return () => { show = null; };
  }, []);
  useEffect(() => { if (p) cancelRef.current?.focus(); }, [p]);
  if (!p) return null;
  const close = (yes: boolean) => {
    p.resolve(yes); setP(null);
    (back.current as HTMLElement | null)?.focus?.();
  };
  return createPortal(
    <div className="cf-back" onMouseDown={(e) => { if (e.target === e.currentTarget) close(false); }}>
      <div className="cf" role="alertdialog" aria-modal="true" aria-labelledby="cf-t" aria-describedby={p.detail ? "cf-d" : undefined}
        onKeyDown={(e) => { if (e.key === "Escape") close(false); }}>
        <h3 id="cf-t">{p.title}</h3>
        {p.detail && <p id="cf-d">{p.detail}</p>}
        <small>{t("confirm.undo")}</small>
        <div className="cf-acts">
          <button type="button" ref={cancelRef} className="btn" onClick={() => close(false)}>{t("common.cancel")}</button>
          <button type="button" className="btn cf-ok" onClick={() => close(true)}>{p.ok ?? t("common.delete")}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
