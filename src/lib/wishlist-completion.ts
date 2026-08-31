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

  if (
    record.gearRating == null ||
    record.gearRatingSubmittedEventId !== roundId
  ) {
    return { ok: false, message: "error.gearRatingRequired" };
  }

  if (record.wishlistConfirmedEventId === roundId) {
    return { ok: false, message: "wishlist.alreadyConfirmed" };
  }

  const roundItems = await db
    .select({ queueTypes: eventItems.queueTypes })
    .from(eventItems)
    .where(eq(eventItems.eventId, roundId));

  const hasGearQueueItems = roundItems.some((row) =>
    normalizeWishlistTypes(row.queueTypes).includes("gear_queue"),
  );
  if (hasGearQueueItems && !(await hasGearQueueSlotUsed(userId, roundId))) {
    return { ok: false, message: "error.completeGearQueueFirst" };
  }

  const [entry] = await db
    .select({ id: registrations.id })
    .from(registrations)
    .where(
      and(
        eq(registrations.eventId, roundId),
        eq(registrations.userId, userId),
        eq(registrations.status, "pending"),
      ),
    )
    .limit(1);

  if (!entry) return { ok: false, message: "wishlist.confirmNeedsEntry" };

  return { ok: true };
}
