import { redirect } from "next/navigation";
import { Ban } from "lucide-react";

import type { WishlistCardItem } from "@/components/wishlist-item-card";
import { WishlistQueueTabs } from "@/components/wishlist-queue-tabs";
import { ViewAsMemberToggle } from "@/components/view-as-member-toggle";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { getSessionUser } from "@/lib/guards";
import { requireGearRatingForRegistrationRound, redirectIfWishlistConfirmedForRound } from "@/lib/phase";
import { isViewAsMember } from "@/lib/view-as-member";
import {
  getActivePenaltyForUser,
  getRegistrationRound,
  listWishlistRoundItems,
} from "@/lib/queries";
import { hasGearQueueSlotUsed } from "@/lib/gear-queue-limit";
import { canConfirmWishlist } from "@/lib/wishlist-completion";
import { getTranslations, localized } from "@/lib/i18n/server";
import { itemAllowsQuantity, wishlistTypeRules } from "@/lib/policy";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

export default async function WishlistPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  await requireGearRatingForRegistrationRound();
  await redirectIfWishlistConfirmedForRound();

  const viewAsMember = user.isSystemAdmin && (await isViewAsMember());
  const { t, locale } = await getTranslations();
  const round = await getRegistrationRound();

  if (!round) {
    return (
      <>
        <PageHeader
          title={t("wishlist.title")}
          subtitle={t("wishlist.subtitle")}
        />
        <EmptyState>{t("wishlist.noRound")}</EmptyState>
      </>
    );
  }

  const [roundItems, penalty, gearLimitUsed, confirmCheck] = await Promise.all([
    listWishlistRoundItems(round.id, user.id),
    getActivePenaltyForUser(user.id),
    hasGearQueueSlotUsed(user.id, round.id),
    canConfirmWishlist(user.id, round.id),
  ]);

  const hasGearQueueItems = roundItems.some((item) =>
    item.queues.some((queue) => queue.queueType === "gear_queue"),
  );
  const gearStepComplete = gearLimitUsed || !hasGearQueueItems;

  const cards: WishlistCardItem[] = roundItems.flatMap((item) =>
    item.queues.map((queue) => {
      const rules = wishlistTypeRules[queue.queueType];

      let blockedReason: TranslationKey | null = null;
      if (queue.myRegistration === null) {
        if (penalty) blockedReason = "error.penaltyActive";
        else if (!user.isActive) blockedReason = "error.memberInactive";
        else if (rules.countsTowardWeeklyLimit && gearLimitUsed) {
          blockedReason = "error.weeklyGearLimit";
        }
      }

      return {
        itemId: item.itemId,
        name: localized(locale, item.nameEn, item.nameTh),
        description: localized(
          locale,
          item.descriptionEn ?? "",
          item.descriptionTh,
        ),
        imageUrl: item.imageUrl,
        wishlistType: queue.queueType,
        category: item.category,
        allowsQuantity: itemAllowsQuantity(item.nameEn),
        queueLength: queue.registrationCount,
        queueEntries: queue.entries,
        registration: queue.myRegistration,
        blockedReason,
      };
    }),
  );

  return (
    <>
      {user.isSystemAdmin ? (
        <div className="mb-4 flex flex-wrap items-center justify-end gap-2 rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3">
          <ViewAsMemberToggle viewAsMember={viewAsMember} prominent />
        </div>
      ) : null}

      <PageHeader
        title={t("wishlist.title")}
        subtitle={t("wishlist.subtitle")}
        action={
          <div className="text-right">
            <p className="text-xs tracking-wide text-white/40 uppercase">
              {t("dashboard.currentRound")}
            </p>
            <p className="text-sm font-medium text-white">
              {localized(locale, round.nameEn, round.nameTh)}
            </p>
          </div>
        }
      />

      {penalty ? (
        <Card className="mb-4 border-red-400/25 bg-red-400/5">
          <div className="flex items-start gap-3">
            <Ban className="mt-0.5 size-5 shrink-0 text-red-300" aria-hidden />
            <div>
              <p className="text-sm font-medium text-red-200">
                {t("dashboard.penalized", { date: penalty.endsOn })}
              </p>
              {penalty.reason ? (
                <p className="mt-1 text-xs text-white/50">{penalty.reason}</p>
              ) : null}
            </div>
          </div>
        </Card>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        <span className="rounded-lg border border-white/10 bg-white/3 px-3 py-1.5 text-white/60">
          {t("wishlist.gearLimitHint")}
          {gearLimitUsed ? ` · ${t("wishlist.gearLimitUsed")}` : ""}
        </span>
        <span className="rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-1.5 text-amber-200/80">
          {t("wishlist.diamondWarning")}
        </span>
      </div>

      {cards.length === 0 ? (
        <EmptyState>{t("events.noItems")}</EmptyState>
      ) : (
        <WishlistQueueTabs
          eventId={round.id}
          items={cards}
          gearStepComplete={gearStepComplete}
          canConfirm={confirmCheck.ok}
        />
      )}
    </>
  );
}
