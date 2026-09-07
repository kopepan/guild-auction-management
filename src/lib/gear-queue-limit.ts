import { and, eq, inArray, ne } from "drizzle-orm";

import { db } from "@/db";
import { registrations } from "@/db/schema";
import {
  normalizeWishlistType,
  wishlistTypeRules,
  type WishlistType,
} from "@/lib/policy";

/**
 * Statuses that occupy the single gear-queue slot for a round.
 * `withdrawn` is excluded so members can switch items while registration is open.
 */
const GEAR_SLOT_ACTIVE_STATUSES = [
  "pending",
  "allocated",
  "auctioned",
  "received",
  "forfeited",
  "skipped",
  "unfilled",
] as const;

function isGearQueueType(queueType: string): boolean {
  return wishlistTypeRules[normalizeWishlistType(queueType as WishlistType)]
    .countsTowardWeeklyLimit;
}

/**
 * True when the member already has an active Gear Rating queue entry this round
 * (pending or past draw). Withdrawn entries do not count — switching is allowed.
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
