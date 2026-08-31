"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ListOrdered } from "lucide-react";

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

type QueueEntry = {
  id: string;
  userId: string;
  characterName: string | null;
  name: string | null;
  gearRatingSnapshot: number | null;
  quantityRequested: number;
  carryDepth: number;
  status: string;
  position: number;
  allocationStatus: string | null;
};

type EventDetailData = {
  event: {
    id: string;
    nameEn: string;
    nameTh: string | null;
    status: string;
    startsOn: string | null;
    endsOn: string | null;
  };
  currentRoundId: string | null;
  userId: string | null;
  roundItems: {
    eventItemId: string;
    itemId: string;
    nameEn: string;
    nameTh: string | null;
    imageUrl: string | null;
    queueTypes: ("gear_queue" | "random_queue" | "fifo_queue")[];
    registrationCount: number;
  }[];
  queues: Record<string, QueueEntry[]>;
};

export default function EventDetailClient() {
  const pathname = usePathname();
  const state = usePageData<EventDetailData>(pathname);
  const t = useT();
  const { locale } = useI18n();

  if (state.status === "loading" || state.status === "redirect") {
    return <PageLoader />;
  }
  if (state.status === "notFound") {
    return <EmptyState>{t("events.empty")}</EmptyState>;
  }

  const { event, currentRoundId, userId, roundItems, queues } = state.data;
  const eventName = localized(locale, event.nameEn, event.nameTh);
  const isCurrent = currentRoundId === event.id;

  return (
    <>
      <Link
        href="/events"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-white/50 transition hover:text-white"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t("events.title")}
      </Link>

      <PageHeader
        title={eventName}
        subtitle={
          event.startsOn && event.endsOn
            ? t("events.dates", { start: event.startsOn, end: event.endsOn })
            : undefined
        }
        action={
          <div className="flex items-center gap-2">
            <StatusBadge
              status={event.status}
              label={t(`event.status.${event.status}` as TranslationKey)}
            />
            {userId && isCurrent && event.status === "open" ? (
              <Link href="/wishlist" className="btn-primary btn-sm">
                <ListOrdered className="size-4" aria-hidden />
                {t("dashboard.openWishlist")}
              </Link>
            ) : null}
          </div>
        }
      />

      {roundItems.length === 0 ? (
        <EmptyState>{t("events.noItems")}</EmptyState>
      ) : (
        <div className="space-y-4">
          {roundItems.map((item) => {
            const name = localized(locale, item.nameEn, item.nameTh);
            const itemQueues = item.queueTypes.map((queueType) => ({
              queueType,
              entries: queues[`${item.itemId}:${queueType}`] ?? [],
            }));

            return (
              <Card key={item.eventItemId}>
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <ItemThumb src={item.imageUrl} alt={name} />
                    <div>
                      <p className="text-sm font-semibold text-white">{name}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/40">
                        {item.queueTypes.map((queueType) => (
                          <StatusBadge
                            key={queueType}
                            status={queueType}
                            label={t(
                              `wishlistType.${queueType}` as TranslationKey,
                            )}
                          />
                        ))}
                        <span>
                          · {t("items.inQueue", { count: item.registrationCount })}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {itemQueues.map(({ queueType, entries }) => {
                    const drawn = entries.some(
                      (entry) => entry.allocationStatus !== null,
                    );
                    const groups = [
                      {
                        key: "carried",
                        label: t("wishlist.carriedFromPrevious"),
                        entries: entries.filter(
                          (entry) => entry.carryDepth > 0,
                        ),
                      },
                      {
                        key: "current",
                        label: t("wishlist.registeredThisWeek"),
                        entries: entries.filter(
                          (entry) => entry.carryDepth === 0,
                        ),
                      },
                    ];

                    return (
                      <section
                        key={queueType}
                        className="rounded-xl border border-white/8 bg-white/2 p-3"
                      >
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <StatusBadge
                            status={queueType}
                            label={t(
                              `wishlistType.${queueType}` as TranslationKey,
                            )}
                          />
                          <span className="text-xs text-white/40">
                            {drawn
                              ? t("events.allocations")
                              : t("draw.queuePreview")}
                          </span>
                        </div>

                        {entries.length === 0 ? (
                          <p className="text-sm text-white/35">
                            {t("items.queueEmpty")}
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {groups.map((group) =>
                              group.entries.length > 0 ? (
                                <div key={group.key}>
                                  <p className="mb-1.5 text-xs font-medium text-white/45">
                                    {group.label}
                                  </p>
                                  <ol className="space-y-1.5">
                                    {group.entries.map((entry) => (
                                      <li
                                        key={entry.id}
                                        className={`flex flex-wrap items-center gap-2.5 rounded-lg border px-3 py-2 ${
                                          entry.userId === userId
                                            ? "border-glow-400/30 bg-glow-400/5"
                                            : "border-white/8 bg-white/2"
                                        }`}
                                      >
                                        <PositionBadge
                                          position={entry.position}
                                        />
                                        <span className="min-w-0 flex-1 truncate text-sm text-white/85">
                                          {entry.characterName ||
                                            entry.name ||
                                            t("common.unnamed")}
                                          {queueType === "gear_queue" &&
                                          entry.gearRatingSnapshot != null ? (
                                            <span className="ml-2 text-xs text-white/35">
                                              GR{" "}
                                              {entry.gearRatingSnapshot.toLocaleString()}
                                            </span>
                                          ) : null}
                                          {entry.quantityRequested > 1 ? (
                                            <span className="ml-2 text-xs text-white/35">
                                              ×{entry.quantityRequested}
                                            </span>
                                          ) : null}
                                        </span>
                                        {entry.allocationStatus ? (
                                          <StatusBadge
                                            status={entry.allocationStatus}
                                            label={t(
                                              `draw.${entry.allocationStatus}` as TranslationKey,
                                            )}
                                          />
                                        ) : entry.status !== "pending" ? (
                                          <StatusBadge
                                            status={entry.status}
                                            label={t(
                                              `draw.${entry.status}` as TranslationKey,
                                            )}
                                          />
                                        ) : null}
                                      </li>
                                    ))}
                                  </ol>
                                </div>
                              ) : null,
                            )}
                          </div>
                        )}
                      </section>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
