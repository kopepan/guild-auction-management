import { and, asc, count, desc, eq, inArray, ne, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  allocations,
  eventItems,
  events,
  items,
  penalties,
  registrations,
  settings,
  users,
} from "@/db/schema";
import { orderQueue, type QueueCandidate } from "@/lib/queue";
import {
  normalizeWishlistType,
  normalizeWishlistTypes,
  type WishlistType,
} from "@/lib/policy";

export type ItemCategory = (typeof items.$inferSelect)["category"];

/** Catalogue items that should appear before A–Z sorting. */
const PINNED_ITEM_NAMES = [
  "Green Title Upgrade",
  "Blue Title Upgrade",
  "Purple Title Upgrade",
  "Orange Title Upgrade",
  "Rita",
  "Advanced Gem Box",
  "Orange Relic - STR",
  "Orange Relic - AGI",
  "Orange Relic - VIT",
  "Orange Relic - INT",
  "Orange Relic - DEX",
  "Orange Relic - LUK",
] as const;

function itemSortRank(nameEn: string): number {
  const pinned = PINNED_ITEM_NAMES.indexOf(
    nameEn as (typeof PINNED_ITEM_NAMES)[number],
  );
  return pinned >= 0 ? pinned : PINNED_ITEM_NAMES.length;
}

function sortItemsByDisplayOrder<T extends { nameEn: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const rankDiff = itemSortRank(a.nameEn) - itemSortRank(b.nameEn);
    if (rankDiff !== 0) return rankDiff;
    return a.nameEn.localeCompare(b.nameEn, "th");
  });
}

/** The round members register against: the single open event. */
export async function getRegistrationRound() {
  return db.query.events.findFirst({
    where: eq(events.status, "open"),
    orderBy: [desc(events.startsOn), desc(events.createdAt)],
  });
}

/** @deprecated Use {@link getRegistrationRound}. */
export async function getCurrentRound() {
  return getRegistrationRound();
}

/** The round currently in auction (registration closed, queues posted). */
export async function getAuctionRound() {
  return db.query.events.findFirst({
    where: eq(events.status, "locked"),
    orderBy: [desc(events.startsOn), desc(events.createdAt)],
  });
}

export async function hasActivePenalty(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ value: count() })
    .from(penalties)
    .where(
      and(
        eq(penalties.userId, userId),
        sql`${penalties.startsOn} <= CURRENT_DATE`,
        sql`${penalties.endsOn} >= CURRENT_DATE`,
      ),
    );
  return (row?.value ?? 0) > 0;
}

export async function listActivePenalties() {
  return db
    .select({
      id: penalties.id,
      userId: penalties.userId,
      startsOn: penalties.startsOn,
      endsOn: penalties.endsOn,
      reason: penalties.reason,
    })
    .from(penalties)
    .where(
      and(
        sql`${penalties.startsOn} <= CURRENT_DATE`,
        sql`${penalties.endsOn} >= CURRENT_DATE`,
      ),
    );
}

export async function listPenaltiesForUser(userId: string) {
  return db
    .select({
      id: penalties.id,
      startsOn: penalties.startsOn,
      endsOn: penalties.endsOn,
      reason: penalties.reason,
      isActive: sql<boolean>`(${penalties.startsOn} <= CURRENT_DATE AND ${penalties.endsOn} >= CURRENT_DATE)`,
    })
    .from(penalties)
    .where(eq(penalties.userId, userId))
    .orderBy(desc(penalties.endsOn));
}

export async function getItem(itemId: string) {
  return db.query.items.findFirst({ where: eq(items.id, itemId) });
}

export async function listAllItems({
  includeInactive = false,
}: { includeInactive?: boolean } = {}) {
  const rows = await db
    .select({
      id: items.id,
      nameEn: items.nameEn,
      nameTh: items.nameTh,
      category: items.category,
      wishlistType: items.wishlistType,
      queueTypes: items.queueTypes,
      maxQuantityPerMember: items.maxQuantityPerMember,
      imageUrl: items.imageUrl,
      descriptionEn: items.descriptionEn,
      descriptionTh: items.descriptionTh,
      isActive: items.isActive,
      registrationCount: sql<number>`(
        SELECT COUNT(*)::int FROM ${registrations} r
        WHERE r.item_id = ${items.id} AND r.status IN ('pending', 'allocated')
      )`,
    })
    .from(items)
    .where(includeInactive ? undefined : eq(items.isActive, true));

  return sortItemsByDisplayOrder(rows);
}

export type RoundItem = {
  eventItemId: string;
  itemId: string;
  nameEn: string;
  nameTh: string | null;
  category: ItemCategory;
  queueTypes: WishlistType[];
  maxQuantityPerMember: number | null;
  imageUrl: string | null;
  descriptionEn: string | null;
  descriptionTh: string | null;
  registrationCount: number;
  queues: RoundQueue[];
};

export type RoundQueue = {
  queueType: WishlistType;
  registrationCount: number;
  entries: {
    id: string;
    name: string | null;
    characterName: string | null;
    gearRatingSnapshot: number | null;
    quantityRequested: number;
    carryDepth: number;
    status: string;
    position: number;
    isMine: boolean;
  }[];
  myRegistration: {
    id: string;
    quantityRequested: number;
    status: string;
    carryDepth: number;
    position: number | null;
  } | null;
};

/**
 * Attaches every active catalogue item to a round that is missing them, so
 * members can arrange queues without a manager having to maintain a per-round
 * item list.
 */
export async function ensureRoundHasActiveCatalogue(eventId: string) {
  const [catalogue, attached] = await Promise.all([
    db
      .select({
        id: items.id,
        queueTypes: items.queueTypes,
      })
      .from(items)
      .where(eq(items.isActive, true)),
    db
      .select({ itemId: eventItems.itemId })
      .from(eventItems)
      .where(eq(eventItems.eventId, eventId)),
  ]);

  const attachedIds = new Set(attached.map((row) => row.itemId));
  const missing = catalogue.filter((item) => !attachedIds.has(item.id));
  if (missing.length === 0) return;

  await db
    .insert(eventItems)
    .values(
      missing.map((item) => ({
        eventId,
        itemId: item.id,
        queueTypes: normalizeWishlistTypes(item.queueTypes),
      })),
    )
    .onConflictDoNothing();
}

/**
 * The items offered in a round, with each member's own entry and the position
 * it currently holds under that item's ordering rule.
 */
export async function listRoundItems(
  eventId: string,
  userId: string | null,
): Promise<RoundItem[]> {
  const rows = await db
    .select({
      eventItemId: eventItems.id,
      itemId: items.id,
      nameEn: items.nameEn,
      nameTh: items.nameTh,
      category: items.category,
      queueTypes: eventItems.queueTypes,
      maxQuantityPerMember: items.maxQuantityPerMember,
      imageUrl: items.imageUrl,
      descriptionEn: items.descriptionEn,
      descriptionTh: items.descriptionTh,
    })
    .from(eventItems)
    .innerJoin(items, eq(items.id, eventItems.itemId))
    .where(eq(eventItems.eventId, eventId));

  if (rows.length === 0) return [];

  const queues = await getRoundQueues(
    eventId,
    rows.flatMap((row) =>
      normalizeWishlistTypes(row.queueTypes).map((queueType) => ({
        itemId: row.itemId,
        queueType,
      })),
    ),
  );

  return sortItemsByDisplayOrder(
    rows.map((row) => {
      const queueTypes = normalizeWishlistTypes(row.queueTypes);
      const itemQueues = queueTypes.map((queueType) => {
        const queue = queues.get(queueKey(row.itemId, queueType)) ?? [];
        const mine = userId
          ? queue.find((entry) => entry.userId === userId)
          : undefined;
        return {
          queueType,
          registrationCount: queue.length,
        entries: queue.map((entry) => ({
          id: entry.id,
          name: entry.name,
          characterName: entry.characterName,
          gearRatingSnapshot: entry.gearRatingSnapshot,
          quantityRequested: entry.quantityRequested,
          carryDepth: entry.carryDepth,
          status: entry.status,
          position: entry.position,
          isMine: entry.userId === userId,
        })),
          myRegistration: mine
            ? {
                id: mine.id,
                quantityRequested: mine.quantityRequested,
                status: mine.status,
                carryDepth: mine.carryDepth,
                position: mine.position,
              }
            : null,
        };
      });

      return {
        ...row,
        queueTypes,
        registrationCount: itemQueues.reduce(
          (total, queue) => total + queue.registrationCount,
          0,
        ),
        queues: itemQueues,
      };
    }),
  );
}

export type QueueRow = QueueCandidate & {
  queueType: WishlistType;
  status: string;
  name: string | null;
  characterName: string | null;
  inGameId: string | null;
  position: number;
  allocationId: string | null;
  allocated: number | null;
  allocationStatus: string | null;
  isPenalized: boolean;
};

export function queueKey(itemId: string, queueType: WishlistType) {
  return `${itemId}:${queueType}`;
}

/**
 * Builds the ordered waiting list for each of the given items in a round.
 * Ordering runs in application code so the policy lives in one tested place
 * rather than being restated in SQL.
 */
export async function getRoundQueues(
  eventId: string,
  itemRefs: { itemId: string; queueType: WishlistType }[],
): Promise<Map<string, QueueRow[]>> {
  const result = new Map<string, QueueRow[]>();
  if (itemRefs.length === 0) return result;

  const rows = await db
    .select({
      id: registrations.id,
      itemId: registrations.itemId,
      queueType: registrations.queueType,
      userId: registrations.userId,
      quantityRequested: registrations.quantityRequested,
      gearRatingSnapshot: registrations.gearRatingSnapshot,
      randomOrder: registrations.randomOrder,
      carryDepth: registrations.carryDepth,
      priorRank: registrations.priorRank,
      registeredAt: registrations.registeredAt,
      status: registrations.status,
      name: users.name,
      characterName: users.characterName,
      inGameId: users.inGameId,
      allocationId: allocations.id,
      allocated: allocations.quantityAllocated,
      allocationStatus: allocations.status,
      isPenalized: sql<boolean>`EXISTS (
        SELECT 1 FROM ${penalties} p
        WHERE p.user_id = ${registrations.userId}
          AND p.starts_on <= CURRENT_DATE
          AND p.ends_on >= CURRENT_DATE
      )`,
    })
    .from(registrations)
    .innerJoin(users, eq(users.id, registrations.userId))
    .leftJoin(allocations, eq(allocations.registrationId, registrations.id))
    .where(
      and(
        eq(registrations.eventId, eventId),
        inArray(
          registrations.itemId,
          itemRefs.map((ref) => ref.itemId),
        ),
        ne(registrations.status, "withdrawn"),
      ),
    );

  for (const ref of itemRefs) {
    const forItem = rows
      .filter(
        (row) =>
          row.itemId === ref.itemId &&
          normalizeWishlistType(row.queueType) === ref.queueType,
      )
      .map((row) => ({
        ...row,
        queueType: normalizeWishlistType(row.queueType),
      }));
    const ordered = orderQueue(forItem, ref.queueType);
    result.set(
      queueKey(ref.itemId, ref.queueType),
      ordered.map((row, index) => ({ ...row, position: index + 1 })),
    );
  }

  return result;
}

export async function getItemQueueForRound(
  eventId: string,
  itemId: string,
  queueType: WishlistType,
): Promise<QueueRow[]> {
  const queues = await getRoundQueues(eventId, [{ itemId, queueType }]);
  return queues.get(queueKey(itemId, queueType)) ?? [];
}

export async function getItemHistory(itemId: string, limit = 12) {
  return db
    .select({
      registrationId: registrations.id,
      name: users.name,
      characterName: users.characterName,
      quantity: allocations.quantityAllocated,
      settledAt: registrations.settledAt,
      eventNameEn: events.nameEn,
      eventNameTh: events.nameTh,
    })
    .from(registrations)
    .innerJoin(users, eq(users.id, registrations.userId))
    .innerJoin(events, eq(events.id, registrations.eventId))
    .leftJoin(allocations, eq(allocations.registrationId, registrations.id))
    .where(
      and(eq(registrations.itemId, itemId), eq(registrations.status, "received")),
    )
    .orderBy(desc(registrations.settledAt))
    .limit(limit);
}

export type MyEntry = {
  registrationId: string;
  itemId: string;
  nameEn: string;
  nameTh: string | null;
  imageUrl: string | null;
  wishlistType: WishlistType;
  quantityRequested: number;
  status: string;
  carryDepth: number;
  position: number | null;
  queueLength: number;
};

/** A member's entries in a round, with live positions. */
export async function getMyRoundEntries(
  eventId: string,
  userId: string,
): Promise<MyEntry[]> {
  const roundItems = await listRoundItems(eventId, userId);
  return roundItems
    .flatMap((item) =>
      item.queues
        .filter((queue) => queue.myRegistration)
        .map((queue) => ({
          registrationId: queue.myRegistration!.id,
          itemId: item.itemId,
          nameEn: item.nameEn,
          nameTh: item.nameTh,
          imageUrl: item.imageUrl,
          wishlistType: queue.queueType,
          quantityRequested: queue.myRegistration!.quantityRequested,
          status: queue.myRegistration!.status,
          carryDepth: queue.myRegistration!.carryDepth,
          position: queue.myRegistration!.position,
          queueLength: queue.registrationCount,
        })),
    )
    .sort((a, b) => (a.position ?? 999) - (b.position ?? 999));
}

export async function listEvents() {
  return db
    .select({
      id: events.id,
      nameEn: events.nameEn,
      nameTh: events.nameTh,
      startsOn: events.startsOn,
      endsOn: events.endsOn,
      status: events.status,
      notes: events.notes,
      itemCount: sql<number>`(
        SELECT COUNT(*)::int FROM ${eventItems} ei WHERE ei.event_id = ${events.id}
      )`,
      registrationCount: sql<number>`(
        SELECT COUNT(*)::int FROM ${registrations} r
        WHERE r.event_id = ${events.id} AND r.status <> 'withdrawn'
      )`,
    })
    .from(events)
    .orderBy(desc(events.startsOn), desc(events.createdAt));
}

export async function getEvent(eventId: string) {
  return db.query.events.findFirst({ where: eq(events.id, eventId) });
}

/**
 * The round immediately before the given one, used for carry-over. Rounds are
 * ordered by start date, falling back to creation order when dates are unset.
 */
export async function getPreviousRound(eventId: string) {
  const ordered = await db
    .select({
      id: events.id,
      nameEn: events.nameEn,
      nameTh: events.nameTh,
      startsOn: events.startsOn,
      status: events.status,
    })
    .from(events)
    .orderBy(desc(events.startsOn), desc(events.createdAt));

  const index = ordered.findIndex((round) => round.id === eventId);
  if (index < 0) return undefined;
  return ordered[index + 1];
}

export async function getSetting(key: string) {
  return db.query.settings.findFirst({ where: eq(settings.key, key) });
}

export async function listMembers() {
  return db
    .select({
      id: users.id,
      name: users.name,
      image: users.image,
      role: users.role,
      characterName: users.characterName,
      inGameId: users.inGameId,
      gearRating: users.gearRating,
      isActive: users.isActive,
      createdAt: users.createdAt,
      entryCount: sql<number>`(
        SELECT COUNT(*)::int FROM ${registrations} r
        WHERE r.user_id = ${users.id} AND r.status IN ('pending', 'allocated')
      )`,
      receivedCount: sql<number>`(
        SELECT COUNT(*)::int FROM ${registrations} r
        WHERE r.user_id = ${users.id} AND r.status = 'received'
      )`,
      isPenalized: sql<boolean>`EXISTS (
        SELECT 1 FROM ${penalties} p
        WHERE p.user_id = ${users.id}
          AND p.starts_on <= CURRENT_DATE
          AND p.ends_on >= CURRENT_DATE
      )`,
      penaltyEndsOn: sql<string | null>`(
        SELECT MAX(p.ends_on)::text FROM ${penalties} p
        WHERE p.user_id = ${users.id}
          AND p.starts_on <= CURRENT_DATE
          AND p.ends_on >= CURRENT_DATE
      )`,
    })
    .from(users)
    .orderBy(desc(users.role), asc(users.characterName), asc(users.createdAt));
}

export async function getDashboardStats() {
  const [row] = await db.execute<{
    member_count: number;
    item_count: number;
    entry_count: number;
  }>(sql`
    SELECT
      (SELECT COUNT(*)::int FROM ${users} WHERE is_active = TRUE) AS member_count,
      (SELECT COUNT(*)::int FROM ${items} WHERE is_active = TRUE) AS item_count,
      (SELECT COUNT(*)::int FROM ${registrations}
        WHERE status IN ('pending', 'allocated')) AS entry_count
  `);

  return {
    memberCount: Number(row?.member_count ?? 0),
    itemCount: Number(row?.item_count ?? 0),
    entryCount: Number(row?.entry_count ?? 0),
  };
}

export async function listRoundsForItem(itemId: string) {
  return db
    .select({
      id: events.id,
      nameEn: events.nameEn,
      nameTh: events.nameTh,
      status: events.status,
    })
    .from(eventItems)
    .innerJoin(events, eq(events.id, eventItems.eventId))
    .where(eq(eventItems.itemId, itemId))
    .orderBy(desc(events.startsOn));
}
