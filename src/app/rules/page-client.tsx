"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";

import { Card, EmptyState, PageHeader, SectionTitle } from "@/components/ui";
import { PageLoader } from "@/components/spinner";
import { useT, useI18n } from "@/lib/i18n/client";
import { localized } from "@/lib/i18n/localized";
import { WISHLIST_TYPES } from "@/lib/policy";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { usePageData } from "@/lib/use-page-data";

type RulesData = {
  isAdmin: boolean;
  valueEn: string | null;
  valueTh: string | null;
};

export default function RulesClient() {
  const state = usePageData<RulesData>("/rules");
  const t = useT();
  const { locale } = useI18n();

  if (state.status === "loading" || state.status === "redirect") {
    return <PageLoader />;
  }
  if (state.status === "notFound") {
    return null;
  }

  const { isAdmin, valueEn, valueTh } = state.data;
  const text = localized(locale, valueEn, valueTh);

  return (
    <>
      <PageHeader
        title={t("rules.title")}
        action={
          isAdmin ? (
            <Link href="/admin/rules" className="btn-ghost btn-sm">
              <Pencil className="size-4" aria-hidden />
              {t("common.edit")}
            </Link>
          ) : undefined
        }
      />
      <div className="max-w-3xl space-y-4">
        {text ? (
          <Card>
            <div className="text-sm leading-relaxed whitespace-pre-line text-white/80">
              {text}
            </div>
          </Card>
        ) : (
          <EmptyState>{t("rules.empty")}</EmptyState>
        )}

        <Card>
          <SectionTitle>{t("items.orderingRule")}</SectionTitle>
          <dl className="space-y-3">
            {WISHLIST_TYPES.map((type) => (
              <div key={type}>
                <dt className="text-sm font-medium text-white/85">
                  {t(`wishlistType.${type}` as TranslationKey)}
                </dt>
                <dd className="mt-0.5 text-xs text-white/50">
                  {t(`wishlistType.${type}.hint` as TranslationKey)}
                </dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>
    </>
  );
}
