"use client";

import { useActionState, useMemo, useState } from "react";
import { Search, Send, UserCheck, UserX } from "lucide-react";

import { ActionMessage } from "@/components/action-message";
import { SubmitButton } from "@/components/submit-button";
import { ItemThumb, PositionBadge, StatusBadge } from "@/components/ui";
import type { DrawQueueEntry } from "@/components/draw-panel";
import {
  publishAuctionResultsAction,
  rollcallForfeitAction,
  rollcallSelectAction,
} from "@/lib/actions/events";
import { idleState } from "@/lib/actions/types";
import { useT } from "@/lib/i18n/client";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import type { WishlistType } from "@/lib/policy";

export type AuctionSessionGroup = {
  eventItemId: string;
  name: string;
  imageUrl: string | null;
  minStarstone: number | null;
  queues: {
    queueType: WishlistType;
    entries: DrawQueueEntry[];
  }[];
};

export function AuctionSessionPanel({
  eventId,
  groups,
}: {
  eventId: string;
  groups: AuctionSessionGroup[];
}) {
  const t = useT();
  const [search, setSearch] = useState("");
  const [activeItemId, setActiveItemId] = useState(groups[0]?.eventItemId ?? "");
  const [publishState, publish] = useActionState(
    publishAuctionResultsAction,
    idleState,
  );

  const normalizedSearch = search.trim().toLocaleLowerCase();
  const filteredGroups = useMemo(
    () =>
      normalizedSearch
        ? groups.filter((group) =>
            group.name.toLocaleLowerCase().includes(normalizedSearch),
          )
        : groups,
    [groups, normalizedSearch],
  );

  const activeGroup =
    filteredGroups.find((group) => group.eventItemId === activeItemId) ??
    filteredGroups[0] ??
    null;

  const totalQueueCount =
    activeGroup?.queues.reduce(
      (total, queue) => total + queue.entries.length,
      0,
    ) ?? 0;
  const pendingCount =
    activeGroup?.queues.reduce(
      (total, queue) =>
        total +
        queue.entries.filter((entry) => entry.status === "pending").length,
      0,
    ) ?? 0;

  return (
    <div className="space-y-4 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
      <div>
        <p className="text-sm font-medium text-amber-100">
          {t("auction.sessionTitle")}
        </p>
        <p className="mt-1 text-xs text-amber-200/70">
          {t("auction.sessionHint")}
        </p>
      </div>

      <label className="relative block">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/35"
          aria-hidden
        />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("auction.searchItems")}
          className="input pl-9"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        {filteredGroups.length === 0 ? (
          <p className="text-xs text-white/40">{t("auction.noItemsFound")}</p>
        ) : (
          filteredGroups.map((group) => {
            const active = group.eventItemId === activeGroup?.eventItemId;
            const queueCount = group.queues.reduce(
              (total, queue) => total + queue.entries.length,
              0,
            );
            return (
              <button
                key={group.eventItemId}
                type="button"
                onClick={() => setActiveItemId(group.eventItemId)}
                className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                  active
                    ? "border-amber-400/40 bg-amber-400/15 text-amber-50"
                    : "border-white/10 bg-white/3 text-white/70 hover:bg-white/6"
                }`}
              >
                <span className="block max-w-40 truncate font-medium">
                  {group.name}
                </span>
                <span className="mt-0.5 block text-[10px] text-white/40">
                  {t("items.inQueue", { count: queueCount })}
                  {group.minStarstone != null
                    ? ` · ${t("auction.minStarstoneShort", {
                        amount: group.minStarstone.toLocaleString(),
                      })}`
                    : ""}
                </span>
              </button>
            );
          })
        )}
      </div>

      {activeGroup ? (
        <div className="rounded-xl border border-white/10 bg-night-950/40 p-4">
          <div className="mb-4 flex flex-wrap items-start gap-3">
            <ItemThumb
              src={activeGroup.imageUrl}
              alt={activeGroup.name}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-white">{activeGroup.name}</p>
              <p className="mt-1 text-xs text-white/45">
                {activeGroup.minStarstone != null
                  ? t("auction.minStarstoneLabel", {
                      amount: activeGroup.minStarstone.toLocaleString(),
                    })
                  : t("auction.minStarstoneMissing")}
              </p>
              <p className="mt-1 text-xs text-white/35">
                {t("auction.rollcallProgress", {
                  pending: pendingCount,
                  total: totalQueueCount,
                })}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {activeGroup.queues.map((queue) => (
              <section
                key={queue.queueType}
                className="rounded-lg border border-white/8 bg-black/15 p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <StatusBadge
                    status={queue.queueType}
                    label={t(
                      `wishlistType.${queue.queueType}` as TranslationKey,
                    )}
                  />
                  <span className="text-xs text-white/35">
                    {t("items.inQueue", { count: queue.entries.length })}
                  </span>
                </div>

                {queue.entries.length === 0 ? (
                  <p className="text-sm text-white/35">
                    {t("items.queueEmpty")}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {queue.entries.map((entry) => (
                      <RollcallRow
                        key={entry.registrationId}
                        entry={entry}
                        queueType={queue.queueType}
                      />
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          <form action={publish} className="mt-4 flex flex-wrap items-center gap-2">
            <input type="hidden" name="eventId" value={eventId} />
            <input
              type="hidden"
              name="eventItemId"
              value={activeGroup.eventItemId}
            />
            <SubmitButton
              className="btn-primary btn-sm"
              confirm={t("auction.confirmPublish")}
              pendingLabel={t("discord.sending")}
            >
              <Send className="size-4" aria-hidden />
              {totalQueueCount === 0
                ? t("auction.publishMinStarstone")
                : t("auction.publishResults")}
            </SubmitButton>
            <ActionMessage state={publishState} />
          </form>
        </div>
      ) : null}
    </div>
  );
}

function RollcallRow({
  entry,
  queueType,
}: {
  entry: DrawQueueEntry;
  queueType: WishlistType;
}) {
  const t = useT();
  const [forfeitState, forfeit] = useActionState(
    rollcallForfeitAction,
    idleState,
  );
  const [selectState, select] = useActionState(rollcallSelectAction, idleState);
  const currentStatus = entry.allocationStatus ?? entry.status;
  const isPending = currentStatus === "pending";

  return (
    <li className="flex flex-wrap items-center gap-2 rounded-lg border border-white/8 bg-white/2 px-2.5 py-2">
      <PositionBadge position={entry.position} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-white/90">
          {entry.displayName}
          {entry.inGameId ? (
            <span className="ml-2 font-mono text-xs text-white/35">
              {entry.inGameId}
            </span>
          ) : null}
        </p>
        <p className="text-xs text-white/40">
          {queueType === "gear_queue" && entry.gearRating != null
            ? `GR ${entry.gearRating.toLocaleString()} · `
            : null}
          ×{entry.quantityRequested}
        </p>
      </div>

      {isPending ? (
        <div className="flex flex-wrap gap-1.5">
          <form action={forfeit}>
            <input
              type="hidden"
              name="registrationId"
              value={entry.registrationId}
            />
            <SubmitButton
              className="btn-ghost btn-sm"
              pendingLabel={t("common.processing")}
            >
              <UserX className="size-3.5" aria-hidden />
              {t("auction.absent")}
            </SubmitButton>
          </form>
          <form action={select}>
            <input
              type="hidden"
              name="registrationId"
              value={entry.registrationId}
            />
            <SubmitButton
              className="btn-primary btn-sm"
              pendingLabel={t("common.processing")}
            >
              <UserCheck className="size-3.5" aria-hidden />
              {t("auction.present")}
            </SubmitButton>
          </form>
        </div>
      ) : (
        <StatusBadge
          status={currentStatus}
          label={t(`draw.${currentStatus}` as TranslationKey)}
        />
      )}

      {forfeitState.status === "error" && forfeitState.message ? (
        <span className="w-full text-xs text-red-300">
          {t(forfeitState.message)}
        </span>
      ) : null}
      {selectState.status === "error" && selectState.message ? (
        <span className="w-full text-xs text-red-300">
          {t(selectState.message)}
        </span>
      ) : null}
    </li>
  );
}
