"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  createTranslator,
  defaultLocale,
  type Locale,
  type TranslationKey,
  type Translator,
} from "./dictionaries";

type LocaleContextValue = { locale: Locale; t: Translator };

const LocaleContext = createContext<LocaleContextValue>({
  locale: defaultLocale,
  t: createTranslator(defaultLocale),
});

export function LocaleProvider({
  locale: localeFromBootstrap,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const [locale, setLocale] = useState<Locale>(localeFromBootstrap);

  useEffect(() => {
    setLocale(localeFromBootstrap);
  }, [localeFromBootstrap]);

  const value = useMemo(
    () => ({ locale, t: createTranslator(locale) }),
    [locale],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useI18n() {
  return useContext(LocaleContext);
}

export function useT(): Translator {
  return useContext(LocaleContext).t;
}

export type { Locale, TranslationKey };
