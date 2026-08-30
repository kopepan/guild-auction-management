import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { events, registrations } from "@/db/schema";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { normalizeWishlistType, type WishlistType } from "@/lib/policy";
import { getEvent } from "@/lib/queries";

export type ReceiptResult = {
  ok: boolean;
  message: TranslationKey;
};

/**
 * Marks a registration as received while its round is closed for registration.
 * Members may only confirm their own entry; admins may confirm any.
 */
export async function markRegistrationReceived(input: {
  registrationId: string;
  actorUserId: string;
  isAdmin: boolean;
}): Promise<ReceiptResult> {
  const entry = await db.query.registrations.findFirst({
    where: eq(registrations.id, input.registrationId),
  });
  if (!entry) return { ok: false, message: "error.notFound" };

  const event = await getEvent(entry.eventId);
  if (!event || event.status !== "locked") {
    return { ok: false, message: "error.registrationClosed" };
  }
  if (!input.isAdmin && entry.userId !== input.actorUserId) {
    return { ok: false, message: "error.forbidden" };
  }
  if (!["pending", "allocated"].includes(entry.status)) {
    return { ok: false, message: "error.roundClosed" };
  }

  await db
    .update(registrations)
    .set({ status: "received", settledAt: new Date() })
    .where(eq(registrations.id, entry.id));

  return { ok: true, message: "receipt.confirmed" };
}

/**
 * Confirms receipt for the caller's own registration on one item queue.
 */
export async function markOwnRegistrationReceived(input: {
  userId: string;
  eventId: string;
  itemId: string;
  queueType: WishlistType;
}): Promise<ReceiptResult> {
  const event = await getEvent(input.eventId);
  if (!event || event.status !== "locked") {
    return { ok: false, message: "error.registrationClosed" };
  }

  const candidates = await db.query.registrations.findMany({
    where: and(
      eq(registrations.eventId, input.eventId),
      eq(registrations.itemId, input.itemId),
      eq(registrations.userId, input.userId),
    ),
  });
  const entry = candidates.find(
    (row) => normalizeWishlistType(row.queueType) === input.queueType,
  );
  if (!entry) return { ok: false, message: "error.notFound" };

  return markRegistrationReceived({
    registrationId: entry.id,
    actorUserId: input.userId,
    isAdmin: false,
  });
}

export async function isRegistrationPhase(eventId: string) {
  const event = await db.query.events.findFirst({ where: eq(events.id, eventId) });
  return event?.status === "open";
}

export async function isAuctionPhase(eventId: string) {
  const event = await db.query.events.findFirst({ where: eq(events.id, eventId) });
  return event?.status === "locked";
}
