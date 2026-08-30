import { cookies } from "next/headers";

import {
  createTranslator,
  defaultLocale,
  isLocale,
  type Locale,
  type Translator,
} from "./dictionaries";

export const LOCALE_COOKIE = "moonshade_locale";

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : defaultLocale;
}

export async function getTranslations(): Promise<{
  locale: Locale;
  t: Translator;
}> {
  const locale = await getLocale();
  return { locale, t: createTranslator(locale) };
}

/**
 * Picks the Thai text when the user reads Thai and it exists, otherwise falls
 * back to English so a half-translated catalogue still renders sensibly.
 */
export function localized(
  locale: Locale,
  en: string | null | undefined,
  th: string | null | undefined,
): string {
  if (locale === "th") return th?.trim() || en?.trim() || "";
  return en?.trim() || th?.trim() || "";
}
