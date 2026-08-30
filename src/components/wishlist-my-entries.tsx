"use client";

import { useT } from "@/lib/i18n/client";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { ItemThumb, StatusBadge } from "@/components/ui";
import type { WishlistCardItem } from "@/components/wishlist-item-card";

export function WishlistMyEntries({ items }: { items: WishlistCardItem[] }) {
  const t = useT();
  const mine = items.filter((item) => item.registration);

  if (mine.length === 0) return null;

  return (
    <section className="mb-6 rounded-xl border border-emerald-400/25 bg-emerald-400/5 p-4">
      <h2 className="text-sm font-semibold text-emerald-100">
        {t("wishlist.myEntriesSummary")}
      </h2>
      <p className="mt-1 text-xs text-emerald-200/70">
        {t("wishlist.myEntriesSummaryHint")}
      </p>
      <ul className="mt-4 space-y-2">
        {mine.map((item) => {
          const entry = item.registration!;
          return (
            <li
              key={`${item.itemId}:${item.wishlistType}`}
              className="flex items-center gap-3 rounded-lg border border-white/10 bg-night-950/40 px-3 py-2.5"
            >
              <ItemThumb src={item.imageUrl} alt={item.name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">
                  {item.name}
                  {entry.quantityRequested > 1
                    ? ` ×${entry.quantityRequested}`
                    : ""}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <StatusBadge
                    status={item.wishlistType}
                    label={t(
                      `wishlistType.${item.wishlistType}` as TranslationKey,
                    )}
                  />
                  <span className="text-xs text-white/45">
                    {entry.position != null
                      ? t("wishlist.position", {
                          position: entry.position,
                          total: item.queueLength,
                        })
                      : t("wishlist.positionPending")}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
