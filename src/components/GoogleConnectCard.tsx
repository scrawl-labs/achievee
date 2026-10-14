"use client";
import { useEffect, useRef, useState } from "react";
import { googleCardModel, returnMessageKey, type GoogleReturn, type GoogleStatus } from "@/lib/googleStatus";
import { useI18n } from "./I18n";
import Icon from "./Icon";
import { disconnectGoogle, startGoogleConnect } from "./useGoogleStatus";

/** The Google card on the Integrations screen: connect / connected + disconnect (one inline confirm) / reconnect. */
export default function GoogleConnectCard({ status, notice }: { status: GoogleStatus | null; notice: GoogleReturn | null }) {
  const { t } = useI18n();
  const m = googleCardModel(status);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (confirming) cancelRef.current?.focus(); }, [confirming]);

  const disconnect = async () => {
    setBusy(true); setFailed(false);
    const ok = await disconnectGoogle();
    setBusy(false);
    if (!ok) return setFailed(true);
    setConfirming(false); // disconnectGoogle() already refreshed /api/integrations, /api/month and /api/events
  };

  return (
    <div className="intslot">
      <div className="intcard">
        <span className="inttile"><Icon name="calendar" /></span>
        <div className="intbody">
          <b>Google Calendar · Tasks</b>
          {m.state === "connected" && <small className="intok"><i />{t("int.connected")}</small>}
          {m.state === "revoked" && <small className="intwarn"><i />{t("gc.revoked")}</small>}
          <small className="muted">{t("gc.perm")}</small>
        </div>
        {m.action && <button className="btn primary" onClick={startGoogleConnect}>{t(m.action === "connect" ? "gc.connect" : "gc.reconnect")}</button>}
        {m.canDisconnect && !confirming && (
          <button className={m.action ? "btn ghost" : "btn danger"} aria-label={t("gc.disconnectAria")} aria-expanded={confirming} onClick={() => setConfirming(true)}>{t("int.disconnect")}</button>
        )}
      </div>
      {confirming && (
        <div className="intstate" role="group" aria-label={t("gc.disconnectAria")} onKeyDown={(e) => { if (e.key === "Escape") setConfirming(false); }}>
          <p>{t("gc.confirm")}</p>
          <div className="row gap-2">
            <button className="btn danger" disabled={busy} onClick={disconnect}>{t("int.disconnect")}</button>
            <button className="btn" ref={cancelRef} disabled={busy} onClick={() => { setConfirming(false); setFailed(false); }}>{t("common.cancel")}</button>
          </div>
        </div>
      )}
      <div className="intnote" role="status">
        {failed && <p className="error">{t("gc.disconnectFail")}</p>}
        {notice && <p className={notice === "connected" ? "intok" : "intwarn"}>{t(returnMessageKey(notice))}</p>}
      </div>
    </div>
  );
}
