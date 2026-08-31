import Link from "next/link";
import {
  ArrowRight,
  CalendarPlus,
  ClipboardList,
  Package,
  ShieldCheck,
  Users,
} from "lucide-react";

import { DeleteEventButton } from "@/components/delete-event-button";
import { Card, EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { getDashboardStats, getCurrentRound, listEvents } from "@/lib/queries";
import { getTranslations, localized } from "@/lib/i18n/server";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

export default async function AdminIndexPage() {
  const { t, locale } = await getTranslations();
  const [stats, currentRound, events] = await Promise.all([
    getDashboardStats(),
    getCurrentRound(),
    listEvents(),
  ]);

  const recentEvents = events.slice(0, 5);

  return (
    <>
      <PageHeader
        title={t("adminDashboard.title")}
        subtitle={t("adminDashboard.subtitle")}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-sky-400/10 text-sky-300">
              <Users className="size-5" aria-hidden />
            </span>
            <div>
              <p className="text-xs text-white/45">
                {t("dashboard.stats.members")}
              </p>
              <p className="text-2xl font-semibold text-white">
                {stats.memberCount}
              </p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-moon-400/10 text-moon-300">
              <Package className="size-5" aria-hidden />
            </span>
            <div>
              <p className="text-xs text-white/45">
                {t("dashboard.stats.items")}
              </p>
              <p className="text-2xl font-semibold text-white">
                {stats.itemCount}
              </p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-glow-400/10 text-glow-300">
              <ClipboardList className="size-5" aria-hidden />
            </span>
            <div>
              <p className="text-xs text-white/45">
                {t("dashboard.stats.entries")}
              </p>
              <p className="text-2xl font-semibold text-white">
                {stats.entryCount}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card className="border-moon-400/20 bg-moon-400/5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium tracking-wide text-moon-300 uppercase">
                {t("adminDashboard.weeklyWorkflow")}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-white">
                {currentRound
                  ? localized(
                      locale,
                      currentRound.nameEn,
                      currentRound.nameTh,
                    )
                  : t("adminDashboard.noCurrentRound")}
              </h2>
              <p className="mt-1 text-sm text-white/50">
                {currentRound
                  ? t("adminDashboard.currentRoundHint")
                  : t("adminDashboard.noCurrentRoundHint")}
              </p>
            </div>
            {currentRound ? (
              <StatusBadge
                status={currentRound.status}
                label={t(
                  `event.status.${currentRound.status}` as TranslationKey,
                )}
              />
            ) : null}
          </div>

          <ol className="mt-5 grid gap-2 sm:grid-cols-2">
            {[
              t("adminDashboard.stepOne"),
              t("adminDashboard.stepTwo"),
              t("adminDashboard.stepThree"),
              t("adminDashboard.stepFour"),
            ].map((step, index) => (
              <li
                key={step}
                className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/3 px-3 py-2 text-sm text-white/70"
              >
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-moon-500/20 text-xs font-semibold text-moon-300">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href={
                currentRound
                  ? `/admin/events/${currentRound.id}`
                  : "/admin/events/new"
              }
              className="btn-primary btn-sm"
            >
              {currentRound
                ? t("adminDashboard.manageCurrentRound")
                : t("adminDashboard.createRound")}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link href="/admin/events" className="btn-ghost btn-sm">
              {t("adminDashboard.viewAllRounds")}
            </Link>
          </div>
        </Card>

        <Card>
          <p className="text-xs font-medium tracking-wide text-white/45 uppercase">
            {t("adminDashboard.quickActions")}
          </p>
          <div className="mt-3 grid gap-2">
            <Link
              href="/admin/events/new"
              className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/3 px-3 py-3 text-sm text-white/80 transition hover:bg-white/6"
            >
              <CalendarPlus className="size-4 text-moon-300" aria-hidden />
              <span className="flex-1">{t("adminDashboard.createRound")}</span>
              <ArrowRight className="size-4 text-white/30" aria-hidden />
            </Link>
            <Link
              href="/admin/items"
              className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/3 px-3 py-3 text-sm text-white/80 transition hover:bg-white/6"
            >
              <Package className="size-4 text-moon-300" aria-hidden />
              <span className="flex-1">{t("nav.adminItems")}</span>
              <ArrowRight className="size-4 text-white/30" aria-hidden />
            </Link>
            <Link
              href="/admin/members"
              className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/3 px-3 py-3 text-sm text-white/80 transition hover:bg-white/6"
            >
              <ShieldCheck className="size-4 text-moon-300" aria-hidden />
              <span className="flex-1">{t("nav.adminMembers")}</span>
              <ArrowRight className="size-4 text-white/30" aria-hidden />
            </Link>
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-white/80 uppercase">
              {t("adminDashboard.recentRounds")}
            </h2>
            <p className="mt-1 text-xs text-white/40">
              {t("adminDashboard.recentRoundsHint")}
            </p>
          </div>
          <Link href="/admin/events" className="btn-ghost btn-sm">
            {t("adminDashboard.viewAllRounds")}
          </Link>
        </div>

        {recentEvents.length === 0 ? (
          <div className="mt-4">
            <EmptyState>{t("events.empty")}</EmptyState>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-white/6">
            {recentEvents.map((event) => (
              <li
                key={event.id}
                className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-white">
                    <span className="truncate">
                      {localized(locale, event.nameEn, event.nameTh)}
                    </span>
                    <StatusBadge
                      status={event.status}
                      label={t(
                        `event.status.${event.status}` as TranslationKey,
                      )}
                    />
                  </p>
                  <p className="mt-1 text-xs text-white/40">
                    {t("adminDashboard.roundSummary", {
                      items: event.itemCount,
                      entries: event.registrationCount,
                    })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <DeleteEventButton eventId={event.id} variant="inline" />
                  <Link
                    href={`/admin/events/${event.id}`}
                    className="btn-ghost btn-sm"
                  >
                    {t("adminEvents.manage")}
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
