import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { DeleteEventButton } from "@/components/delete-event-button";
import { DrawPanel, type DrawItem } from "@/components/draw-panel";
import { EventForm } from "@/components/event-form";
import { Card, PageHeader, SectionTitle } from "@/components/ui";
import { buildAnnouncement, type AnnouncementItem } from "@/lib/announcement";
import {
  ensureRoundHasActiveCatalogue,
  getEvent,
  getRoundQueues,
  listRoundItems,
  queueKey,
} from "@/lib/queries";
import { getTranslations, localized } from "@/lib/i18n/server";
import { wishlistTypeRules } from "@/lib/policy";
import { currentIsoWeek, isoWeekFromDate } from "@/lib/week";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

export default async function ManageEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) notFound();

  const { t, locale } = await getTranslations();
  if (event.status === "draft" || event.status === "open") {
    await ensureRoundHasActiveCatalogue(id);
  }
  const roundItems = await listRoundItems(id, null);

  const queues = await getRoundQueues(
    id,
    roundItems.flatMap((item) =>
      item.queueTypes.map((queueType) => ({
        itemId: item.itemId,
        queueType,
      })),
    ),
  );

  const eventName = localized(locale, event.nameEn, event.nameTh);
  const auctionGroups = roundItems.map((item) => ({
    eventItemId: item.eventItemId,
    name: localized(locale, item.nameEn, item.nameTh),
    imageUrl: item.imageUrl,
    minStarstone: item.minStarstone,
    queues: item.queueTypes.map((queueType) => ({
      queueType,
      entries: (queues.get(queueKey(item.itemId, queueType)) ?? []).map(
        (entry) => ({
          registrationId: entry.id,
          position: entry.position,
          displayName:
            entry.characterName || entry.name || t("common.unnamed"),
          inGameId: entry.inGameId,
          gearRating: entry.gearRatingSnapshot,
          quantityRequested: entry.quantityRequested,
          carryDepth: entry.carryDepth,
          status: entry.status,
          allocated: entry.allocated,
          allocationId: entry.allocationStatus ? entry.allocationId : null,
          allocationStatus:
            (entry.allocationStatus as DrawItem["queue"][number]["allocationStatus"]) ??
            null,
        }),
      ),
    })),
  }));

  const drawItems: DrawItem[] = roundItems.flatMap((item) =>
    item.queueTypes.map((queueType) => ({
      eventItemId: item.eventItemId,
      name: localized(locale, item.nameEn, item.nameTh),
      imageUrl: item.imageUrl,
      wishlistType: queueType,
      queue: (queues.get(queueKey(item.itemId, queueType)) ?? []).map(
        (entry) => ({
          registrationId: entry.id,
          position: entry.position,
          displayName:
            entry.characterName || entry.name || t("common.unnamed"),
          inGameId: entry.inGameId,
          gearRating: entry.gearRatingSnapshot,
          quantityRequested: entry.quantityRequested,
          carryDepth: entry.carryDepth,
          status: entry.status,
          allocated: entry.allocated,
          allocationId: entry.allocationStatus ? entry.allocationId : null,
          allocationStatus:
            (entry.allocationStatus as DrawItem["queue"][number]["allocationStatus"]) ??
            null,
        }),
      ),
    })),
  );

  const hasDraw = drawItems.some((item) =>
    item.queue.some(
      (entry) =>
        entry.allocationStatus !== null || entry.status !== "pending",
    ),
  );
  const hasRandomQueues = roundItems.some((item) =>
    item.queueTypes.some(
      (queueType) => wishlistTypeRules[queueType].ordering === "random",
    ),
  );

  const announcementItems: AnnouncementItem[] = drawItems.map((item) => ({
    name: `${item.name} — ${t(
      `wishlistType.${item.wishlistType}` as TranslationKey,
    )}`,
    recipients: item.queue
      .filter((entry) => entry.allocationStatus !== null)
      .map((entry) => ({
        slot: entry.position,
        displayName: entry.displayName,
        inGameId: entry.inGameId,
        quantityRequested: entry.quantityRequested,
        quantityAllocated: entry.allocated ?? 0,
        status: entry.allocationStatus ?? "proposed",
      })),
  }));

  const announcement = buildAnnouncement({
    locale,
    roundName: eventName,
    items: announcementItems,
  });

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
          <EventForm
            event={{
              id: event.id,
              week: event.startsOn
                ? isoWeekFromDate(event.startsOn)
                : currentIsoWeek(),
              status:
                event.status === "draft" ? "open" : event.status,
            }}
          />
        </Card>

        <Card>
          <SectionTitle>{t("common.delete")}</SectionTitle>
          <DeleteEventButton eventId={event.id} />
        </Card>
      </div>
    </>
  );
}
