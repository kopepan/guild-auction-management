import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { eventItems, items, registrations, users } from "@/db/schema";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { hasGearQueueSlotUsed } from "@/lib/gear-queue-limit";
import {
  itemAllowsQuantity,
  normalizeWishlistType,
  normalizeWishlistTypes,
  WISHLIST_TYPES,
  type WishlistType,
  wishlistTypeRules,
} from "@/lib/policy";
import { getRegistrationRound, hasActivePenalty } from "@/lib/queries";

export type WishlistCommandResult = {
  ok: boolean;
  message: TranslationKey;
};

function revalidateWishlistPages(eventId: string) {
  revalidatePath("/");
  revalidatePath("/wishlist");
  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/admin/events/${eventId}`);
}

/**
 * Shared registration path for the website and the Discord bot.
 */
export async function registerForWishlist(input: {
  userId: string;
  itemId: string;
  queueType: WishlistType;
  quantity?: number;
}): Promise<WishlistCommandResult> {
  const { userId, itemId } = input;
  if (!itemId) return { ok: false, message: "error.notFound" };
  if (!WISHLIST_TYPES.includes(input.queueType)) {
    return { ok: false, message: "error.invalidInput" };
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  if (!user) return { ok: false, message: "error.unauthorized" };
  if (!user.isActive) return { ok: false, message: "error.memberInactive" };
  if (user.gearRating == null) {
    return { ok: false, message: "error.gearRatingRequired" };
  }

  const round = await getRegistrationRound();
  if (!round) return { ok: false, message: "error.noOpenRound" };
  if (user.gearRatingSubmittedEventId !== round.id) {
    return { ok: false, message: "error.gearRatingRequired" };
  }

  if (await hasActivePenalty(userId)) {
    return { ok: false, message: "error.penaltyActive" };
  }

  const offered = await db
    .select({
      itemId: eventItems.itemId,
      queueTypes: eventItems.queueTypes,
    })
    .from(eventItems)
    .where(and(eq(eventItems.eventId, round.id), eq(eventItems.itemId, itemId)));
  if (offered.length === 0) return { ok: false, message: "error.itemNotInRound" };
  if (
    !normalizeWishlistTypes(offered[0].queueTypes).includes(input.queueType)
  ) {
    return { ok: false, message: "error.itemNotInRound" };
  }

  const item = await db.query.items.findFirst({ where: eq(items.id, itemId) });
  if (!item) return { ok: false, message: "error.notFound" };
  if (!item.isActive) return { ok: false, message: "error.itemInactive" };

  const rules = wishlistTypeRules[input.queueType];
  const allowsQuantity = itemAllowsQuantity(item.nameEn);

  let quantity = 1;
  if (allowsQuantity) {
    quantity = Number(input.quantity ?? 1);
    if (!Number.isInteger(quantity) || quantity < 1) {
      return { ok: false, message: "error.quantityRange" };
    }
  }

  const mine = await db
    .select({
      id: registrations.id,
      itemId: registrations.itemId,
      queueType: registrations.queueType,
    })
    .from(registrations)
    .where(
      and(
        eq(registrations.eventId, round.id),
        eq(registrations.userId, userId),
        inArray(registrations.status, [
          "pending",
          "allocated",
          "auctioned",
          "received",
        ]),
      ),
    );

  if (
    mine.some(
      (entry) =>
        entry.itemId === itemId &&
        normalizeWishlistType(entry.queueType) === input.queueType,
    )
  ) {
    return { ok: false, message: "error.alreadyRegistered" };
  }

  if (rules.countsTowardWeeklyLimit) {
    if (await hasGearQueueSlotUsed(userId, round.id)) {
      return { ok: false, message: "error.weeklyGearLimit" };
    }
  }

  if (input.queueType !== "gear_queue") {
    const hasGearQueueItems = await db
      .select({ queueTypes: eventItems.queueTypes })
      .from(eventItems)
      .where(eq(eventItems.eventId, round.id));
    const gearItemsExist = hasGearQueueItems.some((row) =>
      normalizeWishlistTypes(row.queueTypes).includes("gear_queue"),
    );
    if (gearItemsExist && !(await hasGearQueueSlotUsed(userId, round.id))) {
      return { ok: false, message: "error.completeGearQueueFirst" };
    }
  }

  const [entry] = await db
    .insert(registrations)
    .values({
      eventId: round.id,
      itemId,
      userId,
      queueType: input.queueType,
      quantityRequested: quantity,
      gearRatingSnapshot: user.gearRating,
    })
    .onConflictDoUpdate({
      target: [
        registrations.eventId,
        registrations.itemId,
        registrations.userId,
        registrations.queueType,
      ],
      setWhere: eq(registrations.status, "withdrawn"),
      set: {
        quantityRequested: quantity,
        gearRatingSnapshot: user.gearRating,
        status: "pending",
        registeredAt: new Date(),
        settledAt: null,
        randomOrder: null,
        finalRank: null,
      },
    })
    .returning({ id: registrations.id });

  if (!entry) return { ok: false, message: "error.alreadyRegistered" };

  revalidateWishlistPages(round.id);
  return { ok: true, message: "wishlist.registered" };
}

/**
 * Withdraws the caller's pending entry for one item queue in the open round.
 */
export async function withdrawFromWishlist(input: {
  userId: string;
  itemId: string;
  queueType: WishlistType;
}): Promise<WishlistCommandResult> {
  const { userId, itemId } = input;
  if (!itemId) return { ok: false, message: "error.notFound" };
  if (!WISHLIST_TYPES.includes(input.queueType)) {
    return { ok: false, message: "error.invalidInput" };
  }

  const round = await getRegistrationRound();
  if (!round) return { ok: false, message: "error.noOpenRound" };

  const candidates = await db.query.registrations.findMany({
    where: and(
      eq(registrations.eventId, round.id),
      eq(registrations.itemId, itemId),
      eq(registrations.userId, userId),
    ),
  });
  const entry = candidates.find(
    (row) => normalizeWishlistType(row.queueType) === input.queueType,
  );
  if (!entry) {
    return { ok: false, message: "error.notFound" };
  }
  if (entry.status !== "pending") {
    return { ok: false, message: "error.roundClosed" };
  }

  await db
    .update(registrations)
    .set({ status: "withdrawn", settledAt: new Date() })
    .where(eq(registrations.id, entry.id));

  revalidateWishlistPages(entry.eventId);
  return { ok: true, message: "wishlist.withdrawn" };
}

export async function itemNeedsQuantity(itemId: string): Promise<boolean> {
  const item = await db.query.items.findFirst({ where: eq(items.id, itemId) });
  if (!item) return false;
  return itemAllowsQuantity(item.nameEn);
}
