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

/**
 * Resolve guild roles from DB first. Only call Discord when we have never
 * stored roles for this user — otherwise every page/action waits on Discord.
 * Fresh roles are written on Discord sign-in and member sync.
 */
export async function resolveDiscordRoleIds(
  userId: string,
  discordId: string,
  options?: { refresh?: boolean },
): Promise<string[]> {
  if (!options?.refresh) {
    const stored = await loadStoredDiscordRoleIds(userId);
    if (stored != null) return stored;
  }

  const roles = await fetchGuildMemberRoleIds(discordId);
  // Persist even an empty list so we do not re-hit Discord on every request
  // when the member genuinely has no guild roles (or the bot cannot see them).
  await saveDiscordRoleIds(userId, roles);
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

/**
 * Effective system-admin flag for the current request.
 * DB admins short-circuit; everyone else is checked/promoted once via Discord
 * config without a second Discord round-trip.
 */
export async function resolveIsSystemAdmin(
  userId: string,
  currentRole: "member" | "admin",
): Promise<boolean> {
  if (isSystemAdminRole(currentRole)) return true;
  const role = await ensureDiscordAdminPromotion(userId, currentRole);
  return isSystemAdminRole(role);
}

export async function persistDiscordRoleIds(
  userId: string,
  roles: string[] | undefined,
) {
  if (!roles) return;
  await saveDiscordRoleIds(userId, roles);
}
