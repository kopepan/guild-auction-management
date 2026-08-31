import { and, eq, inArray, ne } from "drizzle-orm";

import { db } from "@/db";
import { registrations } from "@/db/schema";
import {
  normalizeWishlistType,
  wishlistTypeRules,
  type WishlistType,
} from "@/lib/policy";

/** Statuses that still occupy the single gear-queue slot for a round. */
const GEAR_SLOT_ACTIVE_STATUSES = [
  "pending",
  "allocated",
  "auctioned",
  "received",
  "forfeited",
  "skipped",
  "unfilled",
  "withdrawn",
] as const;

function isGearQueueType(queueType: string): boolean {
  return wishlistTypeRules[normalizeWishlistType(queueType as WishlistType)]
    .countsTowardWeeklyLimit;
}

/**
 * True when the member has already used their one Gear Rating queue slot this
 * round — including carried entries and withdrawn attempts (no swapping items).
 */
export async function hasGearQueueSlotUsed(
  userId: string,
  roundId: string,
): Promise<boolean> {
  const rows = await db
    .select({ queueType: registrations.queueType })
    .from(registrations)
    .where(
      and(
        eq(registrations.eventId, roundId),
        eq(registrations.userId, userId),
        inArray(registrations.status, [...GEAR_SLOT_ACTIVE_STATUSES]),
      ),
    );

  return rows.some((row) => isGearQueueType(row.queueType));
}
