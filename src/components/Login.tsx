"use client";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Brand } from "./Icon";
import GCalLogo from "./GCalLogo";
import LanguageSelect from "./LanguageSelect";
import { useI18n } from "./I18n";

export default function Login() {
  const { t } = useI18n();
  return (
    <main className="login">
      <div className="login-card">
        <div className="brand"><Brand size={36} /><span>Achievee</span></div>
        <p className="login-tag">{t("login.tagline")}</p>
        <button className="btn primary login-cta" onClick={() => signIn("google")}>
          <GCalLogo size={18} />{t("login.cta")}
        </button>
        <p className="muted login-note">{t("login.note")}</p>
        <LanguageSelect />
        <Link className="muted login-note" href="/privacy">{t("legal.privacy")}</Link>
      </div>
    </main>
  );
}
