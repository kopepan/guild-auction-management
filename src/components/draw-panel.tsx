"use client";

import { useActionState, useState } from "react";
import {
  Check,
  Coins,
  Dices,
  Search,
  Send,
  RotateCcw,
  Shuffle,
} from "lucide-react";

import { ActionMessage } from "@/components/action-message";
import {
  AuctionSessionPanel,
  type AuctionSessionGroup,
} from "@/components/auction-session-panel";
import { CopyButton } from "@/components/copy-button";
import { SubmitButton } from "@/components/submit-button";
import { ItemThumb, PositionBadge, StatusBadge } from "@/components/ui";
import {
  carryOverAction,
  drawEventAction,
  lockRegistrationAction,
  publishQueueToDiscordAction,
  publishRegistrationLinkAction,
  resetDrawAction,
  reshuffleAction,
  settleAllocationAction,
  settleRegistrationAction,
} from "@/lib/actions/events";
import { idleState } from "@/lib/actions/types";
import { useT } from "@/lib/i18n/client";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import type { WishlistType } from "@/lib/policy";

export type DrawQueueEntry = {
  registrationId: string;
  position: number;
  displayName: string;
  inGameId: string | null;
  gearRating: number | null;
  quantityRequested: number;
  carryDepth: number;
  status: string;
  allocated: number | null;
  allocationId: string | null;
  allocationStatus:
    | "proposed"
    | "auctioned"
    | "received"
    | "forfeited"
    | "skipped"
    | null;
};

export type DrawItem = {
  eventItemId: string;
  name: string;
  imageUrl: string | null;
  wishlistType: WishlistType;
  queue: DrawQueueEntry[];
};

type DrawItemGroup = {
  eventItemId: string;
  name: string;
  imageUrl: string | null;
  queues: DrawItem[];
};

function groupDrawItems(items: DrawItem[]): DrawItemGroup[] {
  const groups = new Map<string, DrawItemGroup>();

  for (const item of items) {
    const existing = groups.get(item.eventItemId);
    if (existing) {
      existing.queues.push(item);
    } else {
      groups.set(item.eventItemId, {
        eventItemId: item.eventItemId,
        name: item.name,
        imageUrl: item.imageUrl,
        queues: [item],
      });
    }
  }

  return [...groups.values()];
}

export function DrawPanel({
  eventId,
  eventStatus,
  items,
  auctionGroups,
  announcement,
  hasDraw,
  hasRandomQueues,
}: {
  eventId: string;
  eventStatus: "draft" | "open" | "locked" | "completed";
  items: DrawItem[];
  auctionGroups: AuctionSessionGroup[];
  announcement: string;
  hasDraw: boolean;
  hasRandomQueues: boolean;
}) {
  const t = useT();
  const isRegistration = eventStatus === "open";
  const isAuction = eventStatus === "locked";
  const [drawState, draw] = useActionState(drawEventAction, idleState);
  const [carryState, carry] = useActionState(carryOverAction, idleState);
  const [discordState, publishQueue] = useActionState(
    publishQueueToDiscordAction,
    idleState,
  );
  const [registrationLinkState, publishRegistrationLink] = useActionState(
    publishRegistrationLinkAction,
    idleState,
  );
  const [lockState, lockRegistration] = useActionState(
    lockRegistrationAction,
    idleState,
  );
  const [resetState, reset] = useActionState(resetDrawAction, idleState);
  const [reshuffleState, reshuffle] = useActionState(
    reshuffleAction,
    idleState,
  );
  const selectableQueues = items.filter((item) => item.queue.length > 0);
  const [queueSearch, setQueueSearch] = useState("");
  const [selectedQueues, setSelectedQueues] = useState<string[]>([]);
  const normalizedQueueSearch = queueSearch.trim().toLocaleLowerCase();
  const visibleQueues = normalizedQueueSearch
    ? selectableQueues.filter((item) =>
        `${item.name} ${t(
          `wishlistType.${item.wishlistType}` as TranslationKey,
        )}`
          .toLocaleLowerCase()
          .includes(normalizedQueueSearch),
      )
    : selectableQueues;
  const groupedItems = groupDrawItems(items);

  const statusCounts = items
    .flatMap((item) => item.queue)
    .reduce<Record<string, number>>((counts, entry) => {
      const status = entry.allocationStatus ?? entry.status;
      counts[status] = (counts[status] ?? 0) + 1;
      return counts;
    }, {});
  const statusOrder = [
    "pending",
    "proposed",
    "received",
    "auctioned",
    "forfeited",
    "skipped",
    "unfilled",
  ];

  return (
    <div className="space-y-4">
      {isRegistration ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-400/15 bg-emerald-400/5 p-3">
          <p className="text-sm font-medium text-emerald-100">
            {t("phase.registrationPhase")}
          </p>
          <form action={publishRegistrationLink}>
            <input type="hidden" name="eventId" value={eventId} />
            <SubmitButton confirm={t("discord.confirmRegistrationLink")}>
              <Send className="size-4" aria-hidden />
              {t("discord.sendRegistrationLink")}
            </SubmitButton>
          </form>
          <form action={lockRegistration}>
            <input type="hidden" name="eventId" value={eventId} />
            <SubmitButton
              className="btn-ghost"
              confirm={t("phase.confirmLockRegistration")}
            >
              {t("phase.lockRegistration")}
            </SubmitButton>
          </form>
          <ActionMessage state={registrationLinkState} />
          <ActionMessage state={lockState} />
        </div>
      ) : null}

      {isAuction ? (
        <p className="text-sm text-amber-200/80">{t("phase.auctionPhase")}</p>
      ) : null}

      {isAuction ? (
        <AuctionSessionPanel eventId={eventId} groups={auctionGroups} />
      ) : null}

      {isAuction ? (
        <div className="flex flex-wrap items-center gap-2">
        <form action={carry}>
          <input type="hidden" name="eventId" value={eventId} />
          <SubmitButton className="btn-ghost">
            <RotateCcw className="size-4" aria-hidden />
            {t("carry.run")}
          </SubmitButton>
        </form>

        {hasRandomQueues ? (
          <form action={reshuffle}>
            <input type="hidden" name="eventId" value={eventId} />
            <SubmitButton className="btn-ghost">
              <Dices className="size-4" aria-hidden />
              {t("draw.reshuffle")}
            </SubmitButton>
          </form>
        ) : null}

        <form action={draw}>
          <input type="hidden" name="eventId" value={eventId} />
          <SubmitButton>
            <Shuffle className="size-4" aria-hidden />
            {hasDraw ? t("draw.redraw") : t("draw.run")}
          </SubmitButton>
        </form>

        {hasDraw ? (
          <form action={reset}>
            <input type="hidden" name="eventId" value={eventId} />
            <SubmitButton className="btn-ghost" confirm={t("draw.settleHint")}>
              {t("draw.resetButton")}
            </SubmitButton>
          </form>
        ) : null}
        </div>
      ) : null}

      {isAuction ? (
      <form
        action={publishQueue}
        className="space-y-3 rounded-xl border border-indigo-400/15 bg-indigo-400/5 p-3"
      >
        <input type="hidden" name="eventId" value={eventId} />
        {selectedQueues.map((queueKey) => (
          <input
            key={queueKey}
            type="hidden"
            name="selectedQueue"
            value={queueKey}
          />
        ))}
        <fieldset>
          <legend className="flex flex-wrap items-center justify-between gap-2 text-sm font-medium text-white">
            <span>
              {t("discord.selectQueues")}
            </span>
            <span className="text-xs font-normal text-white/40">
              {t("discord.selectedQueues", { count: selectedQueues.length })}
            </span>
          </legend>
          <div className="mt-1 flex justify-end gap-1.5">
            <button
              type="button"
              className="text-xs text-indigo-200/80 hover:text-indigo-100"
              onClick={() =>
                setSelectedQueues(
                  selectableQueues.map(
                    (item) => `${item.eventItemId}:${item.wishlistType}`,
                  ),
                )
              }
            >
              {t("discord.selectAll")}
            </button>
            <span className="text-xs text-white/25">·</span>
            <button
              type="button"
              className="text-xs text-white/50 hover:text-white/80"
              onClick={() => setSelectedQueues([])}
            >
              {t("discord.clearAll")}
            </button>
          </div>
          <label className="relative mt-2 block">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/35"
              aria-hidden
            />
            <span className="sr-only">{t("discord.searchQueues")}</span>
            <input
              type="search"
              value={queueSearch}
              onChange={(event) => setQueueSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.preventDefault();
              }}
              placeholder={t("discord.searchQueues")}
              className="input pl-9"
            />
          </label>
          <div className="mt-2 grid max-h-56 gap-2 overflow-y-auto sm:grid-cols-2">
            {selectableQueues.length === 0 ? (
              <p className="text-xs text-white/40">{t("discord.emptyQueue")}</p>
            ) : visibleQueues.length === 0 ? (
              <p className="text-xs text-white/40">{t("discord.noQueuesFound")}</p>
            ) : (
              visibleQueues.map((item) => {
                const queueKey = `${item.eventItemId}:${item.wishlistType}`;
                return (
                  <label
                    key={queueKey}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/8 bg-white/3 px-3 py-2 text-xs text-white/75 hover:bg-white/6"
                  >
                    <input
                      type="checkbox"
                      value={queueKey}
                      checked={selectedQueues.includes(queueKey)}
                      onChange={(event) =>
                        setSelectedQueues((current) =>
                          event.target.checked
                            ? [...current, queueKey]
                            : current.filter((value) => value !== queueKey),
                        )
                      }
                      className="accent-indigo-400"
                    />
                    <span className="min-w-0 truncate">
                      {item.name} —{" "}
                      {t(
                        `wishlistType.${item.wishlistType}` as TranslationKey,
                      )}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </fieldset>
        <SubmitButton
          className="btn-ghost"
          confirm={t("discord.confirm")}
          pendingLabel={t("discord.sending")}
        >
          <Send className="size-4" aria-hidden />
          {t("discord.sendQueue")}
        </SubmitButton>
        <ActionMessage state={discordState} />
      </form>
      ) : null}

      <p className="text-xs text-white/35">{t("carry.subtitle")}</p>

      <ActionMessage state={carryState} />
      <ActionMessage state={reshuffleState} />
      <ActionMessage state={drawState} />
      <ActionMessage state={resetState} />

      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-white/8 bg-white/2 px-3 py-2">
        <span className="mr-1 text-xs text-white/45">
          {t("draw.statusSummary")}:
        </span>
        {statusOrder.map((status) =>
          statusCounts[status] ? (
            <StatusBadge
              key={status}
              status={status}
              label={`${t(`draw.${status}` as TranslationKey)} ${statusCounts[status]}`}
            />
          ) : null,
        )}
      </div>

      <p className="text-xs text-white/35">{t("draw.settleHint")}</p>

      <ul className="space-y-3">
        {groupedItems.map((group) => {
          return (
            <li
              key={group.eventItemId}
              className="rounded-xl border border-white/8 bg-white/2 p-4"
            >
              <div className="mb-3 flex items-center gap-3">
                <ItemThumb src={group.imageUrl} alt={group.name} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {group.name}
                  </p>
                  <p className="text-xs text-white/40">
                    {t("items.inQueue", {
                      count: group.queues.reduce(
                        (total, item) => total + item.queue.length,
                        0,
                      ),
                    })}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {group.queues.map((item) => (
                  <section
                    key={`${item.eventItemId}:${item.wishlistType}`}
                    className="rounded-lg border border-white/8 bg-black/10 p-3"
                  >
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <StatusBadge
                        status={item.wishlistType}
                        label={t(
                          `wishlistType.${item.wishlistType}` as TranslationKey,
                        )}
                      />
                      <span className="text-xs text-white/35">
                        {t("items.inQueue", { count: item.queue.length })}
                      </span>
                    </div>
                    {item.queue.length === 0 ? (
                      <p className="text-sm text-white/35">
                        {t("items.queueEmpty")}
                      </p>
                    ) : (
                      <ul className="space-y-1.5">
                        {item.queue.map((entry) => (
                          <QueueRow
                            key={entry.registrationId}
                            entry={entry}
                            wishlistType={item.wishlistType}
                            allowReceipt={isAuction}
                          />
                        ))}
                      </ul>
                    )}
                  </section>
                ))}
              </div>

            </li>
          );
        })}
      </ul>

      {hasDraw ? (
        <div className="rounded-xl border border-white/8 bg-night-900/60 p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-white">
                {t("draw.announcement")}
              </p>
              <p className="text-xs text-white/35">
                {t("draw.announcementHint")}
              </p>
            </div>
            <CopyButton text={announcement} />
          </div>
          <pre className="max-h-80 overflow-auto rounded-lg bg-black/40 p-3 text-xs whitespace-pre-wrap text-white/70">
            {announcement}
          </pre>
        </div>
      ) : null}
    </div>
  );
}

function QueueRow({
  entry,
  wishlistType,
  allowReceipt,
}: {
  entry: DrawQueueEntry;
  wishlistType: WishlistType;
  allowReceipt: boolean;
}) {
  const t = useT();
  const [allocationState, settle] = useActionState(
    settleAllocationAction,
    idleState,
  );
  const [registrationState, settleRegistration] = useActionState(
    settleRegistrationAction,
    idleState,
  );

  const currentStatus = entry.allocationStatus ?? entry.status;
  const canMarkReceived =
    allowReceipt &&
    ["pending", "allocated"].includes(currentStatus) &&
    !entry.allocationId;

  return (
    <li className="flex flex-wrap items-center gap-2.5">
      <PositionBadge position={entry.position} />
      <span className="min-w-0 flex-1 truncate text-sm text-white/90">
        {entry.displayName}
        {entry.inGameId ? (
          <span className="ml-2 font-mono text-xs text-white/35">
            {entry.inGameId}
          </span>
        ) : null}
        <span className="ml-2 text-xs text-white/35">
          {wishlistType === "gear_queue" && entry.gearRating != null
            ? `GR ${entry.gearRating.toLocaleString()}`
            : null}
          {` ×${entry.quantityRequested}`}
        </span>
        {entry.carryDepth > 0 ? (
          <span className="ml-2">
            <StatusBadge
              status="carried"
              label={t("wishlist.carriedTimes", { count: entry.carryDepth })}
            />
          </span>
        ) : null}
      </span>

      {entry.allocationId ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge
            status={currentStatus}
            label={t(`draw.${currentStatus}` as TranslationKey)}
          />
          <form action={settle} className="flex gap-1.5">
            <input
              type="hidden"
              name="allocationId"
              value={entry.allocationId}
            />
            <button
              type="submit"
              name="decision"
              value="received"
              className="btn-ghost btn-sm"
            >
              <Check className="size-3.5" aria-hidden />
              {t("draw.markReceived")}
            </button>
            <button
              type="submit"
              name="decision"
              value="forfeited"
              className="btn-ghost btn-sm"
            >
              <Coins className="size-3.5" aria-hidden />
              {t("draw.markForfeited")}
            </button>
          </form>
        </div>
      ) : canMarkReceived ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge
            status={currentStatus}
            label={t(`draw.${currentStatus}` as TranslationKey)}
          />
          <form action={settleRegistration}>
            <input
              type="hidden"
              name="registrationId"
              value={entry.registrationId}
            />
            <SubmitButton className="btn-ghost btn-sm">
              <Check className="size-3.5" aria-hidden />
              {t("draw.markReceived")}
            </SubmitButton>
          </form>
        </div>
      ) : (
        <StatusBadge
          status={currentStatus}
          label={t(`draw.${currentStatus}` as TranslationKey)}
        />
      )}

      {allocationState.status === "error" && allocationState.message ? (
        <span className="w-full text-xs text-red-300">
          {t(allocationState.message)}
        </span>
      ) : null}
      {registrationState.status === "error" && registrationState.message ? (
        <span className="w-full text-xs text-red-300">
          {t(registrationState.message)}
        </span>
      ) : null}
    </li>
  );
}
