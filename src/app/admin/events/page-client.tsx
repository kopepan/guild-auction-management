"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, Package, Plus, Users } from "lucide-react";

import { DeleteEventButton } from "@/components/delete-event-button";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { PageLoader } from "@/components/spinner";
import { useT, useI18n } from "@/lib/i18n/client";
import { localized } from "@/lib/i18n/localized";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { usePageData } from "@/lib/use-page-data";

type AdminEventsData = {
  events: {
    id: string;
    nameEn: string;
    nameTh: string | null;
    status: string;
    startsOn: string | null;
    endsOn: string | null;
    itemCount: number;
    registrationCount: number;
  }[];
};

export default function AdminEventsClient() {
  const state = usePageData<AdminEventsData>("/admin/events");
  const t = useT();
  const { locale } = useI18n();

  if (state.status === "loading" || state.status === "redirect") {
    return <PageLoader />;
  }
  if (state.status === "notFound") {
    return null;
  }

  const { events } = state.data;

  return (
    <>
      <PageHeader
        title={t("adminEvents.title")}
        subtitle={t("adminEvents.subtitle")}
        action={
          <Link href="/admin/events/new" className="btn-primary">
            <Plus className="size-4" aria-hidden />
            {t("adminEvents.new")}
          </Link>
        }
      />

      {events.length === 0 ? (
        <EmptyState>{t("events.empty")}</EmptyState>
      ) : (
        <ul className="space-y-2">
          {events.map((event) => (
            <li
              key={event.id}
              className={`card flex flex-wrap items-center gap-3 p-4 ${
                event.status === "open"
                  ? "border-emerald-400/25 bg-emerald-400/4"
                  : ""
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-medium text-white">
                  <span className="truncate">
                    {localized(locale, event.nameEn, event.nameTh)}
                  </span>
                  {event.status === "open" ? (
                    <span className="text-xs font-normal text-emerald-300">
                      {t("adminEvents.current")}
                    </span>
                  ) : null}
                  <StatusBadge
                    status={event.status}
                    label={t(`event.status.${event.status}` as TranslationKey)}
                  />
                </p>
                <p className="mt-1 flex flex-wrap gap-3 text-xs text-white/40">
                  {event.startsOn || event.endsOn ? (
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="size-3.5" aria-hidden />
                      {t("events.dates", {
                        start: event.startsOn ?? "—",
                        end: event.endsOn ?? "—",
                      })}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1.5">
                    <Package className="size-3.5" aria-hidden />
                    {t("events.itemsAvailable", { count: event.itemCount })}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="size-3.5" aria-hidden />
                    {t("events.entries", { count: event.registrationCount })}
                  </span>
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
    </>
  );
}
