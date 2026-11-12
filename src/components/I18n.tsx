"use client";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { DICT, HTML_LANG, type Currency, type Key, type Locale, defaultCurrency, makeFormat } from "@/lib/i18n";

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  currency: Currency;
  setCurrency: (c: Currency) => void;
  t: (k: Key, vars?: Record<string, string | number>) => string;
  fmt: ReturnType<typeof makeFormat>;
};
const I18nCtx = createContext<Ctx | null>(null);

export function I18nProvider({ initial, initialCurrency, children }: { initial: Locale; initialCurrency?: Currency; children: React.ReactNode }) {
  const [locale, set] = useState<Locale>(initial);
  const [chosen, setChosen] = useState<Currency | undefined>(initialCurrency); // undefined = follow the language until one is chosen
  const currency = chosen ?? defaultCurrency(locale);
  const setCurrency = useCallback((c: Currency) => {
    setChosen(c);
    document.cookie = `currency=${c};path=/;max-age=31536000;samesite=lax`;
  }, []);
  const setLocale = useCallback((l: Locale) => {
    set(l);
    document.cookie = `locale=${l};path=/;max-age=31536000;samesite=lax`;
    document.documentElement.lang = HTML_LANG[l];
  }, []);
  const value = useMemo<Ctx>(() => ({
    locale, setLocale, currency, setCurrency, fmt: makeFormat(locale, currency),
    t: (k, vars) => DICT[locale][k].replace(/\{(\w+)\}/g, (_, n) => String(vars?.[n] ?? "")),
  }), [locale, setLocale, currency, setCurrency]);
  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export const useI18n = () => useContext(I18nCtx)!;
