import { and, eq, inArray } from "drizzle-orm";

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

type GearSlotStatus = (typeof GEAR_SLOT_ACTIVE_STATUSES)[number];

function isGearQueueType(queueType: string): boolean {
  return wishlistTypeRules[normalizeWishlistType(queueType as WishlistType)]
    .countsTowardWeeklyLimit;
}

function isGearSlotStatus(status: string): status is GearSlotStatus {
  return (GEAR_SLOT_ACTIVE_STATUSES as readonly string[]).includes(status);
}

/** Sync check against rows already loaded for the wishlist page. */
export function gearQueueSlotUsedFromRegistrations(
  rows: ReadonlyArray<{ queueType: string; status: string }>,
): boolean {
  return rows.some(
    (row) => isGearQueueType(row.queueType) && isGearSlotStatus(row.status),
  );
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
    .select({
      queueType: registrations.queueType,
      status: registrations.status,
    })
    .from(registrations)
    .where(
      and(
        eq(registrations.eventId, roundId),
        eq(registrations.userId, userId),
        inArray(registrations.status, [...GEAR_SLOT_ACTIVE_STATUSES]),
      ),
    );

  return gearQueueSlotUsedFromRegistrations(rows);
}
