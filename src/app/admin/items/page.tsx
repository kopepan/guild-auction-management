import Link from "next/link";
import { Plus, Users } from "lucide-react";

import { EmptyState, ItemThumb, PageHeader, StatusBadge } from "@/components/ui";
import { listAllItems } from "@/lib/queries";
import { getTranslations, localized } from "@/lib/i18n/server";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { normalizeWishlistTypes } from "@/lib/policy";

export default async function AdminItemsPage() {
  const { t, locale } = await getTranslations();
  const items = await listAllItems({ includeInactive: true });

  return (
    <>
      <PageHeader
        title={t("adminItems.title")}
        subtitle={t("adminItems.subtitle")}
        action={
          <Link href="/admin/items/new" className="btn-primary">
            <Plus className="size-4" aria-hidden />
            {t("adminItems.new")}
          </Link>
        }
      />

      {items.length === 0 ? (
        <EmptyState>{t("items.emptyAdmin")}</EmptyState>
      ) : (
        <ul className="card divide-y divide-white/6">
          {items.map((item) => {
            const name = localized(locale, item.nameEn, item.nameTh);
            const queueTypes = normalizeWishlistTypes(item.queueTypes);
            return (
              <li key={item.id} className="flex items-center gap-3 p-4">
                <ItemThumb src={item.imageUrl} alt={name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-sm font-medium text-white">
                    {name}
                    {!item.isActive ? (
                      <StatusBadge status="inactive" label={t("common.inactive")} />
                    ) : null}
                  </p>
                  <p className="text-xs text-white/40">
                    {t(`item.category.${item.category}` as TranslationKey)}
                    {item.nameTh && item.nameEn !== name ? ` · ${item.nameEn}` : ""}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {queueTypes.map((queueType) => (
                      <StatusBadge
                        key={queueType}
                        status={queueType}
                        label={t(
                          `wishlistType.${queueType}` as TranslationKey,
                        )}
                      />
                    ))}
                  </div>
                </div>
                <span
                  className="inline-flex shrink-0 items-center gap-1.5 text-xs text-white/50"
                  title={t("items.inQueue", { count: item.registrationCount })}
                >
                  <Users className="size-3.5" aria-hidden />
                  {item.registrationCount}
                </span>
                <Link
                  href={`/admin/items/${item.id}`}
                  className="btn-ghost btn-sm shrink-0"
                >
                  {t("common.edit")}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
