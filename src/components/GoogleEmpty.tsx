"use client";
import type { GoogleStatus } from "@/lib/googleStatus";
import { useI18n } from "./I18n";
import Icon from "./Icon";
import { startGoogleConnect } from "./useGoogleStatus";

/** Quiet empty state for the Google Calendar tab when Google is not (or no longer) connected. */
export default function GoogleEmpty({ status }: { status: Exclude<GoogleStatus, "connected"> }) {
  const { t } = useI18n();
  return (
    <div className="gempty" role="status">
      <span className="inttile"><Icon name="calendar" /></span>
      <p>{status === "none" ? t("gc.emptyNone") : t("gc.revoked")}</p>
      <button className="btn primary" onClick={startGoogleConnect}>{t(status === "none" ? "gc.connect" : "gc.reconnect")}</button>
    </div>
  );
}
