import { cookies } from "next/headers";

import {
  createTranslator,
  defaultLocale,
  isLocale,
  type Locale,
  type Translator,
} from "./dictionaries";
import { localized } from "./localized";

export { localized };

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
