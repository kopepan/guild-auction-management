import type { WishlistCardItem } from "@/components/wishlist-item-card";
import type { Locale } from "@/lib/i18n/dictionaries";
import { localized } from "@/lib/i18n/localized";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import type { SessionUser } from "@/lib/guards";
import { itemAllowsQuantity, wishlistTypeRules } from "@/lib/policy";
import type { listWishlistRoundItems } from "@/lib/queries";

type RoundItem = Awaited<ReturnType<typeof listWishlistRoundItems>>[number];
type Penalty = { endsOn: string; reason: string | null } | null | undefined;

export function buildWishlistCards({
  locale,
  user,
  roundItems,
  penalty,
  gearLimitUsed,
}: {
  locale: Locale;
  user: Pick<SessionUser, "isActive">;
  roundItems: RoundItem[];
  penalty: Penalty;
  gearLimitUsed: boolean;
}): { cards: WishlistCardItem[]; gearStepComplete: boolean } {
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

  return { cards, gearStepComplete };
}
