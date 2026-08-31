"use client";

import { CheckCircle2 } from "lucide-react";

import type { WishlistCardItem } from "@/components/wishlist-item-card";
import { WishlistEditButton } from "@/components/wishlist-edit-button";
import { WishlistMyEntries } from "@/components/wishlist-my-entries";
import { ViewAsMemberToggle } from "@/components/view-as-member-toggle";
import { RegistrationSteps } from "@/components/registration-steps";
import { Card, PageHeader } from "@/components/ui";
import { PageLoader } from "@/components/spinner";
import { useAppBootstrap } from "@/lib/app-bootstrap-context";
import { useT, useI18n } from "@/lib/i18n/client";
import { localized } from "@/lib/i18n/localized";
import { usePageData } from "@/lib/use-page-data";

type WishlistCompleteData = {
  round: {
    id: string;
    nameEn: string;
    nameTh: string | null;
  };
  cards: WishlistCardItem[];
  isSystemAdmin: boolean;
};

export default function WishlistCompleteClient() {
  const state = usePageData<WishlistCompleteData>("/wishlist/complete");
  const t = useT();
  const { locale } = useI18n();
  const { bootstrap } = useAppBootstrap();

  if (state.status === "loading" || state.status === "redirect") {
    return <PageLoader />;
  }
  if (state.status === "notFound") {
    return null;
  }

  const { round, cards, isSystemAdmin } = state.data;

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
