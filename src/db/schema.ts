import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

export const userRoleEnum = pgEnum("user_role", ["member", "admin"]);

export const eventStatusEnum = pgEnum("event_status", [
  "draft",
  "open",
  "locked",
  "completed",
]);

/** See `src/lib/policy.ts` for what each wishlist type means. */
export const wishlistTypeEnum = pgEnum("wishlist_type", [
  "gear_queue",
  "random_queue",
  "title_random",
  "fifo_queue",
]);

export const registrationStatusEnum = pgEnum("registration_status", [
  /** Waiting for the round to be drawn. */
  "pending",
  /** Queue was drawn; awaiting the manager's auction decision. */
  "allocated",
  /** Legacy status from the removed member-claim workflow. */
  "auctioned",
  /** Member confirmed receiving the item. */
  "received",
  /** Legacy status for an entry that missed out. */
  "unfilled",
  /** Did not have enough diamonds. Does not carry. */
  "forfeited",
  /** Legacy status for an entry that was deferred. */
  "skipped",
  /** Excluded by an active bid ban. Does not carry. */
  "penalized",
  /** Withdrawn by the member or a manager. */
  "withdrawn",
]);

export const allocationStatusEnum = pgEnum("allocation_status", [
  "proposed",
  "auctioned",
  "received",
  "forfeited",
  "skipped",
]);

export const itemCategoryEnum = pgEnum("item_category", [
  "accessory",
  "card",
  "pet",
  "box",
  "title",
  "weapon",
  "armor",
  "costume",
  "material",
  "consumable",
  "other",
]);

export const users = pgTable("user", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  role: userRoleEnum("role").notNull().default("member"),
  characterName: text("character_name"),
  /** 8-digit in-game ID shown on the character screen. */
  inGameId: text("in_game_id"),
  /**
   * Gear Rating as submitted for the current week. Registrations snapshot this
   * value, because the policy orders Gear Rating queues by the figure submitted
   * at the start of the week.
   */
  gearRating: integer("gear_rating"),
  /** Set when the member submits Gear Rating for a specific open round. */
  gearRatingSubmittedEventId: uuid("gear_rating_submitted_event_id").references(
    () => events.id,
    { onDelete: "set null" },
  ),
  isActive: boolean("is_active").notNull().default(true),
  /** Latest Discord guild role IDs, refreshed on sign-in or member sync. */
  discordRoleIds: text("discord_role_ids").array(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const accounts = pgTable(
  "account",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ],
);

export const sessions = pgTable("session", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_token",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.identifier, table.token] })],
);

/** Item master data. An item may support more than one queue type. */
export const items = pgTable(
  "item",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nameEn: text("name_en").notNull(),
    nameTh: text("name_th"),
    category: itemCategoryEnum("category").notNull().default("other"),
    wishlistType: wishlistTypeEnum("wishlist_type")
      .notNull()
      .default("gear_queue"),
    queueTypes: wishlistTypeEnum("queue_types")
      .array()
      .notNull()
      .default(sql`ARRAY['gear_queue']::wishlist_type[]`),
    /** Optional legacy column; no longer enforced. Kept null for all items. */
    maxQuantityPerMember: integer("max_quantity_per_member"),
    /** Minimum starstone bid for guild auction of this item. */
    minStarstone: integer("min_starstone"),
    imageUrl: text("image_url"),
    descriptionEn: text("description_en"),
    descriptionTh: text("description_th"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("item_name_en_unique").on(table.nameEn)],
);

/** A weekly round. Members register while the round is `open`. */
export const events = pgTable("event", {
  id: uuid("id").primaryKey().defaultRandom(),
  nameEn: text("name_en").notNull(),
  nameTh: text("name_th"),
  startsOn: date("starts_on"),
  endsOn: date("ends_on"),
  status: eventStatusEnum("status").notNull().default("draft"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Which catalogue items are queueable in this round. */
export const eventItems = pgTable(
  "event_item",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    itemId: uuid("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "restrict" }),
    /** Queue types offered this round; queues are kept separate by type. */
    queueTypes: wishlistTypeEnum("queue_types")
      .array()
      .notNull()
      .default(sql`ARRAY['gear_queue']::wishlist_type[]`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("event_item_unique").on(table.eventId, table.itemId),
    index("event_item_event_idx").on(table.eventId),
  ],
);

/**
 * One member's wishlist entry for one item in one round.
 *
 * Continuity between rounds comes from carry-over rather than a standing queue:
 * an entry that missed out is copied into the next round with `carryDepth`
 * incremented, and carried entries are drawn ahead of fresh registrations.
 */
export const registrations = pgTable(
  "registration",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    itemId: uuid("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** The queue joined for this item. One member may join multiple queue types. */
    queueType: wishlistTypeEnum("queue_type")
      .notNull()
      .default("gear_queue"),
    quantityRequested: integer("quantity_requested").notNull().default(1),
    /** Gear Rating submitted for this round, used for ordering and budgets. */
    gearRatingSnapshot: integer("gear_rating_snapshot"),
    /** Assigned when a random-order queue is shuffled, then kept stable. */
    randomOrder: doublePrecision("random_order"),
    /** 0 for a fresh registration; incremented on every carry-over. */
    carryDepth: integer("carry_depth").notNull().default(0),
    /** The rank this entry held last round, preserving carried queue order. */
    priorRank: integer("prior_rank"),
    /** The entry in the previous round that this one carried over from. */
    carriedFromId: uuid("carried_from_id"),
    /** Final position in this round's queue, recorded by the draw. */
    finalRank: integer("final_rank"),
    status: registrationStatusEnum("status").notNull().default("pending"),
    registeredAt: timestamp("registered_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    settledAt: timestamp("settled_at", { withTimezone: true }),
    note: text("note"),
  },
  (table) => [
    // One entry per member per item and queue type per round.
    uniqueIndex("registration_unique").on(
      table.eventId,
      table.itemId,
      table.userId,
      table.queueType,
    ),
    index("registration_round_idx").on(table.eventId, table.itemId),
    index("registration_user_idx").on(table.userId),
  ],
);

/** The outcome of a draw: the requested quantity and the manager's decision. */
export const allocations = pgTable(
  "allocation",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventItemId: uuid("event_item_id")
      .notNull()
      .references(() => eventItems.id, { onDelete: "cascade" }),
    registrationId: uuid("registration_id")
      .notNull()
      .references(() => registrations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    slot: integer("slot").notNull(),
    quantityRequested: integer("quantity_requested").notNull().default(1),
    /** Quantity the manager proposed for this queued member. */
    quantityAllocated: integer("quantity_allocated").notNull().default(1),
    status: allocationStatusEnum("status").notNull().default("proposed"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    settledAt: timestamp("settled_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("allocation_registration_unique").on(table.registrationId),
    index("allocation_event_item_idx").on(table.eventItemId),
  ],
);

/**
 * Bid bans issued for bidding out of turn. While a ban is active the member
 * cannot register and is excluded from draws.
 */
export const penalties = pgTable(
  "penalty",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    startsOn: date("starts_on").notNull(),
    endsOn: date("ends_on").notNull(),
    reason: text("reason"),
    issuedById: uuid("issued_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("penalty_user_idx").on(table.userId),
    index("penalty_window_idx").on(table.endsOn),
  ],
);

/** Bilingual key/value store for editable guild content such as the rules. */
export const settings = pgTable("setting", {
  key: text("key").primaryKey(),
  valueEn: text("value_en"),
  valueTh: text("value_th"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const SETTING_KEYS = {
  rules: "rules",
} as const;

/** Registration outcomes that roll into the next round. */
export const CARRY_OVER_STATUSES = [
  "pending",
  "allocated",
  "unfilled",
  "skipped",
] as const;

export const activePenaltyCondition = sql`
  ${penalties.startsOn} <= CURRENT_DATE AND ${penalties.endsOn} >= CURRENT_DATE
`;

export type User = typeof users.$inferSelect;
export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
export type Event = typeof events.$inferSelect;
export type EventItem = typeof eventItems.$inferSelect;
export type Registration = typeof registrations.$inferSelect;
export type Allocation = typeof allocations.$inferSelect;
export type Penalty = typeof penalties.$inferSelect;
