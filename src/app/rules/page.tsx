import Link from "next/link";
import { Pencil } from "lucide-react";

import { Card, EmptyState, PageHeader, SectionTitle } from "@/components/ui";
import { SETTING_KEYS } from "@/db/schema";
import { getSessionUser } from "@/lib/guards";
import { redirectMemberDuringRegistration } from "@/lib/phase";
import { getSetting } from "@/lib/queries";
import { getTranslations, localized } from "@/lib/i18n/server";
import { WISHLIST_TYPES } from "@/lib/policy";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

export default async function RulesPage() {
  await redirectMemberDuringRegistration();
  const [{ t, locale }, user, setting] = await Promise.all([
    getTranslations(),
    getSessionUser(),
    getSetting(SETTING_KEYS.rules),
  ]);

  const text = localized(locale, setting?.valueEn, setting?.valueTh);

  return (
    <>
      <PageHeader
        title={t("rules.title")}
        action={
          user?.role === "admin" ? (
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
