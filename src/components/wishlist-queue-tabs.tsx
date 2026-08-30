"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

import {
  WishlistItemCard,
  type WishlistCardItem,
} from "@/components/wishlist-item-card";
import { RegistrationSteps } from "@/components/registration-steps";
import { WishlistMyEntries } from "@/components/wishlist-my-entries";
import { EmptyState } from "@/components/ui";
import { useT } from "@/lib/i18n/client";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import {
  QUEUE_DRAW_ORDER,
  type WishlistType,
} from "@/lib/policy";

export function WishlistQueueTabs({
  eventId,
  items,
  gearStepComplete,
}: {
  eventId: string;
  items: WishlistCardItem[];
  gearStepComplete: boolean;
}) {
  const t = useT();
  const availableTypes = QUEUE_DRAW_ORDER.filter((type) =>
    items.some((item) => item.wishlistType === type),
  );
  const hasGearQueue = availableTypes.includes("gear_queue");
  const hasRandomQueue = availableTypes.includes("random_queue");

  const unlockedTypes = gearStepComplete
    ? availableTypes
    : availableTypes.filter((type) => type === "gear_queue");

  const defaultTab: WishlistType = gearStepComplete
    ? hasRandomQueue
      ? "random_queue"
      : (unlockedTypes[0] ?? "gear_queue")
    : "gear_queue";

  const [activeType, setActiveType] = useState<WishlistType>(defaultTab);

  useEffect(() => {
    if (gearStepComplete && activeType === "gear_queue" && hasRandomQueue) {
      setActiveType("random_queue");
    }
  }, [gearStepComplete, activeType, hasRandomQueue]);

  useEffect(() => {
    if (!unlockedTypes.includes(activeType)) {
      setActiveType(unlockedTypes[0] ?? "gear_queue");
    }
  }, [activeType, unlockedTypes]);

  const visibleItems = items.filter(
    (item) => item.wishlistType === activeType,
  );

  const currentStep = gearStepComplete ? "random_queue" : "gear_queue";
  const hasRegistrations = items.some((item) => item.registration);
  const allStepsComplete = gearStepComplete && hasRegistrations;

  return (
    <div>
      <RegistrationSteps
        current={allStepsComplete ? "random_queue" : currentStep}
        allComplete={allStepsComplete}
      />

      {hasRegistrations ? <WishlistMyEntries items={items} /> : null}

      {!gearStepComplete && hasGearQueue ? (
        <p className="mb-4 rounded-xl border border-moon-500/25 bg-moon-600/10 px-4 py-3 text-sm text-moon-200">
          {t("wishlist.step.gearQueueHint")}
        </p>
      ) : null}

      {gearStepComplete && hasRandomQueue ? (
        <p className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          <ArrowRight className="size-4 shrink-0" aria-hidden />
          {t("wishlist.step.randomQueueUnlocked")}
        </p>
      ) : null}

      <div
        className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-sky-300/10 bg-night-900/65 p-1.5"
        role="tablist"
        aria-label={t("wishlist.queueTabs")}
      >
        {availableTypes.map((type) => {
          const unlocked = unlockedTypes.includes(type);
          const active = type === activeType;
          const count = items.filter(
            (item) => item.wishlistType === type,
          ).length;

          return (
            <button
              key={type}
              type="button"
              role="tab"
              aria-selected={active}
              aria-disabled={!unlocked}
              disabled={!unlocked}
              onClick={() => unlocked && setActiveType(type)}
              className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition ${
                !unlocked
                  ? "cursor-not-allowed text-white/25"
                  : active
                    ? "bg-moon-600 text-white shadow-lg shadow-moon-700/25"
                    : "text-sky-100/55 hover:bg-sky-300/8 hover:text-sky-100"
              }`}
            >
              {t(`wishlistType.${type}` as TranslationKey)}
              <span
                className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] ${
                  active ? "bg-white/15 text-white" : "bg-white/5 text-white/40"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {visibleItems.length === 0 ? (
        <EmptyState>{t("events.noItems")}</EmptyState>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2" role="tabpanel">
          {visibleItems.map((item) => (
            <WishlistItemCard
              key={`${item.itemId}:${item.wishlistType}`}
              eventId={eventId}
              item={item}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
