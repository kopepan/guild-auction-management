"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { DeleteEventButton } from "@/components/delete-event-button";
import { DrawPanel, type DrawItem } from "@/components/draw-panel";
import { EventForm, type EventFormValues } from "@/components/event-form";
import { Card, EmptyState, PageHeader, SectionTitle } from "@/components/ui";
import { PageLoader } from "@/components/spinner";
import type { AuctionSessionGroup } from "@/components/auction-session-panel";
import { useT } from "@/lib/i18n/client";
import { usePageData } from "@/lib/use-page-data";

type AdminEventDetailData = {
  event: {
    id: string;
    status: "draft" | "open" | "locked" | "completed";
  };
  eventName: string;
  roundItems: unknown[];
  drawItems: DrawItem[];
  auctionGroups: AuctionSessionGroup[];
  announcement: string;
  hasDraw: boolean;
  hasRandomQueues: boolean;
  eventForm: EventFormValues;
};

export default function AdminEventDetailClient() {
  const pathname = usePathname();
  const state = usePageData<AdminEventDetailData>(pathname);
  const t = useT();

  if (state.status === "loading" || state.status === "redirect") {
    return <PageLoader />;
  }
  if (state.status === "notFound") {
    return <EmptyState>{t("events.empty")}</EmptyState>;
  }

  const {
    event,
    eventName,
    roundItems,
    drawItems,
    auctionGroups,
    announcement,
    hasDraw,
    hasRandomQueues,
    eventForm,
  } = state.data;

  return (
    <>
      <Link
        href="/admin/events"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t("adminEvents.title")}
      </Link>

      <PageHeader
        title={eventName}
        subtitle={
          event.status === "draft" ? t("adminEvents.openHint") : undefined
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/events/${event.id}`} className="btn-ghost btn-sm">
              <ExternalLink className="size-4" aria-hidden />
              {t("nav.events")}
            </Link>
            <DeleteEventButton eventId={event.id} variant="inline" />
          </div>
        }
      />

      <div className="space-y-4">
        <Card>
          <SectionTitle hint={t("adminEvents.availableItemsHint")}>
            {t("adminEvents.availableItems")}
          </SectionTitle>
          {roundItems.length > 0 ? (
            <div className="mt-5 border-t border-white/8 pt-5">
              <SectionTitle hint={t("draw.subtitle")}>
                {t("draw.title")}
              </SectionTitle>
              <DrawPanel
                eventId={event.id}
                eventStatus={event.status}
                hasDraw={hasDraw}
                hasRandomQueues={hasRandomQueues}
                announcement={announcement}
                items={drawItems}
                auctionGroups={auctionGroups}
              />
            </div>
          ) : (
            <p className="text-sm text-white/40">{t("events.noItems")}</p>
          )}
        </Card>

        <Card>
          <SectionTitle>{t("common.edit")}</SectionTitle>
          <EventForm event={eventForm} />
        </Card>

        <Card>
          <SectionTitle>{t("common.delete")}</SectionTitle>
          <DeleteEventButton eventId={event.id} />
        </Card>
      </div>
    </>
  );
}
