import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import type { WishlistCardItem } from "@/components/wishlist-item-card";
import { WishlistEditButton } from "@/components/wishlist-edit-button";
import { WishlistMyEntries } from "@/components/wishlist-my-entries";
import { ViewAsMemberToggle } from "@/components/view-as-member-toggle";
import { RegistrationSteps } from "@/components/registration-steps";
import { Card, PageHeader } from "@/components/ui";
import { getSessionUser } from "@/lib/guards";
import {
  requireGearRatingForRegistrationRound,
  requireWishlistConfirmedForRound,
} from "@/lib/phase";
import { isViewAsMember } from "@/lib/view-as-member";
import { getRegistrationRound, listWishlistRoundItems } from "@/lib/queries";
import { getTranslations, localized } from "@/lib/i18n/server";
import { itemAllowsQuantity } from "@/lib/policy";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

export default async function WishlistCompletePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  await requireGearRatingForRegistrationRound();
  await requireWishlistConfirmedForRound();

  const viewAsMember = user.isSystemAdmin && (await isViewAsMember());
  const { t, locale } = await getTranslations();
  const round = await getRegistrationRound();
  if (!round) redirect("/wishlist");

  const roundItems = await listWishlistRoundItems(round.id, user.id);

  const cards: WishlistCardItem[] = roundItems.flatMap((item) =>
    item.queues.map((queue) => ({
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
      blockedReason: null as TranslationKey | null,
    })),
  );

  return (
    <>
      {user.isSystemAdmin ? (
        <div className="mb-4 flex flex-wrap items-center justify-end gap-2 rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3">
          <ViewAsMemberToggle viewAsMember={viewAsMember} prominent />
        </div>
      ) : null}

      <PageHeader
        title={t("wishlist.completeTitle")}
        subtitle={t("wishlist.completeSubtitle")}
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

      <RegistrationSteps current="random_queue" allComplete />

      <Card className="border-emerald-400/25 bg-emerald-400/5">
        <div className="flex flex-wrap items-start gap-4">
          <span className="grid size-12 place-items-center rounded-2xl bg-emerald-500/20 text-emerald-200">
            <CheckCircle2 className="size-7" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-emerald-100">
              {t("wishlist.completeHeading")}
            </h2>
            <p className="mt-2 text-sm text-emerald-200/75">
              {t("wishlist.completeBody")}
            </p>
            <div className="mt-4">
              <WishlistEditButton />
            </div>
          </div>
        </div>
      </Card>

      <div className="mt-6">
        <WishlistMyEntries items={cards} />
      </div>
    </>
  );
}
