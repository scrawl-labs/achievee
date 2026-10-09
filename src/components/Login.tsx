"use client";
import { signIn } from "next-auth/react";
import Wordmark from "./Wordmark";
import GCalLogo from "./GCalLogo";
import Footer from "./Footer";
import { useI18n } from "./I18n";

export default function Login() {
  const { t, locale } = useI18n();
  return (
    <main className="login">
      <div className="login-card">
        <div className="brand"><Wordmark height={38} /></div>
        <p className="login-tag">{t("login.tagline")}</p>
        <button className="btn primary login-cta" onClick={() => signIn("google", undefined, { hl: locale })}>
          <GCalLogo size={18} />{t("login.cta")}
        </button>
        <p className="muted login-note">{t("login.note")}</p>
      </div>
      <Footer />
    </main>
  );
}
