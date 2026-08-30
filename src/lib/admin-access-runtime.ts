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
import { fetchGuildMemberRoleIds } from "@/lib/discord";

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

async function loadStoredDiscordRoleIds(
  userId: string,
): Promise<string[] | null> {
  const record = await db.query.users.findFirst({
    columns: { discordRoleIds: true },
    where: eq(users.id, userId),
  });
  return record?.discordRoleIds ?? null;
}

async function saveDiscordRoleIds(userId: string, roles: string[]) {
  await db
    .update(users)
    .set({ discordRoleIds: roles, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

/** Resolve guild roles from DB, falling back to the Discord bot API. */
export async function resolveDiscordRoleIds(
  userId: string,
  discordId: string,
): Promise<string[]> {
  const stored = await loadStoredDiscordRoleIds(userId);
  if (
    stored &&
    stored.length > 0 &&
    (getAdminDiscordRoleIds().length === 0 ||
      memberHasAdminDiscordRole(stored))
  ) {
    return stored;
  }

  const roles = await fetchGuildMemberRoleIds(discordId);
  if (roles.length > 0) {
    await saveDiscordRoleIds(userId, roles);
  }
  return roles;
}

export async function userHasDiscordAdminAccess(userId: string): Promise<boolean> {
  const adminRoleIds = getAdminDiscordRoleIds();
  const adminUserIds = getAdminDiscordUserIds();
  if (adminRoleIds.length === 0 && adminUserIds.length === 0) return false;

  const discordId = await getDiscordAccountIdForUser(userId);
  if (!discordId) return false;
  if (adminUserIds.includes(discordId)) return true;
  if (adminRoleIds.length === 0) return false;

  const roles = await resolveDiscordRoleIds(userId, discordId);
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
      ? await resolveDiscordRoleIds(userId, discordId)
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

export async function resolveIsSystemAdmin(
  userId: string,
  currentRole: "member" | "admin",
): Promise<boolean> {
  const role = await ensureDiscordAdminPromotion(userId, currentRole);
  if (isSystemAdminRole(role)) return true;
  return userHasDiscordAdminAccess(userId);
}

export async function persistDiscordRoleIds(
  userId: string,
  roles: string[] | undefined,
) {
  if (!roles || roles.length === 0) return;
  await saveDiscordRoleIds(userId, roles);
}
