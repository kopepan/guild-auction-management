import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";
import { getSessionUser, type SessionUser } from "@/lib/guards";
import { getRegistrationRound } from "@/lib/queries";
import { memberHasConfirmedWishlist } from "@/lib/wishlist-completion";
import { actsAsMember, isViewAsMember } from "@/lib/view-as-member";

const REGISTRATION_MEMBER_PATHS = [
  "/auction-register",
  "/wishlist",
  "/register/gear-rating",
  "/login",
] as const;

async function getRegistrationActor() {
  const user = await getSessionUser();
  if (!user) return null;

  const viewAsMember = user.isSystemAdmin && (await isViewAsMember());
  return {
    user,
    viewAsMember,
    actsAsMember: actsAsMember({ isSystemAdmin: user.isSystemAdmin, viewAsMember }),
  };
}

export async function memberHasGearRatingForRound(
  userId: string,
  roundId: string,
): Promise<boolean> {
  const record = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  return (
    record?.gearRating != null &&
    record.gearRatingSubmittedEventId === roundId
  );
}

/** Member landing page while registration is open (GR → wishlist → complete). */
export async function getRegistrationEntryPath(
  user: Pick<
    SessionUser,
    "id" | "gearRating" | "gearRatingSubmittedEventId"
  >,
): Promise<"/register/gear-rating" | "/wishlist" | "/wishlist/complete"> {
  const round = await getRegistrationRound();
  if (!round) return "/wishlist";

  const grComplete =
    user.gearRating != null && user.gearRatingSubmittedEventId === round.id;
  if (!grComplete) return "/register/gear-rating";

  if (await memberHasConfirmedWishlist(user.id, round.id)) {
    return "/wishlist/complete";
  }
  return "/wishlist";
}

/**
 * Managers land on the admin console instead of the member dashboard.
 */
export async function redirectAdminFromRoot() {
  const user = await getSessionUser();
  if (!user?.isSystemAdmin) return;
  if (await isViewAsMember()) return;
  redirect("/admin");
}

/**
 * During an open round, members may only browse registration-related pages.
 */
export async function redirectMemberDuringRegistration() {
  const actor = await getRegistrationActor();
  if (!actor?.actsAsMember) return;

  const round = await getRegistrationRound();
  if (!round) return;

  redirect(await getRegistrationEntryPath(actor.user));
}

/**
 * Sends members to the Gear Rating page until they submit a figure for this round.
 */
export async function requireGearRatingForRegistrationRound() {
  const actor = await getRegistrationActor();
  if (!actor?.actsAsMember) return;

  const round = await getRegistrationRound();
  if (!round) return;

  const complete =
    actor.user.gearRating != null &&
    actor.user.gearRatingSubmittedEventId === round.id;
  if (!complete) redirect("/register/gear-rating");
}

/** Gear Rating page: skip if already submitted for the open round. */
export async function redirectIfGearRatingCompleteForRound() {
  const actor = await getRegistrationActor();
  if (!actor) redirect("/login");
  if (!actor.actsAsMember) redirect("/wishlist");

  const round = await getRegistrationRound();
  if (!round) redirect("/wishlist");

  const complete =
    actor.user.gearRating != null &&
    actor.user.gearRatingSubmittedEventId === round.id;
  if (complete) redirect(await getRegistrationEntryPath(actor.user));
}

/** Full profile is hidden during registration; send members to GR or wishlist. */
export async function redirectProfileDuringRegistration() {
  const actor = await getRegistrationActor();
  if (!actor?.actsAsMember) return;

  const round = await getRegistrationRound();
  if (!round) return;

  const complete =
    actor.user.gearRating != null &&
    actor.user.gearRatingSubmittedEventId === round.id;
  redirect(await getRegistrationEntryPath(actor.user));
}

/** Wishlist page: skip if already confirmed for the open round. */
export async function redirectIfWishlistConfirmedForRound() {
  const actor = await getRegistrationActor();
  if (!actor?.actsAsMember) return;

  const round = await getRegistrationRound();
  if (!round) return;

  if (await memberHasConfirmedWishlist(actor.user.id, round.id)) {
    redirect("/wishlist/complete");
  }
}

/** Completion page: require confirmation for the open round. */
export async function requireWishlistConfirmedForRound() {
  const actor = await getRegistrationActor();
  if (!actor) redirect("/login");
  if (!actor.actsAsMember) redirect("/wishlist");

  const round = await getRegistrationRound();
  if (!round) redirect("/wishlist");

  if (!(await memberHasConfirmedWishlist(actor.user.id, round.id))) {
    redirect("/wishlist");
  }
}

export function isRegistrationMemberPath(pathname: string): boolean {
  return REGISTRATION_MEMBER_PATHS.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * True while an open round is accepting registrations and the viewer is not an admin.
 */
export function shouldUseRegistrationChrome(input: {
  registrationRound: { id: string } | null | undefined;
  user: { isSystemAdmin: boolean } | null;
  viewAsMember?: boolean;
}): boolean {
  if (!input.registrationRound || !input.user) return false;

  return actsAsMember({
    isSystemAdmin: input.user.isSystemAdmin,
    viewAsMember: Boolean(input.viewAsMember),
  });
}
