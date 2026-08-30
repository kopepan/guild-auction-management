import Link from "next/link";
import { CalendarDays, Package } from "lucide-react";

import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { redirectMemberDuringRegistration } from "@/lib/phase";
import { listEvents } from "@/lib/queries";
import { getTranslations, localized } from "@/lib/i18n/server";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

export default async function EventsPage() {
  await redirectMemberDuringRegistration();
  const { t, locale } = await getTranslations();
  const events = await listEvents();
  const visible = events.filter((event) => event.status !== "draft");

  return (
    <>
      <PageHeader title={t("events.title")} subtitle={t("events.subtitle")} />

      {visible.length === 0 ? (
        <EmptyState>{t("events.empty")}</EmptyState>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {visible.map((event) => (
            <li key={event.id}>
              <Link href={`/events/${event.id}`} className="card block p-5 transition hover:border-moon-500/40 hover:bg-white/[0.05]">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-semibold text-white">
                    {localized(locale, event.nameEn, event.nameTh)}
                  </h2>
                  <StatusBadge
                    status={event.status}
                    label={t(`event.status.${event.status}` as TranslationKey)}
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/45">
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
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
