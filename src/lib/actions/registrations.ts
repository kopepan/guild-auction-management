"use server";

import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { allocations, registrations, users } from "@/db/schema";
import { assertUser } from "@/lib/guards";
import {
  failure,
  runAction,
  success,
  type ActionState,
} from "@/lib/actions/types";
import type { WishlistType } from "@/lib/policy";
import { normalizeWishlistType } from "@/lib/policy";
import {
  registerForWishlist,
  withdrawFromWishlist,
} from "@/lib/wishlist-register";
import { getWishlistQueueEntries, getRegistrationRound } from "@/lib/queries";
import {
  canConfirmWishlist,
  memberHasConfirmedWishlist,
} from "@/lib/wishlist-completion";
import { revalidatePath } from "next/cache";

function revalidateWishlistPages(eventId: string) {
  revalidatePath("/");
  revalidatePath("/wishlist");
  revalidatePath("/wishlist/complete");
  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/admin/events/${eventId}`);
}

export async function registerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertUser();

    const itemId = String(formData.get("itemId") ?? "");
    const requestedQueueType = String(
      formData.get("queueType") ?? "",
    ) as WishlistType;
    const quantityRaw = formData.get("quantity");
    const quantity =
      quantityRaw == null || String(quantityRaw).trim() === ""
        ? undefined
        : Number(quantityRaw);

    const result = await registerForWishlist({
      userId: user.id,
      itemId,
      queueType: requestedQueueType,
      quantity,
    });

    return result.ok ? success(result.message) : failure(result.message);
  });
}

export async function withdrawAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertUser();

    const registrationId = String(formData.get("registrationId") ?? "");
    if (!registrationId) return failure("error.notFound");

    const entry = await db.query.registrations.findFirst({
      where: eq(registrations.id, registrationId),
    });
    if (!entry || entry.userId !== user.id) return failure("error.notFound");

    const result = await withdrawFromWishlist({
      userId: user.id,
      itemId: entry.itemId,
      queueType: normalizeWishlistType(entry.queueType),
    });

    return result.ok ? success(result.message) : failure(result.message);
  });
}

/** Managers can pull a member out of a queue on request. */
export async function adminWithdrawAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertUser();
    if (!user.isSystemAdmin) return failure("error.forbidden");

    const registrationId = String(formData.get("registrationId") ?? "");
    if (!registrationId) return failure("error.notFound");

    const [removed] = await db
      .update(registrations)
      .set({ status: "withdrawn", settledAt: new Date() })
      .where(
        and(
          eq(registrations.id, registrationId),
          inArray(registrations.status, ["pending", "allocated"]),
        ),
      )
      .returning({
        eventId: registrations.eventId,
      });

    if (!removed) return failure("error.notFound");

    // Drop any pending allocation so the draw can re-fill the freed slot.
    await db
      .delete(allocations)
      .where(eq(allocations.registrationId, registrationId));

    revalidateWishlistPages(removed.eventId);
    return success("wishlist.withdrawn");
  });
}

export async function fetchWishlistQueueEntriesAction(input: {
  eventId: string;
  itemId: string;
  queueType: WishlistType;
}) {
  const user = await assertUser();
  return getWishlistQueueEntries(
    input.eventId,
    input.itemId,
    input.queueType,
    user.id,
  );
}

export async function confirmWishlistAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertUser();
    const eventId = String(formData.get("eventId") ?? "");
    if (!eventId) return failure("error.notFound");

    const round = await getRegistrationRound();
    if (!round || round.id !== eventId) return failure("error.notFound");

    const check = await canConfirmWishlist(user.id, eventId);
    if (!check.ok) return failure(check.message);

    await db
      .update(users)
      .set({
        wishlistConfirmedEventId: eventId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    revalidateWishlistPages(eventId);
    return success("wishlist.confirmed");
  });
}

export async function editWishlistAction(
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertUser();
    const round = await getRegistrationRound();
    if (!round) return failure("error.notFound");

    if (!(await memberHasConfirmedWishlist(user.id, round.id))) {
      return failure("error.notFound");
    }

    await db
      .update(users)
      .set({
        wishlistConfirmedEventId: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    revalidateWishlistPages(round.id);
    return success("wishlist.editUnlocked");
  });
}
