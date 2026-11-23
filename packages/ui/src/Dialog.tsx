import { useEffect, useRef, type ReactNode } from "react";

/**
 * Asks before something is removed for good. Escape, Cancel and a tap outside keep it; Cancel has focus first.
 * Render it only while open (portal it yourself if it must escape a clipped parent).
 */
export function ConfirmDialog({ title, detail, note, cancelLabel, confirmLabel, onCancel, onConfirm }: {
  title: string; detail?: ReactNode; note?: ReactNode; cancelLabel: string; confirmLabel: string; onCancel: () => void; onConfirm: () => void;
}) {
  const cancel = useRef<HTMLButtonElement>(null);
  useEffect(() => { cancel.current?.focus(); }, []);
  return (
    <div className="ac-dim" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="ac-dialog" role="alertdialog" aria-modal="true" aria-labelledby="ac-dialog-title" onKeyDown={(e) => { if (e.key === "Escape") onCancel(); }}>
        <h3 id="ac-dialog-title">{title}</h3>
        {detail && <p className="ac-dialog__detail">{detail}</p>}
        {note && <small className="ac-dialog__note">{note}</small>}
        <div className="ac-dialog__actions">
          <button ref={cancel} type="button" className="ac-btn" onClick={onCancel}>{cancelLabel}</button>
          <button type="button" className="ac-btn ac-btn--danger" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
