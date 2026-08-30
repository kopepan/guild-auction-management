/**
 * MoonShade auction policy, kept in one place so the rules the guild actually
 * announces are auditable against the code.
 *
 * Source: the guild's SurveyMonkey wishlist form.
 */

export const WISHLIST_TYPES = [
  "gear_queue",
  "random_queue",
  "fifo_queue",
] as const;

export type WishlistType = (typeof WISHLIST_TYPES)[number];

/** Legacy DB enum value; merged into `random_queue`. */
export type LegacyWishlistType = "title_random";

export type StoredWishlistType = WishlistType | LegacyWishlistType;

export function normalizeWishlistType(type: StoredWishlistType): WishlistType {
  return type === "title_random" ? "random_queue" : type;
}

export function normalizeWishlistTypes(
  types: readonly StoredWishlistType[] | null | undefined,
): WishlistType[] {
  const normalized = (types ?? []).map(normalizeWishlistType);
  return [...new Set(normalized)].filter((type) =>
    WISHLIST_TYPES.includes(type),
  );
}

/** Queue types are processed in this order when a round is drawn. */
export const QUEUE_DRAW_ORDER: WishlistType[] = [
  "gear_queue",
  "random_queue",
  "fifo_queue",
];

/**
 * Type 1 — "ต่อคิวตาม Gear Rating": red accessories and Mirage cards, ordered by
 *   Gear Rating from highest to lowest, one item per member per week.
 * Type 2 — "สุ่มคิว": red accessories, Mirage cards, Rita, Gem Box and Title
 *   items, ordered by a random shuffle.
 * FIFO is not part of the written policy; it is offered for items the managers
 *   would rather hand out in registration order.
 */
export const wishlistTypeRules: Record<
  WishlistType,
  {
    /** How the waiting list is sorted. */
    ordering: "gear_rating" | "random" | "registered_at";
    /** Members may ask for more than one unit. */
    allowsQuantity: boolean;
    /** Counts against the single gear-queue registration allowed each week. */
    countsTowardWeeklyLimit: boolean;
  }
> = {
  gear_queue: {
    ordering: "gear_rating",
    allowsQuantity: false,
    countsTowardWeeklyLimit: true,
  },
  random_queue: {
    ordering: "random",
    /** Quantity is gated per item — see `itemAllowsQuantity`. */
    allowsQuantity: false,
    countsTowardWeeklyLimit: false,
  },
  fifo_queue: {
    ordering: "registered_at",
    allowsQuantity: false,
    countsTowardWeeklyLimit: false,
  },
};

/**
 * Only these catalogue items let members request a quantity in the random
 * queue. Everything else is one unit per registration.
 */
const QUANTITY_ITEM_NAMES = new Set([
  "Advanced Gem Box",
  "Green Title Upgrade",
  "Blue Title Upgrade",
  "Purple Title Upgrade",
  "Orange Title Upgrade",
  "อัพยศเขียว",
  "อัพยศฟ้า",
  "อัพยศม่วง",
  "อัพยศส้ม",
  // Legacy seed names before title upgrades were split by colour.
  "อัพยศ",
  "Traveler's Note",
]);

export function itemAllowsQuantity(nameEn: string): boolean {
  return QUANTITY_ITEM_NAMES.has(nameEn);
}
