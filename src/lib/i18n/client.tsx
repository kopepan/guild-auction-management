"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

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
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
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
