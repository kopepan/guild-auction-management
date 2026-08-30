"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { users } from "@/db/schema";
import { assertUser } from "@/lib/guards";
import {
  failure,
  runAction,
  success,
  type ActionState,
} from "@/lib/actions/types";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { getRegistrationRound } from "@/lib/queries";

export async function updateProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertUser();

    const gearRatingRaw = String(formData.get("gearRating") ?? "").trim();
    const fieldErrors: Record<string, TranslationKey> = {};

    const gearRating = Number(gearRatingRaw);
    if (
      gearRatingRaw === "" ||
      !Number.isFinite(gearRating) ||
      gearRating < 0
    ) {
      fieldErrors.gearRating = "error.gearRatingRange";
    }

    if (Object.keys(fieldErrors).length > 0) {
      return failure("error.invalidInput", fieldErrors);
    }

    const round = await getRegistrationRound();
    const forRegistrationRound =
      String(formData.get("forRegistrationRound") ?? "") === "1";

    if (forRegistrationRound && !round) {
      return failure("error.registrationClosed");
    }

    await db
      .update(users)
      .set({
        gearRating: Math.round(gearRating),
        ...(forRegistrationRound && round
          ? { gearRatingSubmittedEventId: round.id }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    revalidatePath("/profile");
    revalidatePath("/");
    revalidatePath("/wishlist");
    revalidatePath("/register/gear-rating");
    revalidatePath("/admin/members");

    if (forRegistrationRound && round) redirect("/wishlist");

    return success("profile.saved");
  });
}
