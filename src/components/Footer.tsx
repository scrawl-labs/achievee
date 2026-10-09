"use client";
import Link from "next/link";
import LanguageSelect from "./LanguageSelect";
import { useI18n } from "./I18n";

/** Site footer: legal links (and account actions when signed in) on the left, language on the right. */
export default function Footer({ onSignOut, onDelete }: { onSignOut?: () => void; onDelete?: () => void }) {
  const { t } = useI18n();
  return (
    <footer className="appfoot">
      <nav className="appfoot-links">
        <Link href="/privacy">{t("legal.privacy")}</Link>
        <Link href="/terms">{t("legal.terms")}</Link>
        {onDelete && <button type="button" onClick={onDelete}>{t("account.delete")}</button>}
      </nav>
      <div className="appfoot-end">
        {onSignOut && <button type="button" className="btn appfoot-signout" onClick={onSignOut}>{t("account.signOut")}</button>}
        <LanguageSelect />
      </div>
    </footer>
  );
}
