"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ChevronDown, MinusCircle, PlusCircle } from "lucide-react";

import { SubmitButton } from "@/components/submit-button";
import {
  EmptyState,
  ItemThumb,
  PositionBadge,
  StatusBadge,
} from "@/components/ui";
import {
  fetchWishlistQueueEntriesAction,
  registerAction,
  withdrawAction,
} from "@/lib/actions/registrations";
import { idleState } from "@/lib/actions/types";
import { useT } from "@/lib/i18n/client";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

export type WishlistCardItem = {
  itemId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  wishlistType: "gear_queue" | "random_queue" | "fifo_queue";
  category: string;
  allowsQuantity: boolean;
  queueLength: number;
  queueEntries: {
    id: string;
    name: string | null;
    characterName: string | null;
    gearRatingSnapshot: number | null;
    quantityRequested: number;
    carryDepth: number;
    status: string;
    position: number;
    isMine: boolean;
  }[];
  registration: {
    id: string;
    quantityRequested: number;
    status: string;
    carryDepth: number;
    position: number | null;
  } | null;
  blockedReason: TranslationKey | null;
};

export function WishlistItemCard({
  item,
  eventId,
}: {
  item: WishlistCardItem;
  eventId: string;
}) {
  const t = useT();
  const [registerState, register] = useActionState(registerAction, idleState);
  const [withdrawState, withdraw] = useActionState(withdrawAction, idleState);
  const [quantity, setQuantity] = useState(1);
  const [confirmingRegister, setConfirmingRegister] = useState(false);
  const [confirmingWithdraw, setConfirmingWithdraw] = useState(false);
  const [queueEntries, setQueueEntries] = useState(item.queueEntries);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const queueLoadedRef = useRef(item.queueEntries.length > 0);

  const entry = item.registration;
  const state = entry ? withdrawState : registerState;
  const isOrangeRelic =
    item.name.startsWith("Orange Relic") ||
    item.name.startsWith("Relic สีส้ม");

  async function loadQueueEntries() {
    if (queueLoadedRef.current || loadingQueue) return;
    setLoadingQueue(true);
    try {
      const entries = await fetchWishlistQueueEntriesAction({
        eventId,
        itemId: item.itemId,
        queueType: item.wishlistType,
      });
      setQueueEntries(entries);
      queueLoadedRef.current = true;
    } finally {
      setLoadingQueue(false);
    }
  }

  useEffect(() => {
    if (entry) {
      void loadQueueEntries();
    }
    // Load queue details when the member already registered (details open by default).
  }, [entry, eventId, item.itemId, item.wishlistType]);

  function handleQueueDetailsToggle(event: React.SyntheticEvent<HTMLDetailsElement>) {
    if (event.currentTarget.open) {
      void loadQueueEntries();
    }
  }

  return (
    <li className="card flex flex-col gap-3 p-4">
      <div className="flex items-start gap-3">
        <ItemThumb
          src={item.imageUrl}
          alt={item.name}
          quality={isOrangeRelic ? "orange" : undefined}
        />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-white">{item.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <StatusBadge
              status={item.wishlistType}
              label={t(`wishlistType.${item.wishlistType}` as TranslationKey)}
            />
            <span className="text-xs text-white/40">
              · {t("items.inQueue", { count: item.queueLength })}
            </span>
          </div>
        </div>
      </div>

      <p className="text-xs text-white/45">
        {t(`wishlistType.${item.wishlistType}.hint` as TranslationKey)}
      </p>

      {entry ? (
        <div className="flex flex-col gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/5 px-3 py-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              <p className="font-medium text-emerald-100">
                {t("wishlist.registered")}
              </p>
              <p className="mt-0.5 text-white/80">
                {entry.position != null
                  ? t("wishlist.position", {
                      position: entry.position,
                      total: item.queueLength,
                    })
                  : t("wishlist.positionPending")}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/45">
                {item.allowsQuantity ? (
                  <span>×{entry.quantityRequested}</span>
                ) : null}
                {entry.carryDepth > 0 ? (
                  <StatusBadge
                    status="carried"
                    label={t("wishlist.carriedTimes", {
                      count: entry.carryDepth,
                    })}
                  />
                ) : null}
              </div>
            </div>
            {entry.status === "pending" ? (
              confirmingWithdraw ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    onClick={() => setConfirmingWithdraw(false)}
                  >
                    {t("common.cancel")}
                  </button>
                  <form action={withdraw}>
                    <input
                      type="hidden"
                      name="registrationId"
                      value={entry.id}
                    />
                    <SubmitButton className="btn-ghost btn-sm">
                      {t("wishlist.confirmWithdraw")}
                    </SubmitButton>
                  </form>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  onClick={() => setConfirmingWithdraw(true)}
                >
                  <MinusCircle className="size-4" aria-hidden />
                  {t("wishlist.withdraw")}
                </button>
              )
            ) : (
              <StatusBadge
                status={entry.status}
                label={t(`draw.${entry.status}` as TranslationKey)}
              />
            )}
          </div>
          {confirmingWithdraw ? (
            <p className="text-xs text-white/50">
              {t("wishlist.confirmWithdrawPrompt", { item: item.name })}
            </p>
          ) : null}
        </div>
      ) : item.blockedReason ? (
        <p className="rounded-lg border border-white/10 bg-white/3 px-3 py-2 text-xs text-white/45">
          {t(item.blockedReason)}
        </p>
      ) : confirmingRegister ? (
        <div className="space-y-3 rounded-lg border border-moon-500/30 bg-moon-600/10 px-3 py-3">
          <p className="text-sm text-moon-100">
            {item.allowsQuantity && quantity > 1
              ? t("wishlist.confirmRegisterQuantity", {
                  item: item.name,
                  quantity,
                })
              : t("wishlist.confirmRegister", { item: item.name })}
          </p>
          <p className="text-xs text-white/45">
            {t(`wishlistType.${item.wishlistType}.hint` as TranslationKey)}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => setConfirmingRegister(false)}
            >
              {t("common.cancel")}
            </button>
            <form action={register} className="inline">
              <input type="hidden" name="itemId" value={item.itemId} />
              <input type="hidden" name="queueType" value={item.wishlistType} />
              {item.allowsQuantity ? (
                <input type="hidden" name="quantity" value={quantity} />
              ) : null}
              <SubmitButton className="btn-primary btn-sm">
                {t("wishlist.confirmSubmit")}
              </SubmitButton>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-end gap-2">
          {item.allowsQuantity ? (
            <label className="flex flex-col gap-1 text-xs text-white/50">
              <span>{t("wishlist.quantityLabel")}</span>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value))}
                className="input w-24"
              />
            </label>
          ) : null}
          <button
            type="button"
            className="btn-primary btn-sm"
            onClick={() => setConfirmingRegister(true)}
          >
            <PlusCircle className="size-4" aria-hidden />
            {t("wishlist.register")}
          </button>
        </div>
      )}

      {state.status === "error" && state.message ? (
        <p className="text-xs text-red-300">{t(state.message)}</p>
      ) : null}

      <details
        className="group mt-auto border-t border-sky-200/10 pt-3"
        open={entry != null}
        onToggle={handleQueueDetailsToggle}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-xs font-medium text-sky-100/65 transition hover:text-sky-100">
          <span>{t("wishlist.queueDetails", { count: item.queueLength })}</span>
          <ChevronDown
            className="size-4 transition group-open:rotate-180"
            aria-hidden
          />
        </summary>

        <div className="mt-3">
          {loadingQueue ? (
            <p className="text-xs text-white/40">{t("common.saving")}</p>
          ) : queueEntries.length === 0 ? (
            <EmptyState>{t("items.queueEmpty")}</EmptyState>
          ) : (
            <ol className="space-y-1.5">
              {queueEntries.map((queueEntry) => (
                <li
                  key={queueEntry.id}
                  className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-2 ${
                    queueEntry.isMine
                      ? "border-glow-400/30 bg-glow-400/5"
                      : "border-white/8 bg-white/2"
                  }`}
                >
                  <PositionBadge position={queueEntry.position} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-white/85">
                      {queueEntry.name ||
                        queueEntry.characterName ||
                        t("common.unnamed")}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-white/40">
                      {item.wishlistType === "gear_queue" &&
                      queueEntry.gearRatingSnapshot != null ? (
                        <span>
                          GR {queueEntry.gearRatingSnapshot.toLocaleString()}
                        </span>
                      ) : null}
                      {queueEntry.quantityRequested > 1 ? (
                        <span>×{queueEntry.quantityRequested}</span>
                      ) : null}
                      {queueEntry.carryDepth > 0 ? (
                        <StatusBadge
                          status="carried"
                          label={t("wishlist.carriedTimes", {
                            count: queueEntry.carryDepth,
                          })}
                        />
                      ) : null}
                    </div>
                  </div>
                  {queueEntry.status !== "pending" ? (
                    <StatusBadge
                      status={queueEntry.status}
                      label={t(
                        `draw.${queueEntry.status}` as TranslationKey,
                      )}
                    />
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </div>
      </details>
    </li>
  );
}
