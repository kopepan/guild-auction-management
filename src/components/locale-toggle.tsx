"use client";

import { useTransition } from "react";

import { Spinner } from "@/components/spinner";
import { setLocaleAction } from "@/lib/actions/locale";
import { locales } from "@/lib/i18n/dictionaries";
import { useI18n } from "@/lib/i18n/client";

const labels: Record<string, string> = { en: "EN", th: "ไทย" };

export function LocaleToggle() {
  const { locale, t } = useI18n();
  const [pending, startTransition] = useTransition();

  return (
    <div
      className="inline-flex min-w-[4.5rem] items-center justify-center rounded-lg border border-white/15 bg-white/[0.04] p-0.5"
      role="group"
      aria-label={t("common.language")}
    >
      {pending ? (
        <span className="px-3 py-1" role="status">
          <Spinner size="sm" />
        </span>
      ) : (
        locales.map((code) => (
          <button
            key={code}
            type="button"
            aria-pressed={locale === code}
            onClick={() => startTransition(() => setLocaleAction(code))}
            className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition ${
              locale === code
                ? "bg-moon-600 text-white"
                : "text-white/60 hover:text-white"
            }`}
          >
            {labels[code] ?? code}
          </button>
        ))
      )}
    </div>
  );
}
