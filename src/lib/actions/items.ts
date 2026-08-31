"use server";

import { count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { eventItems, items, registrations } from "@/db/schema";
import { assertAdmin } from "@/lib/guards";
import {
  failure,
  runAction,
  success,
  type ActionState,
} from "@/lib/actions/types";
import { WISHLIST_TYPES } from "@/lib/policy";

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

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? null : value))
  .nullable();

const optionalInteger = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((value) => {
    if (value == null) return null;
    const raw = String(value).trim();
    if (raw.length === 0) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
  })
  .nullable();

const itemSchema = z.object({
  nameEn: z.string().trim().min(1),
  nameTh: optionalText,
  category: z.enum(categories),
  queueTypes: z.array(z.enum(WISHLIST_TYPES)).min(1),
  minStarstone: optionalInteger,
  imageUrl: optionalText,
  descriptionEn: optionalText,
  descriptionTh: optionalText,
  isActive: z.boolean(),
});

function parseItemForm(formData: FormData) {
  const queueTypes = [
    ...new Set(formData.getAll("queueTypes").map(String)),
  ];

  return itemSchema.safeParse({
    nameEn: formData.get("nameEn") ?? "",
    nameTh: formData.get("nameTh") ?? "",
    category: formData.get("category") ?? "other",
    queueTypes,
    minStarstone: formData.get("minStarstone") ?? "",
    imageUrl: formData.get("imageUrl") ?? "",
    descriptionEn: formData.get("descriptionEn") ?? "",
    descriptionTh: formData.get("descriptionTh") ?? "",
    isActive: formData.get("isActive") !== null,
  });
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

function revalidateItemPages() {
  revalidatePath("/admin/items");
  revalidatePath("/wishlist");
  revalidatePath("/");
}

export async function createItemAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await assertAdmin();

    const parsed = parseItemForm(formData);
    if (!parsed.success) {
      return failure("error.invalidInput", { nameEn: "error.required" });
    }

    const data = {
      ...parsed.data,
      wishlistType: parsed.data.queueTypes[0],
      maxQuantityPerMember: null,
    };

    try {
      await db.insert(items).values(data);
    } catch (error) {
      if (isUniqueViolation(error)) {
        return failure("adminItems.duplicateName", {
          nameEn: "adminItems.duplicateName",
        });
      }
      throw error;
    }

    revalidateItemPages();
    return success("adminItems.created");
  });
}

export async function updateItemAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await assertAdmin();

    const id = String(formData.get("id") ?? "");
    if (!id) return failure("error.notFound");

    const parsed = parseItemForm(formData);
    if (!parsed.success) {
      return failure("error.invalidInput", { nameEn: "error.required" });
    }

    const data = {
      ...parsed.data,
      wishlistType: parsed.data.queueTypes[0],
      maxQuantityPerMember: null,
    };

    try {
      await db
        .update(items)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(items.id, id));
    } catch (error) {
      if (isUniqueViolation(error)) {
        return failure("adminItems.duplicateName", {
          nameEn: "adminItems.duplicateName",
        });
      }
      throw error;
    }

    revalidateItemPages();
    return success("adminItems.updated");
  });
}

/**
 * Refused once the item has history, so past rounds stay intact. Managers
 * deactivate such items instead.
 */
export async function deleteItemAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await assertAdmin();

    const id = String(formData.get("id") ?? "");
    if (!id) return failure("error.notFound");

    const [{ value: roundUsage }] = await db
      .select({ value: count() })
      .from(eventItems)
      .where(eq(eventItems.itemId, id));
    const [{ value: entryUsage }] = await db
      .select({ value: count() })
      .from(registrations)
      .where(eq(registrations.itemId, id));

    if (roundUsage > 0 || entryUsage > 0) {
      return failure("adminItems.deleteBlocked");
    }

    await db.delete(items).where(eq(items.id, id));
    revalidateItemPages();
    return success("adminItems.deleted");
  });
}
