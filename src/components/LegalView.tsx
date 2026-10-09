"use client";
import Link from "next/link";
import { PRIVACY, PRIVACY_UPDATED } from "@/lib/legal";
import { TERMS, TERMS_UPDATED } from "@/lib/terms";
import { Brand } from "./Icon";
import LanguageSelect from "./LanguageSelect";
import { useI18n } from "./I18n";

const URL_RE = /(https?:\/\/[^\s)]+)/g;
const linkify = (text: string) =>
  text.split(URL_RE).map((part, i) => (i % 2 ? <a key={i} href={part} target="_blank" rel="noreferrer">{part}</a> : part));

export default function LegalView({ kind, contact }: { kind: "privacy" | "terms"; contact: string }) {
  const { locale } = useI18n();
  const doc = (kind === "privacy" ? PRIVACY : TERMS)[locale];
  const updated = kind === "privacy" ? PRIVACY_UPDATED : TERMS_UPDATED;
  return (
    <main className="legal">
      <header>
        <Link href="/" className="brand"><Brand /><span>Achievee</span></Link>
      </header>
      <h1>{doc.title}</h1>
      <p className="muted">{doc.updated}: {updated}</p>
      {doc.sections.map((s) => (
        <section key={s.h}>
          <h2>{s.h}</h2>
          {s.p.map((p, i) => <p key={i}>{linkify(p.replace("{contact}", contact))}</p>)}
        </section>
      ))}
      <footer><LanguageSelect /></footer>
    </main>
  );
}
