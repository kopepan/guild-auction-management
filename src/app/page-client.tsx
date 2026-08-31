"use client";

import Link from "next/link";
import {
  Ban,
  CalendarDays,
  ListOrdered,
  Package,
  Sparkles,
  TriangleAlert,
  Users,
} from "lucide-react";

import {
  Card,
  EmptyState,
  ItemThumb,
  PageHeader,
  PositionBadge,
  StatusBadge,
} from "@/components/ui";
import { PageLoader } from "@/components/spinner";
import { useT, useI18n } from "@/lib/i18n/client";
import { localized } from "@/lib/i18n/localized";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { usePageData } from "@/lib/use-page-data";

type DashboardData = {
  user: {
    name: string | null;
    characterName: string | null;
    gearRating: number | null;
  } | null;
  round: { id: string; nameEn: string; nameTh: string | null } | null;
  stats: { memberCount: number; itemCount: number; entryCount: number };
  allRounds: {
    id: string;
    nameEn: string;
    nameTh: string | null;
    status: string;
    itemCount: number;
  }[];
  myEntries: {
    registrationId: string;
    nameEn: string;
    nameTh: string | null;
    imageUrl: string | null;
    quantityRequested: number;
    position: number | null;
    queueLength: number;
    carryDepth: number;
    status: string;
  }[];
  penalty?: { endsOn: string };
  profileComplete: boolean;
};

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="card flex items-center gap-3 p-4">
      <span className="grid size-9 place-items-center rounded-lg bg-moon-600/15 text-moon-400">
        {icon}
      </span>
      <span>
        <span className="block text-xl font-semibold text-white tabular-nums">
          {value}
        </span>
        <span className="block text-xs text-white/40">{label}</span>
      </span>
    </div>
  );
}

export default function DashboardClient() {
  const state = usePageData<DashboardData>("/");
  const t = useT();
  const { locale } = useI18n();

  if (state.status === "loading" || state.status === "redirect") {
    return <PageLoader />;
  }
  if (state.status === "notFound") {
    return <EmptyState>{t("common.loading")}</EmptyState>;
  }

  const { user, round, stats, allRounds, myEntries, penalty, profileComplete } =
    state.data;
  const nextUp = myEntries.filter((entry) => entry.position === 1);
  const visibleRounds = allRounds
    .filter((item) => item.status !== "draft")
    .slice(0, 6);

  return (
    <>
      <PageHeader
        title={
          user
            ? t("dashboard.welcome", {
                name: user.name || user.characterName || "",
              })
            : `${t("app.name")} · ${t("app.tagline")}`
        }
        subtitle={t("wishlist.subtitle")}
        action={
          user && round ? (
            <Link href="/wishlist" className="btn-primary">
              <ListOrdered className="size-4" aria-hidden />
              {t("dashboard.openWishlist")}
            </Link>
          ) : (
            <Link href="/events" className="btn-primary">
              <CalendarDays className="size-4" aria-hidden />
              {t("nav.events")}
            </Link>
          )
        }
      />

      {penalty ? (
        <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border border-red-400/25 bg-red-400/10 px-4 py-3">
          <Ban className="size-5 shrink-0 text-red-300" aria-hidden />
          <p className="min-w-0 flex-1 text-sm text-red-100">
            {t("dashboard.penalized", { date: penalty.endsOn })}
          </p>
        </div>
      ) : null}

      {user && !profileComplete ? (
        <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3">
          <TriangleAlert
            className="size-5 shrink-0 text-amber-300"
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-amber-100">
              {t("dashboard.profileIncomplete")}
            </p>
            <p className="text-xs text-amber-200/70">
              {t("dashboard.profileIncompleteBody")}
            </p>
          </div>
          <Link href="/profile" className="btn-ghost btn-sm">
            {t("dashboard.completeProfile")}
          </Link>
        </div>
      ) : null}

      {nextUp.length > 0 ? (
        <div className="mb-6 rounded-xl border border-glow-400/25 bg-glow-400/10 px-4 py-3">
          {nextUp.map((entry) => (
            <p
              key={entry.registrationId}
              className="flex items-center gap-2 text-sm text-glow-300"
            >
              <Sparkles className="size-4 shrink-0" aria-hidden />
              {t("dashboard.yourTurn", {
                item: localized(locale, entry.nameEn, entry.nameTh),
              })}
            </p>
          ))}
        </div>
      ) : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard
          icon={<Users className="size-4" aria-hidden />}
          label={t("dashboard.stats.members")}
          value={stats.memberCount}
        />
        <StatCard
          icon={<Package className="size-4" aria-hidden />}
          label={t("dashboard.stats.items")}
          value={stats.itemCount}
        />
        <StatCard
          icon={<CalendarDays className="size-4" aria-hidden />}
          label={t("dashboard.stats.entries")}
          value={stats.entryCount}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <Card>
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-white/80 uppercase">
            {t("dashboard.myEntries")}
          </h2>
          {!user ? (
            <EmptyState>
              <Link href="/login" className="text-moon-400 hover:underline">
                {t("nav.signIn")}
              </Link>
            </EmptyState>
          ) : !round ? (
            <EmptyState>{t("dashboard.noOpenRound")}</EmptyState>
          ) : myEntries.length === 0 ? (
            <EmptyState>
              <span className="block">{t("dashboard.myEntriesEmpty")}</span>
              <Link
                href="/wishlist"
                className="mt-2 inline-block text-moon-400 hover:underline"
              >
                {t("dashboard.openWishlist")}
              </Link>
            </EmptyState>
          ) : (
            <ul className="divide-y divide-white/6">
              {myEntries.map((entry) => (
                <li
                  key={entry.registrationId}
                  className="flex items-center gap-3 py-2.5"
                >
                  <PositionBadge position={entry.position ?? 0} />
                  <ItemThumb
                    src={entry.imageUrl}
                    alt={localized(locale, entry.nameEn, entry.nameTh)}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      href="/wishlist"
                      className="block truncate text-sm text-white hover:text-moon-400"
                    >
                      {localized(locale, entry.nameEn, entry.nameTh)}
                      {entry.quantityRequested > 1
                        ? ` ×${entry.quantityRequested}`
                        : ""}
                    </Link>
                    <p className="flex flex-wrap items-center gap-2 text-xs text-white/35">
                      <span>
                        {t("wishlist.position", {
                          position: entry.position ?? 0,
                          total: entry.queueLength,
                        })}
                      </span>
                      {entry.carryDepth > 0 ? (
                        <StatusBadge
                          status="carried"
                          label={t("wishlist.carried")}
                        />
                      ) : null}
                    </p>
                  </div>
                  {entry.status !== "pending" ? (
                    <StatusBadge
                      status={entry.status}
                      label={t(`draw.${entry.status}` as TranslationKey)}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-white/80 uppercase">
            {t("events.title")}
          </h2>
          {visibleRounds.length === 0 ? (
            <EmptyState>{t("events.empty")}</EmptyState>
          ) : (
            <ul className="space-y-2">
              {visibleRounds.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/events/${item.id}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-white/8 px-3 py-2 text-sm transition hover:border-moon-500/40 hover:bg-white/5"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-white">
                        {localized(locale, item.nameEn, item.nameTh)}
                      </span>
                      <span className="text-xs text-white/35">
                        {t("events.itemsAvailable", { count: item.itemCount })}
                      </span>
                    </span>
                    <StatusBadge
                      status={item.status}
                      label={t(`event.status.${item.status}` as TranslationKey)}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
