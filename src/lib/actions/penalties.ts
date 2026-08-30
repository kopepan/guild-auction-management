"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { penalties } from "@/db/schema";
import { assertAdmin } from "@/lib/guards";
import {
  failure,
  runAction,
  success,
  type ActionState,
} from "@/lib/actions/types";

/** The policy's stated range for bidding out of turn. */
const MIN_WEEKS = 1;
const MAX_WEEKS = 4;

export async function issuePenaltyAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const admin = await assertAdmin();

    const userId = String(formData.get("userId") ?? "");
    if (!userId) return failure("error.notFound");

    const weeks = Number(formData.get("weeks") ?? 0);
    if (!Number.isInteger(weeks) || weeks < MIN_WEEKS || weeks > MAX_WEEKS) {
      return failure("error.penaltyWeeksRange", {
        weeks: "error.penaltyWeeksRange",
      });
    }

    const reason = String(formData.get("reason") ?? "").trim() || null;

    const startsOn = new Date();
    const endsOn = new Date(startsOn);
    endsOn.setDate(endsOn.getDate() + weeks * 7 - 1);

    const toDate = (value: Date) => value.toISOString().slice(0, 10);

    await db.insert(penalties).values({
      userId,
      startsOn: toDate(startsOn),
      endsOn: toDate(endsOn),
      reason,
      issuedById: admin.id,
    });

    revalidatePath("/admin/members");
    return success("penalty.issued");
  });
}

export async function liftPenaltyAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await assertAdmin();

    const penaltyId = String(formData.get("penaltyId") ?? "");
    if (!penaltyId) return failure("error.notFound");

    await db.delete(penalties).where(eq(penalties.id, penaltyId));

    revalidatePath("/admin/members");
    return success("penalty.lifted");
  });
}
