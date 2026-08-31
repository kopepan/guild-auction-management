import type { DrawItem } from "@/components/draw-panel";
import { SETTING_KEYS } from "@/db/schema";
import { buildAnnouncement, type AnnouncementItem } from "@/lib/announcement";
import { createTranslator } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";
import { localized } from "@/lib/i18n/localized";
import { requireAdminRedirect } from "@/lib/page-loaders/guards";
import {
  notFound,
  pageData,
  redirectTo,
  type PageLoaderResult,
} from "@/lib/page-loaders/types";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { wishlistTypeRules, normalizeWishlistTypes } from "@/lib/policy";
import { getDiscordBotToken, getDiscordGuildId } from "@/lib/discord";
import {
  ensureRoundHasActiveCatalogue,
  getCurrentRound,
  getDashboardStats,
  getEvent,
  getItem,
  getRoundQueues,
  getSetting,
  listActivePenalties,
  listAllItems,
  listEvents,
  listMembers,
  listRoundItems,
  queueKey,
} from "@/lib/queries";
import { currentIsoWeek, isoWeekFromDate } from "@/lib/week";

async function guardAdmin(): Promise<PageLoaderResult<never> | null> {
  const redirect = await requireAdminRedirect();
  if (redirect) return redirectTo(redirect);
  return null;
}

export async function loadAdminDashboard(): Promise<PageLoaderResult<unknown>> {
  const guard = await guardAdmin();
  if (guard) return guard;

  const [stats, currentRound, events] = await Promise.all([
    getDashboardStats(),
    getCurrentRound(),
    listEvents(),
  ]);

  return pageData({ stats, currentRound, events });
}

export async function loadAdminEvents(): Promise<PageLoaderResult<unknown>> {
  const guard = await guardAdmin();
  if (guard) return guard;

  const events = await listEvents();
  return pageData({ events });
}

export async function loadAdminEventsNew(): Promise<PageLoaderResult<unknown>> {
  const guard = await guardAdmin();
  if (guard) return guard;

  return pageData({});
}

export async function loadAdminEventDetail(
  id: string,
): Promise<PageLoaderResult<unknown>> {
  const guard = await guardAdmin();
  if (guard) return guard;

  const event = await getEvent(id);
  if (!event) return notFound();

  const locale = await getLocale();
  const t = createTranslator(locale);

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

  const eventForm = {
    id: event.id,
    week: event.startsOn ? isoWeekFromDate(event.startsOn) : currentIsoWeek(),
    status:
      event.status === "draft"
        ? ("open" as const)
        : (event.status as "open" | "locked" | "completed"),
  };

  return pageData({
    event,
    eventName,
    roundItems,
    drawItems,
    auctionGroups,
    announcement,
    hasDraw,
    hasRandomQueues,
    eventForm,
  });
}

export async function loadAdminItems(): Promise<PageLoaderResult<unknown>> {
  const guard = await guardAdmin();
  if (guard) return guard;

  const items = await listAllItems({ includeInactive: true });
  return pageData({
    items: items.map((item) => ({
      ...item,
      queueTypes: normalizeWishlistTypes(item.queueTypes),
    })),
  });
}

export async function loadAdminItemsNew(): Promise<PageLoaderResult<unknown>> {
  const guard = await guardAdmin();
  if (guard) return guard;

  return pageData({});
}

export async function loadAdminItemDetail(
  id: string,
): Promise<PageLoaderResult<unknown>> {
  const guard = await guardAdmin();
  if (guard) return guard;

  const item = await getItem(id);
  if (!item) return notFound();

  return pageData({
    item: {
      id: item.id,
      nameEn: item.nameEn,
      nameTh: item.nameTh,
      category: item.category,
      queueTypes: normalizeWishlistTypes(item.queueTypes),
      minStarstone: item.minStarstone,
      imageUrl: item.imageUrl,
      descriptionEn: item.descriptionEn,
      descriptionTh: item.descriptionTh,
      isActive: item.isActive,
    },
  });
}

export async function loadAdminMembers(): Promise<PageLoaderResult<unknown>> {
  const guard = await guardAdmin();
  if (guard) return guard;

  const [members, activePenalties] = await Promise.all([
    listMembers(),
    listActivePenalties(),
  ]);

  const penaltyByUser = Object.fromEntries(
    activePenalties.map((penalty) => [penalty.userId, penalty]),
  );
  const discordSyncReady = Boolean(getDiscordGuildId() && getDiscordBotToken());

  return pageData({ members, penaltyByUser, discordSyncReady });
}

export async function loadAdminRules(): Promise<PageLoaderResult<unknown>> {
  const guard = await guardAdmin();
  if (guard) return guard;

  const setting = await getSetting(SETTING_KEYS.rules);

  return pageData({
    valueEn: setting?.valueEn ?? null,
    valueTh: setting?.valueTh ?? null,
  });
}
