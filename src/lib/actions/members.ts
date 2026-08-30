"use server";

import { and, count, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { users } from "@/db/schema";
import { assertAdmin } from "@/lib/guards";
import {
  DiscordMemberSyncError,
  syncDiscordGuildMembers,
} from "@/lib/discord-members";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import {
  failure,
  runAction,
  success,
  type ActionState,
} from "@/lib/actions/types";

export async function setMemberRoleAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await assertAdmin();

    const userId = String(formData.get("userId") ?? "");
    const role = String(formData.get("role") ?? "");
    if (!userId) return failure("error.notFound");
    if (role !== "member" && role !== "admin") return failure("error.invalidInput");

    if (role === "member") {
      // Losing the last manager would lock everyone out of the admin tools.
      const [{ value: otherAdmins }] = await db
        .select({ value: count() })
        .from(users)
        .where(and(eq(users.role, "admin"), ne(users.id, userId)));
      if (otherAdmins === 0) return failure("adminMembers.lastAdmin");
    }

    await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId));

    revalidatePath("/admin/members");
    return success("adminMembers.updated");
  });
}

export async function setMemberActiveAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await assertAdmin();

    const userId = String(formData.get("userId") ?? "");
    const isActive = String(formData.get("isActive") ?? "") === "true";
    if (!userId) return failure("error.notFound");

    await db
      .update(users)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(users.id, userId));

    revalidatePath("/admin/members");
    revalidatePath("/");
    return success("adminMembers.updated");
  });
}

export async function syncDiscordMembersAction(
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await assertAdmin();

    try {
      await syncDiscordGuildMembers();
      revalidatePath("/admin/members");
      revalidatePath("/");
      return success("adminMembers.synced");
    } catch (error) {
      if (error instanceof DiscordMemberSyncError) {
        return failure(error.code as TranslationKey);
      }
      throw error;
    }
  });
}
