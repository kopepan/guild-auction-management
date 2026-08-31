import { getSessionUser } from "@/lib/guards";
import {
  getRegistrationEntryPath,
  memberHasGearRatingForRound,
} from "@/lib/phase";
import { getRegistrationRound } from "@/lib/queries";
import { memberHasConfirmedWishlist } from "@/lib/wishlist-completion";
import { actsAsMember, isViewAsMember } from "@/lib/view-as-member";

export async function registrationRedirectForActor(): Promise<string | null> {
  const user = await getSessionUser();
  if (!user) return null;

  const viewAsMember = user.isSystemAdmin && (await isViewAsMember());
  if (!actsAsMember({ isSystemAdmin: user.isSystemAdmin, viewAsMember })) {
    return null;
  }

  const round = await getRegistrationRound();
  if (!round) return null;

  return getRegistrationEntryPath(user);
}

export async function adminRootRedirect(): Promise<string | null> {
  const user = await getSessionUser();
  if (!user?.isSystemAdmin) return null;
  if (await isViewAsMember()) return null;
  return "/admin";
}

export async function requireUserRedirect(): Promise<string | null> {
  const user = await getSessionUser();
  return user ? null : "/login";
}

export async function requireAdminRedirect(): Promise<string | null> {
  const login = await requireUserRedirect();
  if (login) return login;

  const user = await getSessionUser();
  if (!user?.isSystemAdmin) return "/";
  return null;
}

export async function gearRatingRequiredRedirect(): Promise<string | null> {
  const login = await requireUserRedirect();
  if (login) return login;

  const user = await getSessionUser();
  if (!user) return "/login";

  const viewAsMember = user.isSystemAdmin && (await isViewAsMember());
  if (!actsAsMember({ isSystemAdmin: user.isSystemAdmin, viewAsMember })) {
    return null;
  }

  const round = await getRegistrationRound();
  if (!round) return null;

  const complete = await memberHasGearRatingForRound(user.id, round.id);
  return complete ? null : "/register/gear-rating";
}

export async function wishlistConfirmedRedirect(): Promise<string | null> {
  const gr = await gearRatingRequiredRedirect();
  if (gr) return gr;

  const user = await getSessionUser();
  if (!user) return "/login";

  const round = await getRegistrationRound();
  if (!round) return null;

  if (await memberHasConfirmedWishlist(user.id, round.id)) {
    return "/wishlist/complete";
  }
  return null;
}

export async function wishlistNotConfirmedRedirect(): Promise<string | null> {
  const gr = await gearRatingRequiredRedirect();
  if (gr) return gr;

  const login = await requireUserRedirect();
  if (login) return login;

  const user = await getSessionUser();
  if (!user) return "/login";

  const viewAsMember = user.isSystemAdmin && (await isViewAsMember());
  if (!actsAsMember({ isSystemAdmin: user.isSystemAdmin, viewAsMember })) {
    return "/wishlist";
  }

  const round = await getRegistrationRound();
  if (!round) return "/wishlist";

  if (!(await memberHasConfirmedWishlist(user.id, round.id))) {
    return "/wishlist";
  }
  return null;
}

export async function gearRatingCompleteRedirect(): Promise<string | null> {
  const user = await getSessionUser();
  if (!user) return "/login";

  const viewAsMember = user.isSystemAdmin && (await isViewAsMember());
  if (!actsAsMember({ isSystemAdmin: user.isSystemAdmin, viewAsMember })) {
    return "/wishlist";
  }

  const round = await getRegistrationRound();
  if (!round) return "/wishlist";

  const complete = await memberHasGearRatingForRound(user.id, round.id);
  if (complete) return getRegistrationEntryPath(user);
  return null;
}

export async function profileRegistrationRedirect(): Promise<string | null> {
  return registrationRedirectForActor();
}

export async function loginRedirect(): Promise<string | null> {
  const user = await getSessionUser();
  if (!user) return null;

  const round = await getRegistrationRound();
  if (!round) return "/";

  const viewAsMember = user.isSystemAdmin && (await isViewAsMember());
  if (user.isSystemAdmin && !viewAsMember) return "/wishlist";

  return getRegistrationEntryPath(user);
}

export async function auctionRegisterRedirect(): Promise<string> {
  const user = await getSessionUser();
  if (!user) return "/login";

  const round = await getRegistrationRound();
  if (!round) return "/";

  const viewAsMember = user.isSystemAdmin && (await isViewAsMember());
  if (user.isSystemAdmin && !viewAsMember) return "/wishlist";

  return getRegistrationEntryPath(user);
}
