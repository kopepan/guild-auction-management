import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { accounts, users } from "@/db/schema";
import {
  getAdminDiscordRoleIds,
  getAdminDiscordUserIds,
  isSystemAdminRole,
  memberHasAdminDiscordRole,
} from "@/lib/admin-access";
import { fetchGuildMemberRoleIds } from "@/lib/discord";
import { timed } from "@/lib/timing";

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

/**
 * Prefer DB-cached guild roles. Never call Discord on the request hot path —
 * Railway logs showed multi-second stalls while waiting on Discord.
 * Roles refresh on Discord sign-in / member sync (`refresh: true`).
 */
export async function resolveDiscordRoleIds(
  userId: string,
  discordId: string,
  options?: { refresh?: boolean },
): Promise<string[]> {
  if (!options?.refresh) {
    const stored = await loadStoredDiscordRoleIds(userId);
    return stored ?? [];
  }

  const roles = await timed(
    "discord.fetchGuildMemberRoleIds",
    () => fetchGuildMemberRoleIds(discordId),
    { refresh: true },
  );
  await saveDiscordRoleIds(userId, roles);
  return roles;
}

async function promoteToAdmin(userId: string) {
  await db.update(users).set({ role: "admin" }).where(eq(users.id, userId));
}

/**
 * Effective system-admin flag for the current request.
 * Uses DB role + cached Discord ids/roles only — no Discord HTTP, no admin-count scan.
 */
export async function resolveIsSystemAdmin(
  userId: string,
  currentRole: "member" | "admin",
  storedDiscordRoleIds?: string[] | null,
): Promise<boolean> {
  if (isSystemAdminRole(currentRole)) return true;

  const adminUserIds = getAdminDiscordUserIds();
  const adminRoleIds = getAdminDiscordRoleIds();
  if (adminUserIds.length === 0 && adminRoleIds.length === 0) return false;

  // Role-based admins: use roles already loaded with the session profile.
  if (
    adminRoleIds.length > 0 &&
    memberHasAdminDiscordRole(storedDiscordRoleIds ?? [])
  ) {
    await promoteToAdmin(userId);
    return true;
  }

  if (adminUserIds.length === 0) return false;

  const discordId = await getDiscordAccountIdForUser(userId);
  if (!discordId) return false;
  if (!adminUserIds.includes(discordId)) return false;

  await promoteToAdmin(userId);
  return true;
}

export async function persistDiscordRoleIds(
  userId: string,
  roles: string[] | undefined,
) {
  if (!roles) return;
  await saveDiscordRoleIds(userId, roles);
}
