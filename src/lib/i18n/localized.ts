import type { Locale } from "./dictionaries";

/** Locale-aware catalogue label (shared by server and client). */
export function localized(
  locale: Locale,
  en: string | null | undefined,
  th: string | null | undefined,
): string {
  if (locale === "th") return th?.trim() || en?.trim() || "";
  return en?.trim() || th?.trim() || "";
}
