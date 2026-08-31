"use server";

import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import {
  accounts,
  allocations,
  CARRY_OVER_STATUSES,
  eventItems,
  events,
  items,
  registrations,
  users,
} from "@/db/schema";
import {
  buildAuctionResultsAnnouncement,
  buildQueueAnnouncement,
  splitDiscordMessage,
} from "@/lib/announcement";
import {
  getAppBaseUrl,
  getDiscordBotToken,
  getDiscordImageUrl,
  getDiscordWebhookUrl,
  postBotChannelMessage,
  resolveWebhookChannelId,
} from "@/lib/discord";
import { assertAdmin } from "@/lib/guards";
import {
  failure,
  runAction,
  success,
  type ActionState,
} from "@/lib/actions/types";
import { orderQueue } from "@/lib/queue";
import { markRegistrationReceived } from "@/lib/receipt";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { getTranslations, localized } from "@/lib/i18n/server";
import {
  normalizeWishlistType,
  normalizeWishlistTypes,
  QUEUE_DRAW_ORDER,
  type WishlistType,
} from "@/lib/policy";
import {
  ensureRoundHasActiveCatalogue,
  getEvent,
  getPreviousRound,
  getRoundQueues,
  listRoundItems,
  queueKey,
} from "@/lib/queries";
import { parseIsoWeek } from "@/lib/week";

const statuses = ["draft", "open", "locked", "completed"] as const;
type EventStatus = (typeof statuses)[number];

function parseWeekFromForm(formData: FormData) {
  const week = String(formData.get("week") ?? "").trim();
  const parsed = parseIsoWeek(week);
  if (!parsed) {
    return { ok: false as const, error: failure("error.invalidInput", { week: "error.invalidWeek" }) };
  }
  return { ok: true as const, parsed };
}

async function assertUniqueWeek(startsOn: string, excludeEventId?: string) {
  const [existing] = await db
    .select({ id: events.id })
    .from(events)
    .where(eq(events.startsOn, startsOn))
    .limit(1);
  if (existing && existing.id !== excludeEventId) {
    return failure("error.roundWeekExists");
  }
  return null;
}

function revalidateEventPages(eventId?: string) {
  revalidatePath("/admin/events");
  revalidatePath("/events");
  revalidatePath("/wishlist");
  revalidatePath("/auction-register");
  revalidatePath("/register/gear-rating");
  revalidatePath("/");
  if (eventId) {
    revalidatePath(`/admin/events/${eventId}`);
    revalidatePath(`/events/${eventId}`);
  }
}

/** Members must submit Gear Rating again when a new registration round opens. */
async function resetGearRatingSubmissionsForNewRound() {
  await db.update(users).set({ gearRatingSubmittedEventId: null });
}

export async function createEventAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await assertAdmin();

    const weekResult = parseWeekFromForm(formData);
    if (!weekResult.ok) return weekResult.error;
    const { parsed } = weekResult;

    const duplicateWeek = await assertUniqueWeek(parsed.startsOn);
    if (duplicateWeek) return duplicateWeek;

    // Only one round may take registrations, otherwise a member's weekly
    // allowances would be ambiguous.
    const [existingOpen] = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.status, "open"))
      .limit(1);
    if (existingOpen) return failure("error.roundAlreadyOpen");

    const [created] = await db
      .insert(events)
      .values({
        nameEn: parsed.nameEn,
        nameTh: parsed.nameTh,
        startsOn: parsed.startsOn,
        endsOn: parsed.endsOn,
        status: "open",
      })
      .returning({ id: events.id });

    if (created) {
      await ensureRoundHasActiveCatalogue(created.id);
      await resetGearRatingSubmissionsForNewRound();
      await carryEligibleEntriesIntoRound(created.id);
    }

    revalidateEventPages();
    return success("adminEvents.created");
  });
}

export async function updateEventAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await assertAdmin();

    const id = String(formData.get("id") ?? "");
    if (!id) return failure("error.notFound");

    const weekResult = parseWeekFromForm(formData);
    if (!weekResult.ok) return weekResult.error;
    const { parsed } = weekResult;

    const status = String(formData.get("status") ?? "open") as EventStatus;
    const resolved =
      status === "draft"
        ? "open"
        : statuses.includes(status)
          ? status
          : "open";

    const current = await getEvent(id);
    if (!current) return failure("error.notFound");

    const duplicateWeek = await assertUniqueWeek(parsed.startsOn, id);
    if (duplicateWeek) return duplicateWeek;

    if (resolved === "open") {
      const [existing] = await db
        .select({ id: events.id })
        .from(events)
        .where(and(eq(events.status, "open"), ne(events.id, id)))
        .limit(1);
      if (existing) return failure("error.roundAlreadyOpen");
    }

    await db
      .update(events)
      .set({
        nameEn: parsed.nameEn,
        nameTh: parsed.nameTh,
        startsOn: parsed.startsOn,
        endsOn: parsed.endsOn,
        status: resolved,
        updatedAt: new Date(),
      })
      .where(eq(events.id, id));

    if (resolved === "open") {
      await ensureRoundHasActiveCatalogue(id);
    }
    if (resolved === "open" && current.status !== "open") {
      await resetGearRatingSubmissionsForNewRound();
      await carryEligibleEntriesIntoRound(id);
    } else if (resolved === "open") {
      await carryEligibleEntriesIntoRound(id);
    }

    revalidateEventPages(id);
    return success("adminEvents.updated");
  });
}

export async function deleteEventAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await assertAdmin();

    const id = String(formData.get("id") ?? "");
    if (!id) return failure("error.notFound");

    const [existing] = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.id, id))
      .limit(1);
    if (!existing) return failure("error.notFound");

    await db.delete(events).where(eq(events.id, id));
    revalidateEventPages(id);
    return success("adminEvents.deleted");
  });
}

/**
 * Assigns a random position to every entry in a random-order queue that does
 * not have one yet. Positions are then kept across redraws so the shuffle a
 * member was shown cannot silently change; reshuffling is a separate action.
 */
async function assignRandomOrder(eventId: string) {
  await db.execute(sql`
    UPDATE ${registrations} r
    SET random_order = RANDOM()
    FROM ${items} i
    WHERE i.id = r.item_id
      AND r.event_id = ${eventId}::uuid
      AND r.random_order IS NULL
      AND r.queue_type = 'random_queue'
  `);
}

export async function reshuffleAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await assertAdmin();

    const eventId = String(formData.get("eventId") ?? "");
    if (!eventId) return failure("error.notFound");

    const round = await db.query.events.findFirst({
      where: eq(events.id, eventId),
    });
    if (!round) return failure("error.notFound");

    // Carried entries keep the rank they already earned, so only fresh
    // registrations are reshuffled.
    await db.execute(sql`
      UPDATE ${registrations} r
      SET random_order = RANDOM()
      FROM ${items} i
      WHERE i.id = r.item_id
        AND r.event_id = ${eventId}::uuid
        AND r.carry_depth = 0
        AND r.status = 'pending'
        AND r.queue_type = 'random_queue'
    `);

    revalidateEventPages(eventId);
    return success("draw.reshuffled");
  });
}

function discordQueueKey(eventItemId: string, queueType: string) {
  return `${eventItemId}:${queueType}`;
}

async function resolveDiscordChannelId() {
  const webhookUrl = getDiscordWebhookUrl();
  if (!webhookUrl || !getDiscordBotToken()) return null;
  return resolveWebhookChannelId(webhookUrl);
}

/** Rolls eligible unserved entries from the previous round into a new open round. */
async function carryEligibleEntriesIntoRound(eventId: string) {
  const previous = await getPreviousRound(eventId);
  if (!previous) return;

  const offered = await db
    .select({
      itemId: eventItems.itemId,
      queueTypes: eventItems.queueTypes,
    })
    .from(eventItems)
    .where(eq(eventItems.eventId, eventId));
  const offeredQueues = new Map(
    offered.map((row) => [row.itemId, normalizeWishlistTypes(row.queueTypes)]),
  );
  if (offeredQueues.size === 0) return;

  const candidates = await db
    .select({
      id: registrations.id,
      itemId: registrations.itemId,
      userId: registrations.userId,
      quantityRequested: registrations.quantityRequested,
      finalRank: registrations.finalRank,
      carryDepth: registrations.carryDepth,
      status: registrations.status,
      queueType: registrations.queueType,
      allocated: allocations.quantityAllocated,
      gearRatingSnapshot: registrations.gearRatingSnapshot,
    })
    .from(registrations)
    .leftJoin(allocations, eq(allocations.registrationId, registrations.id))
    .where(
      and(
        eq(registrations.eventId, previous.id),
        inArray(registrations.status, [...CARRY_OVER_STATUSES, "received"]),
      ),
    );

  const pending: (typeof registrations.$inferInsert)[] = [];

  for (const candidate of candidates) {
    const queueType = normalizeWishlistType(candidate.queueType);
    if (!offeredQueues.get(candidate.itemId)?.includes(queueType)) continue;

    const allocated = candidate.allocated ?? 0;
    const outstanding =
      candidate.status === "received"
        ? candidate.quantityRequested - allocated
        : candidate.quantityRequested;

    if (outstanding <= 0) continue;

    pending.push({
      eventId,
      itemId: candidate.itemId,
      userId: candidate.userId,
      queueType,
      quantityRequested: outstanding,
      gearRatingSnapshot: candidate.gearRatingSnapshot,
      carryDepth: candidate.carryDepth + 1,
      priorRank: candidate.finalRank,
      carriedFromId: candidate.id,
    });
  }

  if (pending.length === 0) return;

  await db.insert(registrations).values(pending).onConflictDoNothing();
}

/** Posts a Discord message inviting members to register on the website. */
export async function publishRegistrationLinkAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await assertAdmin();

    const eventId = String(formData.get("eventId") ?? "");
    if (!eventId) return failure("error.notFound");

    const event = await getEvent(eventId);
    if (!event) return failure("error.notFound");
    if (event.status !== "open") return failure("error.registrationClosed");

    const channelId = await resolveDiscordChannelId();
    if (!channelId) return failure("discord.botNotConfigured");

    const baseUrl = getAppBaseUrl();
    const registerUrl = baseUrl
      ? `${baseUrl}/auction-register`
      : "/auction-register";
    const { locale, t } = await getTranslations();
    const roundName = localized(locale, event.nameEn, event.nameTh);
    const content = t("discord.registrationOpen", {
      round: roundName,
      url: registerUrl,
    });

    const posted = await postBotChannelMessage(channelId, { content });
    if (posted === "rate_limited") return failure("discord.rateLimited");
    if (posted === "failed") return failure("discord.sendFailed");

    return success("discord.registrationLinkSent");
  });
}

/** Closes registration for this round. Members can no longer register on the website. */
export async function lockRegistrationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await assertAdmin();

    const eventId = String(formData.get("eventId") ?? "");
    if (!eventId) return failure("error.notFound");

    const event = await getEvent(eventId);
    if (!event) return failure("error.notFound");
    if (event.status !== "open") return failure("error.registrationClosed");

    await db
      .update(events)
      .set({ status: "locked", updatedAt: new Date() })
      .where(eq(events.id, eventId));

    revalidateEventPages(eventId);
    return success("phase.registrationClosed");
  });
}

/** Admin marks one registration as received during the auction phase. */
export async function settleRegistrationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const admin = await assertAdmin();

    const registrationId = String(formData.get("registrationId") ?? "");
    if (!registrationId) return failure("error.notFound");

    const result = await markRegistrationReceived({
      registrationId,
      actorUserId: admin.id,
      isAdmin: true,
    });

    if (!result.ok) return failure(result.message);

    const entry = await db.query.registrations.findFirst({
      where: eq(registrations.id, registrationId),
    });
    if (entry) revalidateEventPages(entry.eventId);
    return success("receipt.confirmed");
  });
}

/** Posts one Discord bot message per item with receipt confirmation buttons. */
export async function publishQueueToDiscordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await assertAdmin();

    const eventId = String(formData.get("eventId") ?? "");
    if (!eventId) return failure("error.notFound");

    const webhookUrl = getDiscordWebhookUrl();
    if (!webhookUrl) return failure("discord.notConfigured");
    if (!getDiscordBotToken()) return failure("discord.botNotConfigured");

    const channelId = await resolveWebhookChannelId(webhookUrl);
    if (!channelId) return failure("discord.sendFailed");

    const event = await getEvent(eventId);
    if (!event) return failure("error.notFound");
    if (event.status !== "locked") return failure("error.registrationOpen");

    const roundItems = await listRoundItems(eventId, null);
    if (roundItems.length === 0) return failure("discord.emptyQueue");

    const selectedQueueKeys = new Set(
      formData
        .getAll("selectedQueue")
        .map(String)
        .filter((value) => value.length > 0),
    );
    const selectedQueues = roundItems.flatMap((item) =>
      item.queueTypes
        .filter((queueType) =>
          selectedQueueKeys.has(discordQueueKey(item.eventItemId, queueType)),
        )
        .map((queueType) => ({ item, queueType })),
    );
    if (selectedQueues.length === 0) {
      return failure("discord.noQueuesSelected");
    }

    const queues = await getRoundQueues(
      eventId,
      selectedQueues.map(({ item, queueType }) => ({
        itemId: item.itemId,
        queueType,
      })),
    );
    const { locale, t } = await getTranslations();
    const queueEntries = [...queues.values()].flat();
    const discordAccountRows = queueEntries.length
      ? await db
          .select({
            userId: accounts.userId,
            discordId: accounts.providerAccountId,
          })
          .from(accounts)
          .where(
            and(
              eq(accounts.provider, "discord"),
              inArray(
                accounts.userId,
                [...new Set(queueEntries.map((entry) => entry.userId))],
              ),
            ),
          )
      : [];
    const discordIdByUserId = new Map(
      discordAccountRows.map((account) => [account.userId, account.discordId]),
    );

    const announcementItems = selectedQueues.map(({ item, queueType }) => {
      const queue = queues.get(queueKey(item.itemId, queueType)) ?? [];
      return {
        name: localized(locale, item.nameEn, item.nameTh),
        queueLabel: t(`wishlistType.${queueType}` as TranslationKey),
        imageUrl: item.imageUrl,
        entries: queue.map((entry) => ({
          position: entry.position,
          discordId: discordIdByUserId.get(entry.userId) ?? null,
          fallbackName:
            entry.name || entry.characterName || t("common.unnamed"),
          quantityRequested: entry.quantityRequested,
          carryDepth: entry.carryDepth,
          status: entry.allocationStatus ?? entry.status,
        })),
      };
    });

    const discordIds = [
      ...new Set(
        announcementItems.flatMap((item) =>
          item.entries
            .map((entry) => entry.discordId)
            .filter((id): id is string => id !== null),
        ),
      ),
    ];
    const itemMessages = new Map<
      string,
      {
        itemId: string;
        name: string;
        imageUrl: string | null;
        queueTypes: WishlistType[];
        queues: typeof announcementItems;
      }
    >();
    announcementItems.forEach((announcementItem, index) => {
      const selected = selectedQueues[index];
      if (!selected) return;

      const existing = itemMessages.get(selected.item.eventItemId);
      if (existing) {
        existing.queues.push(announcementItem);
        if (!existing.queueTypes.includes(selected.queueType)) {
          existing.queueTypes.push(selected.queueType);
        }
      } else {
        itemMessages.set(selected.item.eventItemId, {
          itemId: selected.item.itemId,
          name: localized(locale, selected.item.nameEn, selected.item.nameTh),
          imageUrl: selected.item.imageUrl,
          queueTypes: [selected.queueType],
          queues: [announcementItem],
        });
      }
    });

    const messages = [...itemMessages.values()];
    if (messages.length === 0) return failure("discord.noQueuesSelected");

    for (const item of messages) {
      const message = buildQueueAnnouncement({
        locale,
        roundName: localized(locale, event.nameEn, event.nameTh),
        items: item.queues,
      });
      const messageChunks = splitDiscordMessage(message);
      const imageUrl = getDiscordImageUrl(item.imageUrl);
      const receiveButtons = item.queueTypes.map((queueType) => ({
        type: 2 as const,
        style: 3,
        label: t("discord.receiveButton", {
          queue: t(`wishlistType.${queueType}` as TranslationKey),
        }).slice(0, 80),
        custom_id: `receive-mine:${eventId}:${item.itemId}:${queueType}`,
      }));

      for (
        let chunkIndex = 0;
        chunkIndex < messageChunks.length;
        chunkIndex += 1
      ) {
        const payload: {
          content?: string;
          embeds?: { title: string; thumbnail: { url: string } }[];
          components?: {
            type: 1;
            components: {
              type: 2;
              style: number;
              label: string;
              custom_id: string;
            }[];
          }[];
          allowed_mentions: { parse: string[]; users: string[] };
        } = {
          content: messageChunks[chunkIndex],
          allowed_mentions: { parse: [], users: discordIds },
        };
        if (imageUrl && chunkIndex === 0) {
          payload.embeds = [
            {
              title: item.name,
              thumbnail: { url: imageUrl },
            },
          ];
        }
        if (chunkIndex === 0 && receiveButtons.length > 0) {
          payload.components = [
            {
              type: 1,
              components: receiveButtons.slice(0, 5),
            },
          ];
          if (receiveButtons.length > 5) {
            payload.components.push({
              type: 1,
              components: receiveButtons.slice(5, 10),
            });
          }
        }

        const posted = await postBotChannelMessage(channelId, payload);
        if (posted === "rate_limited") return failure("discord.rateLimited");
        if (posted === "failed") return failure("discord.sendFailed");
      }
    }

    return success("discord.sent");
  });
}

/**
 * Draws the round by ordering each queue and proposing the quantity each
 * member requested. Managers then settle each proposal after considering the
 * actual auction outcome.
 *
 * Entries already settled survive a redraw. Members serving a bid ban are set
 * aside and do not carry over.
 */
export async function drawEventAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await assertAdmin();

    const eventId = String(formData.get("eventId") ?? "");
    if (!eventId) return failure("error.notFound");

    const rows = await db
      .select({
        eventItemId: eventItems.id,
        itemId: eventItems.itemId,
        queueTypes: eventItems.queueTypes,
      })
      .from(eventItems)
      .innerJoin(items, eq(items.id, eventItems.itemId))
      .where(eq(eventItems.eventId, eventId));

    if (rows.length === 0) return failure("draw.noItems");

    await assignRandomOrder(eventId);

    await db.transaction(async (tx) => {
      // Anyone serving a bid ban is excluded before ordering.
      await tx.execute(sql`
        UPDATE ${registrations} r
        SET status = 'penalized', settled_at = NOW()
        WHERE r.event_id = ${eventId}::uuid
          AND r.status = 'pending'
          AND EXISTS (
            SELECT 1 FROM penalty p
            WHERE p.user_id = r.user_id
              AND p.starts_on <= CURRENT_DATE
              AND p.ends_on >= CURRENT_DATE
          )
      `);

      for (const row of rows) {
        const entries = await tx
          .select({
            id: registrations.id,
            userId: registrations.userId,
            quantityRequested: registrations.quantityRequested,
            gearRatingSnapshot: registrations.gearRatingSnapshot,
            randomOrder: registrations.randomOrder,
            queueType: registrations.queueType,
            carryDepth: registrations.carryDepth,
            priorRank: registrations.priorRank,
            registeredAt: registrations.registeredAt,
            status: registrations.status,
          })
          .from(registrations)
          .where(
            and(
              eq(registrations.eventId, eventId),
              eq(registrations.itemId, row.itemId),
              inArray(registrations.status, [
                "pending",
                "allocated",
                "auctioned",
                "received",
                "unfilled",
                "forfeited",
                "skipped",
              ]),
            ),
          );

        if (entries.length === 0) continue;

        const settledStatuses = new Set([
          "auctioned",
          "received",
          "forfeited",
          "skipped",
        ]);
        const offeredQueueTypes = normalizeWishlistTypes(row.queueTypes);

        for (const queueType of QUEUE_DRAW_ORDER) {
          if (!offeredQueueTypes.includes(queueType)) continue;

          const queueEntries = entries.filter(
            (entry) =>
              normalizeWishlistType(entry.queueType) === queueType,
          );
          const ordered = orderQueue(queueEntries, queueType);
          const queueSettled = ordered.filter((entry) =>
            settledStatuses.has(entry.status),
          );
          const contenders = ordered.filter(
            (entry) => !settledStatuses.has(entry.status),
          );

          if (contenders.length > 0) {
            await tx.delete(allocations).where(
              and(
                eq(allocations.eventItemId, row.eventItemId),
                inArray(
                  allocations.registrationId,
                  contenders.map((entry) => entry.id),
                ),
              ),
            );
          }

          const rankById = new Map(
            ordered.map((entry, index) => [entry.id, index + 1]),
          );

          for (const entry of contenders) {
            const rank = rankById.get(entry.id);
            if (rank == null) continue;

            await tx
              .update(registrations)
              .set({
                finalRank: rank,
                status: "allocated",
              })
              .where(eq(registrations.id, entry.id));

            await tx.insert(allocations).values({
              eventItemId: row.eventItemId,
              registrationId: entry.id,
              userId: entry.userId,
              slot: rank,
              quantityRequested: entry.quantityRequested,
              quantityAllocated: entry.quantityRequested,
            });
          }

          for (const entry of queueSettled) {
            const rank = rankById.get(entry.id);
            if (rank != null) {
              await tx
                .update(registrations)
                .set({ finalRank: rank })
                .where(eq(registrations.id, entry.id));
            }
          }
        }
      }
    });

    revalidateEventPages(eventId);
    return success("draw.done");
  });
}

const decisions = ["received", "forfeited", "skipped"] as const;
type Decision = (typeof decisions)[number];

export async function settleAllocationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await assertAdmin();

    const allocationId = String(formData.get("allocationId") ?? "");
    const decision = String(formData.get("decision") ?? "") as Decision;
    if (!allocationId) return failure("error.notFound");
    if (!decisions.includes(decision)) return failure("error.invalidInput");

    const eventId = await settleAllocations([allocationId], decision);
    if (!eventId) return failure("error.notFound");

    revalidateEventPages(eventId);
    return success("draw.settled");
  });
}

async function settleAllocations(
  allocationIds: string[],
  decision: Decision,
): Promise<string | null> {
  if (allocationIds.length === 0) return null;

  return db.transaction(async (tx) => {
    const rows = await tx
      .select({
        id: allocations.id,
        registrationId: allocations.registrationId,
        eventId: eventItems.eventId,
      })
      .from(allocations)
      .innerJoin(eventItems, eq(eventItems.id, allocations.eventItemId))
      .where(inArray(allocations.id, allocationIds));

    if (rows.length === 0) return null;

    const now = new Date();
    await tx
      .update(allocations)
      .set({ status: decision, settledAt: now })
      .where(inArray(allocations.id, allocationIds));

    await tx
      .update(registrations)
      .set({ status: decision, settledAt: now })
      .where(
        inArray(
          registrations.id,
          rows.map((row) => row.registrationId),
        ),
      );

    return rows[0].eventId;
  });
}

/**
 * Rolls eligible unserved entries from the previous round into this one.
 *
 * Legacy `unfilled` and `skipped` entries are eligible. A member who forfeited
 * for lack of diamonds or who was serving a ban does not carry over, matching
 * the policy's wording that they lose that round.
 */
export async function carryOverAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await assertAdmin();

    const eventId = String(formData.get("eventId") ?? "");
    if (!eventId) return failure("error.notFound");

    const previous = await getPreviousRound(eventId);
    if (!previous) return failure("error.noPreviousRound");

    const before = await db
      .select({ id: registrations.id })
      .from(registrations)
      .where(eq(registrations.eventId, eventId));

    await carryEligibleEntriesIntoRound(eventId);

    const after = await db
      .select({ id: registrations.id })
      .from(registrations)
      .where(eq(registrations.eventId, eventId));

    if (after.length === before.length) return failure("carry.nothingToCarry");

    revalidateEventPages(eventId);
    return success("carry.done");
  });
}

/** Clears every entry that a draw has not yet touched, for a clean re-run. */
export async function resetDrawAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await assertAdmin();

    const eventId = String(formData.get("eventId") ?? "");
    if (!eventId) return failure("error.notFound");

    await db.transaction(async (tx) => {
      const eventItemIds = await tx
        .select({ id: eventItems.id })
        .from(eventItems)
        .where(eq(eventItems.eventId, eventId));

      if (eventItemIds.length > 0) {
        await tx.delete(allocations).where(
          inArray(
            allocations.eventItemId,
            eventItemIds.map((row) => row.id),
          ),
        );
      }

      await tx
        .update(registrations)
        .set({ status: "pending", finalRank: null, settledAt: null })
        .where(
          and(
            eq(registrations.eventId, eventId),
            ne(registrations.status, "withdrawn"),
          ),
        );
    });

    revalidateEventPages(eventId);
    return success("draw.reset");
  });
}

export async function rollcallForfeitAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await assertAdmin();

    const registrationId = String(formData.get("registrationId") ?? "");
    if (!registrationId) return failure("error.notFound");

    const [updated] = await db
      .update(registrations)
      .set({ status: "forfeited", settledAt: new Date() })
      .where(
        and(
          eq(registrations.id, registrationId),
          eq(registrations.status, "pending"),
        ),
      )
      .returning({ eventId: registrations.eventId });

    if (!updated) return failure("error.notFound");

    revalidateEventPages(updated.eventId);
    return success("auction.forfeited");
  });
}

export async function rollcallSelectAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await assertAdmin();

    const registrationId = String(formData.get("registrationId") ?? "");
    if (!registrationId) return failure("error.notFound");

    const [updated] = await db
      .update(registrations)
      .set({ status: "auctioned", settledAt: null })
      .where(
        and(
          eq(registrations.id, registrationId),
          eq(registrations.status, "pending"),
        ),
      )
      .returning({ eventId: registrations.eventId });

    if (!updated) return failure("error.notFound");

    revalidateEventPages(updated.eventId);
    return success("auction.selected");
  });
}

/** Posts auction roll-call results (or min starstone only) for one item. */
export async function publishAuctionResultsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await assertAdmin();

    const eventId = String(formData.get("eventId") ?? "");
    const eventItemId = String(formData.get("eventItemId") ?? "");
    if (!eventId || !eventItemId) return failure("error.notFound");

    const webhookUrl = getDiscordWebhookUrl();
    if (!webhookUrl) return failure("discord.notConfigured");
    if (!getDiscordBotToken()) return failure("discord.botNotConfigured");

    const channelId = await resolveWebhookChannelId(webhookUrl);
    if (!channelId) return failure("discord.sendFailed");

    const event = await getEvent(eventId);
    if (!event) return failure("error.notFound");
    if (event.status !== "locked") return failure("error.registrationOpen");

    const [eventItem] = await db
      .select({
        itemId: eventItems.itemId,
        queueTypes: eventItems.queueTypes,
        nameEn: items.nameEn,
        nameTh: items.nameTh,
        imageUrl: items.imageUrl,
        minStarstone: items.minStarstone,
      })
      .from(eventItems)
      .innerJoin(items, eq(items.id, eventItems.itemId))
      .where(
        and(eq(eventItems.id, eventItemId), eq(eventItems.eventId, eventId)),
      )
      .limit(1);

    if (!eventItem) return failure("error.notFound");
    if (eventItem.minStarstone == null) return failure("error.minStarstoneRequired");

    const queueTypes = normalizeWishlistTypes(eventItem.queueTypes);
    const queues = await getRoundQueues(
      eventId,
      queueTypes.map((queueType) => ({
        itemId: eventItem.itemId,
        queueType,
      })),
    );

    const allEntries = [...queues.values()].flat();
    const emptyQueue = allEntries.length === 0;

    const auctioned = await db
      .select({
        id: registrations.id,
        queueType: registrations.queueType,
        quantityRequested: registrations.quantityRequested,
        userId: registrations.userId,
        name: users.name,
        characterName: users.characterName,
        inGameId: users.inGameId,
      })
      .from(registrations)
      .innerJoin(users, eq(users.id, registrations.userId))
      .where(
        and(
          eq(registrations.eventId, eventId),
          eq(registrations.itemId, eventItem.itemId),
          eq(registrations.status, "auctioned"),
        ),
      );

    const discordAccounts =
      auctioned.length > 0
        ? await db
            .select({
              userId: accounts.userId,
              discordId: accounts.providerAccountId,
            })
            .from(accounts)
            .where(
              and(
                eq(accounts.provider, "discord"),
                inArray(
                  accounts.userId,
                  [...new Set(auctioned.map((row) => row.userId))],
                ),
              ),
            )
        : [];
    const discordByUserId = new Map(
      discordAccounts.map((row) => [row.userId, row.discordId]),
    );

    const { locale, t } = await getTranslations();
    const itemName = localized(locale, eventItem.nameEn, eventItem.nameTh);
    const queuePayload = queueTypes.map((queueType) => {
      const ordered = queues.get(queueKey(eventItem.itemId, queueType)) ?? [];
      const positionByRegistrationId = new Map(
        ordered.map((entry) => [entry.id, entry.position]),
      );
      const bidders = auctioned
        .filter(
          (row) => normalizeWishlistType(row.queueType) === queueType,
        )
        .map((row) => {
          const discordId = discordByUserId.get(row.userId) ?? null;
          return {
            position: positionByRegistrationId.get(row.id) ?? 0,
            displayName: row.characterName || row.name || t("common.unnamed"),
            inGameId: row.inGameId,
            discordMention: discordId ? `<@${discordId}>` : null,
            quantityRequested: row.quantityRequested,
          };
        });

      return {
        queueLabel: t(`wishlistType.${queueType}` as TranslationKey),
        bidders,
      };
    });

    const message = buildAuctionResultsAnnouncement({
      locale,
      roundName: localized(locale, event.nameEn, event.nameTh),
      itemName,
      minStarstone: eventItem.minStarstone,
      queues: queuePayload,
      emptyQueue,
    });

    const imageUrl = getDiscordImageUrl(eventItem.imageUrl);
    const posted = await postBotChannelMessage(channelId, {
      content: splitDiscordMessage(message)[0],
      embeds:
        imageUrl != null
          ? [
              {
                title: itemName,
                thumbnail: { url: imageUrl },
              },
            ]
          : undefined,
    });

    if (posted === "failed") return failure("discord.sendFailed");

    revalidateEventPages(eventId);
    return success("auction.published");
  });
}
