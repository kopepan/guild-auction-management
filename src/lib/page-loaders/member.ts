import { devLoginEnabled } from "@/auth";
import { SETTING_KEYS } from "@/db/schema";
import { getSessionUser } from "@/lib/guards";
import { getLocale } from "@/lib/i18n/server";
import { localized } from "@/lib/i18n/localized";
import {
  adminRootRedirect,
  auctionRegisterRedirect,
  gearRatingCompleteRedirect,
  gearRatingRequiredRedirect,
  loginRedirect,
  profileRegistrationRedirect,
  registrationRedirectForActor,
  requireUserRedirect,
  wishlistConfirmedRedirect,
  wishlistNotConfirmedRedirect,
} from "@/lib/page-loaders/guards";
import {
  notFound,
  pageData,
  redirectTo,
  type PageLoaderResult,
} from "@/lib/page-loaders/types";
import { buildWishlistCards } from "@/lib/wishlist-cards";
import { canConfirmWishlist } from "@/lib/wishlist-completion";
import { hasGearQueueSlotUsed } from "@/lib/gear-queue-limit";
import { itemAllowsQuantity } from "@/lib/policy";
import {
  ensureRoundHasActiveCatalogue,
  getActivePenaltyForUser,
  getCurrentRound,
  getDashboardStats,
  getEvent,
  getMyRoundEntries,
  getRegistrationRound,
  getRoundQueues,
  getSetting,
  listActivePenalties,
  listEvents,
  listPenaltiesForUser,
  listRoundItems,
  listWishlistRoundItems,
  queueKey,
} from "@/lib/queries";

const discordConfigured = Boolean(
  process.env.AUTH_DISCORD_ID && process.env.AUTH_DISCORD_SECRET,
);

export async function loadDashboard(): Promise<PageLoaderResult<unknown>> {
  const adminRedirect = await adminRootRedirect();
  if (adminRedirect) return redirectTo(adminRedirect);

  const regRedirect = await registrationRedirectForActor();
  if (regRedirect) return redirectTo(regRedirect);

  const user = await getSessionUser();
  const round = await getCurrentRound();
  const [stats, allRounds, myEntries, activePenalties] = await Promise.all([
    getDashboardStats(),
    listEvents(),
    user && round ? getMyRoundEntries(round.id, user.id) : Promise.resolve([]),
    user ? listActivePenalties() : Promise.resolve([]),
  ]);

  const profileComplete = user?.gearRating != null;
  const penalty = user
    ? activePenalties.find((row) => row.userId === user.id)
    : undefined;

  return pageData({
    user: user
      ? {
          name: user.name,
          characterName: user.characterName,
          gearRating: user.gearRating,
        }
      : null,
    round,
    stats,
    allRounds,
    myEntries,
    penalty,
    profileComplete,
  });
}

export async function loadLogin(): Promise<PageLoaderResult<unknown>> {
  const redirect = await loginRedirect();
  if (redirect) return redirectTo(redirect);

  return pageData({ discordConfigured, devLoginEnabled });
}

export async function loadProfile(): Promise<PageLoaderResult<unknown>> {
  const regRedirect = await profileRegistrationRedirect();
  if (regRedirect) return redirectTo(regRedirect);

  const loginRedirectPath = await requireUserRedirect();
  if (loginRedirectPath) return redirectTo(loginRedirectPath);

  const user = await getSessionUser();
  if (!user) return redirectTo("/login");

  const penalties = await listPenaltiesForUser(user.id);

  return pageData({
    gearRating: user.gearRating,
    penalties,
  });
}

export async function loadEvents(): Promise<PageLoaderResult<unknown>> {
  const regRedirect = await registrationRedirectForActor();
  if (regRedirect) return redirectTo(regRedirect);

  const events = await listEvents();

  return pageData({ events });
}

export async function loadEventDetail(
  id: string,
): Promise<PageLoaderResult<unknown>> {
  const regRedirect = await registrationRedirectForActor();
  if (regRedirect) return redirectTo(regRedirect);

  const event = await getEvent(id);
  if (!event || event.status === "draft") return notFound();

  const user = await getSessionUser();
  const currentRound = await getCurrentRound();

  if (event.status === "open") {
    await ensureRoundHasActiveCatalogue(id);
  }
  const roundItems = await listRoundItems(id, user?.id ?? null);
  const queues = await getRoundQueues(
    id,
    roundItems.flatMap((item) =>
      item.queueTypes.map((queueType) => ({
        itemId: item.itemId,
        queueType,
      })),
    ),
  );

  const queuesRecord: Record<
    string,
    ReturnType<typeof queues.get> extends infer T ? NonNullable<T> : never
  > = {};
  for (const [key, entries] of queues.entries()) {
    queuesRecord[key] = entries;
  }

  return pageData({
    event,
    currentRoundId: currentRound?.id ?? null,
    userId: user?.id ?? null,
    roundItems,
    queues: queuesRecord,
  });
}

export async function loadRules(): Promise<PageLoaderResult<unknown>> {
  const regRedirect = await registrationRedirectForActor();
  if (regRedirect) return redirectTo(regRedirect);

  const [user, setting] = await Promise.all([
    getSessionUser(),
    getSetting(SETTING_KEYS.rules),
  ]);

  return pageData({
    isAdmin: user?.role === "admin",
    valueEn: setting?.valueEn ?? null,
    valueTh: setting?.valueTh ?? null,
  });
}

export async function loadWishlist(): Promise<PageLoaderResult<unknown>> {
  const loginRedirectPath = await requireUserRedirect();
  if (loginRedirectPath) return redirectTo(loginRedirectPath);

  const grRedirect = await gearRatingRequiredRedirect();
  if (grRedirect) return redirectTo(grRedirect);

  const confirmedRedirect = await wishlistConfirmedRedirect();
  if (confirmedRedirect) return redirectTo(confirmedRedirect);

  const user = await getSessionUser();
  if (!user) return redirectTo("/login");

  const locale = await getLocale();
  const round = await getRegistrationRound();

  if (!round) {
    return pageData({ round: null });
  }

  const [roundItems, penalty, gearLimitUsed, confirmCheck] = await Promise.all([
    listWishlistRoundItems(round.id, user.id),
    getActivePenaltyForUser(user.id),
    hasGearQueueSlotUsed(user.id, round.id),
    canConfirmWishlist(user.id, round.id),
  ]);

  const { cards, gearStepComplete } = buildWishlistCards({
    locale,
    user,
    roundItems,
    penalty,
    gearLimitUsed,
  });

  return pageData({
    round,
    penalty,
    gearLimitUsed,
    cards,
    gearStepComplete,
    confirmCheck,
    isSystemAdmin: user.isSystemAdmin,
  });
}

export async function loadWishlistComplete(): Promise<PageLoaderResult<unknown>> {
  const loginRedirectPath = await requireUserRedirect();
  if (loginRedirectPath) return redirectTo(loginRedirectPath);

  const grRedirect = await gearRatingRequiredRedirect();
  if (grRedirect) return redirectTo(grRedirect);

  const notConfirmedRedirect = await wishlistNotConfirmedRedirect();
  if (notConfirmedRedirect) return redirectTo(notConfirmedRedirect);

  const user = await getSessionUser();
  if (!user) return redirectTo("/login");

  const locale = await getLocale();
  const round = await getRegistrationRound();
  if (!round) return redirectTo("/wishlist");

  const roundItems = await listWishlistRoundItems(round.id, user.id);

  const cards = roundItems.flatMap((item) =>
    item.queues.map((queue) => ({
      itemId: item.itemId,
      name: localized(locale, item.nameEn, item.nameTh),
      description: localized(
        locale,
        item.descriptionEn ?? "",
        item.descriptionTh,
      ),
      imageUrl: item.imageUrl,
      wishlistType: queue.queueType,
      category: item.category,
      allowsQuantity: itemAllowsQuantity(item.nameEn),
      queueLength: queue.registrationCount,
      queueEntries: queue.entries,
      registration: queue.myRegistration,
      blockedReason: null,
    })),
  );

  return pageData({
    round,
    cards,
    isSystemAdmin: user.isSystemAdmin,
  });
}

export async function loadRegisterGearRating(): Promise<PageLoaderResult<unknown>> {
  const completeRedirect = await gearRatingCompleteRedirect();
  if (completeRedirect) return redirectTo(completeRedirect);

  const round = await getRegistrationRound();
  if (!round) return redirectTo("/wishlist");

  return pageData({ round });
}

export async function loadAuctionRegister(): Promise<PageLoaderResult<unknown>> {
  const redirect = await auctionRegisterRedirect();
  return redirectTo(redirect);
}
