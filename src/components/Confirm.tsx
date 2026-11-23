"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ConfirmDialog } from "@achievee/ui";
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
  const back = useRef<Element | null>(null);
  useEffect(() => {
    show = (next) => { back.current = document.activeElement; setP(next); };
    return () => { show = null; };
  }, []);
  if (!p) return null;
  const close = (yes: boolean) => {
    p.resolve(yes); setP(null);
    (back.current as HTMLElement | null)?.focus?.();
  };
  return createPortal(
    <ConfirmDialog title={p.title} detail={p.detail} note={t("confirm.undo")} cancelLabel={t("common.cancel")} confirmLabel={p.ok ?? t("common.delete")}
      onCancel={() => close(false)} onConfirm={() => close(true)} />,
    document.body,
  );
}
