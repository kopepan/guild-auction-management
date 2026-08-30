import { and, count, eq } from "drizzle-orm";

import { db } from "@/db";
import { accounts, users } from "@/db/schema";
import {
  getAdminDiscordRoleIds,
  getAdminDiscordUserIds,
  isSystemAdminRole,
  memberHasAdminDiscordRole,
  shouldPromoteToAdmin,
} from "@/lib/admin-access";
import { getGuildMemberRoleIds } from "@/lib/discord";

export async function getDiscordAccountIdForUser(
  userId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ discordId: accounts.providerAccountId })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.provider, "discord")))
    .limit(1);
  return row?.discordId ?? null;
}

export async function userHasDiscordAdminAccess(userId: string): Promise<boolean> {
  const adminRoleIds = getAdminDiscordRoleIds();
  const adminUserIds = getAdminDiscordUserIds();
  if (adminRoleIds.length === 0 && adminUserIds.length === 0) return false;

  const discordId = await getDiscordAccountIdForUser(userId);
  if (!discordId) return false;
  if (adminUserIds.includes(discordId)) return true;
  if (adminRoleIds.length === 0) return false;

  const roles = await getGuildMemberRoleIds(discordId);
  return memberHasAdminDiscordRole(roles);
}

/** Promote Discord-configured managers and return their effective role. */
export async function ensureDiscordAdminPromotion(
  userId: string,
  currentRole: "member" | "admin",
): Promise<"member" | "admin"> {
  if (isSystemAdminRole(currentRole)) return "admin";

  const discordId = await getDiscordAccountIdForUser(userId);
  if (!discordId) return currentRole;

  const adminRoleIds = getAdminDiscordRoleIds();
  const roles =
    adminRoleIds.length > 0
      ? await getGuildMemberRoleIds(discordId)
      : undefined;

  const [{ value: adminCount }] = await db
    .select({ value: count() })
    .from(users)
    .where(eq(users.role, "admin"));

  if (
    !shouldPromoteToAdmin({
      discordId,
      roles,
      adminCount,
    })
  ) {
    return currentRole;
  }

  await db.update(users).set({ role: "admin" }).where(eq(users.id, userId));
  return "admin";
}
