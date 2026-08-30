import { wishlistTypeRules, type WishlistType } from "@/lib/policy";

export type QueueCandidate = {
  id: string;
  userId: string;
  quantityRequested: number;
  gearRatingSnapshot: number | null;
  randomOrder: number | null;
  carryDepth: number;
  priorRank: number | null;
  registeredAt: Date;
};

function compareNumberDesc(a: number | null, b: number | null): number {
  // Missing values sort last so an unsubmitted Gear Rating never jumps ahead.
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return b - a;
}

function compareNumberAsc(a: number | null, b: number | null): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return a - b;
}

/**
 * Orders one item's waiting list for a round.
 *
 * Carried entries come first, because the policy states that a queue which
 * missed out rolls to the next week and that week's new registrations join
 * behind it. Among carried entries the longest wait leads, and their previous
 * rank is preserved so the order they already earned is not reshuffled. Fresh
 * registrations are then ordered by the item's wishlist type.
 */
export function orderQueue<T extends QueueCandidate>(
  candidates: T[],
  wishlistType: WishlistType,
): T[] {
  const { ordering } = wishlistTypeRules[wishlistType];

  return [...candidates].sort((a, b) => {
    const aCarried = a.carryDepth > 0;
    const bCarried = b.carryDepth > 0;
    if (aCarried !== bCarried) return aCarried ? -1 : 1;

    if (aCarried && bCarried) {
      if (a.carryDepth !== b.carryDepth) return b.carryDepth - a.carryDepth;
      const byPriorRank = compareNumberAsc(a.priorRank, b.priorRank);
      if (byPriorRank !== 0) return byPriorRank;
    } else {
      if (ordering === "gear_rating") {
        const byGear = compareNumberDesc(
          a.gearRatingSnapshot,
          b.gearRatingSnapshot,
        );
        if (byGear !== 0) return byGear;
      } else if (ordering === "random") {
        const byRandom = compareNumberAsc(a.randomOrder, b.randomOrder);
        if (byRandom !== 0) return byRandom;
      }
    }

    const byTime = a.registeredAt.getTime() - b.registeredAt.getTime();
    if (byTime !== 0) return byTime;
    return a.id.localeCompare(b.id);
  });
}
