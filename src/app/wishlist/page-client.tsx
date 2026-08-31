"use client";

import { Ban } from "lucide-react";

import type { WishlistCardItem } from "@/components/wishlist-item-card";
import { WishlistQueueTabs } from "@/components/wishlist-queue-tabs";
import { ViewAsMemberToggle } from "@/components/view-as-member-toggle";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { PageLoader } from "@/components/spinner";
import { useAppBootstrap } from "@/lib/app-bootstrap-context";
import { useT, useI18n } from "@/lib/i18n/client";
import { localized } from "@/lib/i18n/localized";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { usePageData } from "@/lib/use-page-data";

type WishlistData = {
  round: {
    id: string;
    nameEn: string;
    nameTh: string | null;
  } | null;
  penalty?: { endsOn: string; reason: string | null } | null;
  gearLimitUsed?: boolean;
  cards?: WishlistCardItem[];
  gearStepComplete?: boolean;
  confirmCheck?: { ok: true } | { ok: false; message: TranslationKey };
  isSystemAdmin?: boolean;
};

export default function WishlistClient() {
  const state = usePageData<WishlistData>("/wishlist");
  const t = useT();
  const { locale } = useI18n();
  const { bootstrap } = useAppBootstrap();

  if (state.status === "loading" || state.status === "redirect") {
    return <PageLoader />;
  }
  if (state.status === "notFound") {
    return null;
  }

  const { round, penalty, gearLimitUsed, cards, gearStepComplete, confirmCheck, isSystemAdmin } =
    state.data;

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

  return (
    <>
      {isSystemAdmin ? (
        <div className="mb-4 flex flex-wrap items-center justify-end gap-2 rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3">
          <ViewAsMemberToggle
            viewAsMember={bootstrap?.viewAsMember ?? false}
            prominent
          />
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

      {!cards || cards.length === 0 ? (
        <EmptyState>{t("events.noItems")}</EmptyState>
      ) : (
        <WishlistQueueTabs
          eventId={round.id}
          items={cards}
          gearStepComplete={gearStepComplete ?? false}
          canConfirm={confirmCheck?.ok ?? false}
        />
      )}
    </>
  );
}
