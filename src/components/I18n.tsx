"use client";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { DICT, type Key, type Locale, makeFormat } from "@/lib/i18n";

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (k: Key, vars?: Record<string, string | number>) => string;
  fmt: ReturnType<typeof makeFormat>;
};
const I18nCtx = createContext<Ctx | null>(null);

export function I18nProvider({ initial, children }: { initial: Locale; children: React.ReactNode }) {
  const [locale, set] = useState<Locale>(initial);
  const setLocale = useCallback((l: Locale) => {
    set(l);
    document.cookie = `locale=${l};path=/;max-age=31536000;samesite=lax`;
    document.documentElement.lang = l;
  }, []);
  const value = useMemo<Ctx>(() => ({
    locale, setLocale, fmt: makeFormat(locale),
    t: (k, vars) => DICT[locale][k].replace(/\{(\w+)\}/g, (_, n) => String(vars?.[n] ?? "")),
  }), [locale, setLocale]);
  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export const useI18n = () => useContext(I18nCtx)!;
