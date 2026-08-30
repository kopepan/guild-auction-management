"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import { ActionMessage, FieldError } from "@/components/action-message";
import { SubmitButton } from "@/components/submit-button";
import { createItemAction, updateItemAction } from "@/lib/actions/items";
import { idleState } from "@/lib/actions/types";
import { useT } from "@/lib/i18n/client";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import {
  WISHLIST_TYPES,
  normalizeWishlistTypes,
  type StoredWishlistType,
  type WishlistType,
} from "@/lib/policy";

const categories = [
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
] as const;

export type ItemFormValues = {
  id?: string;
  nameEn: string;
  nameTh: string | null;
  category: (typeof categories)[number];
  queueTypes: StoredWishlistType[];
  imageUrl: string | null;
  descriptionEn: string | null;
  descriptionTh: string | null;
  isActive: boolean;
};

export function ItemForm({ item }: { item?: ItemFormValues }) {
  const t = useT();
  const router = useRouter();
  const isEdit = Boolean(item?.id);
  const [state, formAction] = useActionState(
    isEdit ? updateItemAction : createItemAction,
    idleState,
  );
  const [queueTypes, setQueueTypes] = useState<WishlistType[]>(
    item?.queueTypes?.length
      ? normalizeWishlistTypes(item.queueTypes)
      : ["gear_queue"],
  );
  const [category, setCategory] = useState<(typeof categories)[number]>(
    item?.category ?? "other",
  );

  useEffect(() => {
    if (state.status === "success" && !isEdit) {
      router.push("/admin/items");
    }
  }, [state, isEdit, router]);

  return (
    <form action={formAction} className="space-y-4">
      {item?.id ? <input type="hidden" name="id" value={item.id} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="nameEn">
            {t("adminItems.nameEn")}
          </label>
          <input
            id="nameEn"
            name="nameEn"
            required
            defaultValue={item?.nameEn ?? ""}
            className="input"
            autoComplete="off"
          />
          <FieldError state={state} field="nameEn" />
        </div>

        <div>
          <label className="label" htmlFor="nameTh">
            {t("adminItems.nameTh")}
          </label>
          <input
            id="nameTh"
            name="nameTh"
            defaultValue={item?.nameTh ?? ""}
            className="input"
            autoComplete="off"
          />
        </div>

        <div>
          <label className="label" htmlFor="category">
            {t("adminItems.category")}
          </label>
          <select
            id="category"
            name="category"
            value={category}
            onChange={(event) => {
              const next = event.target.value as (typeof categories)[number];
              setCategory(next);
              if (next === "title") setQueueTypes(["random_queue"]);
            }}
            className="input"
          >
            {categories.map((category) => (
              <option key={category} value={category} className="bg-night-900">
                {t(`item.category.${category}` as TranslationKey)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="imageUrl">
            {t("adminItems.imageUrl")}{" "}
            <span className="text-white/25 normal-case">
              ({t("common.optional")})
            </span>
          </label>
          <input
            id="imageUrl"
            name="imageUrl"
            type="url"
            defaultValue={item?.imageUrl ?? ""}
            className="input"
            placeholder="https://"
            autoComplete="off"
          />
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <p className="label">
          {t("adminItems.wishlistType")}
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {WISHLIST_TYPES.map((type) => (
            <label
              key={type}
              className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/[0.02] p-3 text-sm text-white/75"
            >
              <input
                type="checkbox"
                name="queueTypes"
                value={type}
                checked={queueTypes.includes(type)}
                onChange={(event) => {
                  setQueueTypes((current) =>
                    event.target.checked
                      ? [...new Set([...current, type])]
                      : current.filter((value) => value !== type),
                  );
                }}
                className="mt-0.5 size-4 accent-[color:var(--color-moon-600)]"
              />
              <span>
                <span className="block font-medium text-white">
                  {t(`wishlistType.${type}` as TranslationKey)}
                </span>
                <span className="mt-1 block text-xs text-white/45">
                  {t(`wishlistType.${type}.hint` as TranslationKey)}
                </span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="descriptionEn">
            {t("adminItems.descriptionEn")}
          </label>
          <textarea
            id="descriptionEn"
            name="descriptionEn"
            rows={3}
            defaultValue={item?.descriptionEn ?? ""}
            className="input resize-y"
          />
        </div>
        <div>
          <label className="label" htmlFor="descriptionTh">
            {t("adminItems.descriptionTh")}
          </label>
          <textarea
            id="descriptionTh"
            name="descriptionTh"
            rows={3}
            defaultValue={item?.descriptionTh ?? ""}
            className="input resize-y"
          />
        </div>
      </div>

      <label className="flex items-center gap-2.5 text-sm text-white/75">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={item?.isActive ?? true}
          className="size-4 accent-[color:var(--color-moon-600)]"
        />
        {t("common.active")}
        <span className="text-xs text-white/35">
            {t("adminItems.activeHint")}
        </span>
      </label>

      <ActionMessage state={state} />

      <div className="flex gap-2">
        <SubmitButton pendingLabel={t("common.saving")}>
          {isEdit ? t("common.save") : t("common.create")}
        </SubmitButton>
      </div>
    </form>
  );
}
