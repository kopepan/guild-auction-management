"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { WishlistConfirmBar } from "@/components/wishlist-confirm-bar";
import {
  WishlistItemCard,
  type WishlistCardItem,
} from "@/components/wishlist-item-card";
import {
  RegistrationSteps,
  type RegistrationStep,
} from "@/components/registration-steps";
import { WishlistMyEntries } from "@/components/wishlist-my-entries";
import { EmptyState } from "@/components/ui";
import { useT } from "@/lib/i18n/client";
import {
  QUEUE_DRAW_ORDER,
  type WishlistType,
} from "@/lib/policy";

function resolveActiveQueue(
  requested: string | null,
  gearStepComplete: boolean,
  availableTypes: WishlistType[],
): WishlistType {
  const hasGear = availableTypes.includes("gear_queue");
  const hasRandom = availableTypes.includes("random_queue");

  if (
    requested === "gear_queue" &&
    hasGear
  ) {
    return "gear_queue";
  }
  if (requested === "random_queue" && hasRandom && gearStepComplete) {
    return "random_queue";
  }

  if (!gearStepComplete && hasGear) return "gear_queue";
  if (hasRandom) return "random_queue";
  return availableTypes[0] ?? "gear_queue";
}

export function WishlistQueueTabs({
  eventId,
  items,
  gearStepComplete,
  canConfirm,
  onChanged,
}: {
  eventId: string;
  items: WishlistCardItem[];
  gearStepComplete: boolean;
  canConfirm: boolean;
  onChanged?: () => void;
}) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const availableTypes = QUEUE_DRAW_ORDER.filter((type) =>
    items.some((item) => item.wishlistType === type),
  );
  const hasGearQueue = availableTypes.includes("gear_queue");
  const hasRandomQueue = availableTypes.includes("random_queue");

  const activeType = resolveActiveQueue(
    searchParams.get("queue"),
    gearStepComplete,
    availableTypes,
  );

  const visibleItems = items
    .filter((item) => item.wishlistType === activeType)
    .slice()
    .sort((a, b) => Number(Boolean(b.registration)) - Number(Boolean(a.registration)));

  const pendingGearItem = items.find(
    (item) =>
      item.wishlistType === "gear_queue" &&
      item.registration?.status === "pending",
  );

  const currentStep: RegistrationStep =
    activeType === "gear_queue" ? "gear_queue" : "random_queue";
  const hasRegistrations = items.some((item) => item.registration);

  const stepHrefs = useMemo(() => {
    const hrefs: Partial<Record<RegistrationStep, string>> = {
      gr: "/register/gear-rating",
    };
    if (hasGearQueue) {
      hrefs.gear_queue = `${pathname}?queue=gear_queue`;
    }
    if (hasRandomQueue && gearStepComplete) {
      hrefs.random_queue = `${pathname}?queue=random_queue`;
    }
    return hrefs;
  }, [pathname, hasGearQueue, hasRandomQueue, gearStepComplete]);

  function goToQueue(queue: WishlistType) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("queue", queue);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className={canConfirm ? "pb-36" : undefined}>
      <RegistrationSteps
        current={canConfirm ? "random_queue" : currentStep}
        allComplete={canConfirm}
        hrefs={stepHrefs}
      />

      {hasRegistrations ? <WishlistMyEntries items={items} /> : null}

      {!gearStepComplete && hasGearQueue ? (
        <p className="mb-4 rounded-xl border border-moon-500/25 bg-moon-600/10 px-4 py-3 text-sm text-moon-200">
          {t("wishlist.step.gearQueueHint")}
        </p>
      ) : null}

      {gearStepComplete && activeType === "random_queue" && hasRandomQueue ? (
        <p className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          <ArrowRight className="size-4 shrink-0" aria-hidden />
          {t("wishlist.step.randomQueueUnlocked")}
        </p>
      ) : null}

      {gearStepComplete && activeType === "gear_queue" ? (
        <p className="mb-4 rounded-xl border border-moon-500/25 bg-moon-600/10 px-4 py-3 text-sm text-moon-200">
          {t("wishlist.step.editingGearQueue")}
        </p>
      ) : null}

      {canConfirm ? (
        <p className="mb-4 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          {t("wishlist.readyToConfirmHint")}
        </p>
      ) : null}

      <h2 className="mb-4 text-sm font-semibold text-white">
        {t(
          activeType === "gear_queue"
            ? "wishlist.step.gearQueue"
            : "wishlist.step.randomQueue",
        )}
      </h2>

      {visibleItems.length === 0 ? (
        <EmptyState>{t("events.noItems")}</EmptyState>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {visibleItems.map((item) => (
            <WishlistItemCard
              key={`${item.itemId}:${item.wishlistType}`}
              eventId={eventId}
              item={item}
              replaceGearFrom={
                item.wishlistType === "gear_queue" &&
                !item.registration &&
                pendingGearItem &&
                pendingGearItem.itemId !== item.itemId
                  ? { name: pendingGearItem.name }
                  : null
              }
              onChanged={onChanged}
            />
          ))}
        </ul>
      )}

      {canConfirm ? <WishlistConfirmBar eventId={eventId} /> : null}
    </div>
  );
}
