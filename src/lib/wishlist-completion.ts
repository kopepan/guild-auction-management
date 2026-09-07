import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { eventItems, registrations, users } from "@/db/schema";
import { hasGearQueueSlotUsed } from "@/lib/gear-queue-limit";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { normalizeWishlistTypes } from "@/lib/policy";

export async function memberHasConfirmedWishlist(
  userId: string,
  roundId: string,
): Promise<boolean> {
  const record = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { wishlistConfirmedEventId: true },
  });
  return record?.wishlistConfirmedEventId === roundId;
}

export function evaluateCanConfirmWishlist(input: {
  gearRating: number | null;
  gearRatingSubmittedEventId: string | null;
  wishlistConfirmedEventId: string | null;
  roundId: string;
  hasGearQueueItems: boolean;
  gearLimitUsed: boolean;
  hasPendingEntry: boolean;
}): { ok: true } | { ok: false; message: TranslationKey } {
  if (
    input.gearRating == null ||
    input.gearRatingSubmittedEventId !== input.roundId
  ) {
    return { ok: false, message: "error.gearRatingRequired" };
  }

  if (input.wishlistConfirmedEventId === input.roundId) {
    return { ok: false, message: "wishlist.alreadyConfirmed" };
  }

  if (input.hasGearQueueItems && !input.gearLimitUsed) {
    return { ok: false, message: "error.completeGearQueueFirst" };
  }

  if (!input.hasPendingEntry) {
    return { ok: false, message: "wishlist.confirmNeedsEntry" };
  }

  return { ok: true };
}

/**
 * True when the member may finish registration: gear obligation met and at
 * least one queue entry exists for this round.
 */
export async function canConfirmWishlist(
  userId: string,
  roundId: string,
): Promise<{ ok: true } | { ok: false; message: TranslationKey }> {
  const record = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      gearRating: true,
      gearRatingSubmittedEventId: true,
      wishlistConfirmedEventId: true,
    },
  });
  if (!record) return { ok: false, message: "error.notFound" };

  const [roundItems, gearLimitUsed, entry] = await Promise.all([
    db
      .select({ queueTypes: eventItems.queueTypes })
      .from(eventItems)
      .where(eq(eventItems.eventId, roundId)),
    hasGearQueueSlotUsed(userId, roundId),
    db
      .select({ id: registrations.id })
      .from(registrations)
      .where(
        and(
          eq(registrations.eventId, roundId),
          eq(registrations.userId, userId),
          eq(registrations.status, "pending"),
        ),
      )
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ]);

  const hasGearQueueItems = roundItems.some((row) =>
    normalizeWishlistTypes(row.queueTypes).includes("gear_queue"),
  );

  return evaluateCanConfirmWishlist({
    gearRating: record.gearRating,
    gearRatingSubmittedEventId: record.gearRatingSubmittedEventId,
    wishlistConfirmedEventId: record.wishlistConfirmedEventId,
    roundId,
    hasGearQueueItems,
    gearLimitUsed,
    hasPendingEntry: Boolean(entry),
  });
}
