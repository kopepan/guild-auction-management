import { and, count, eq, inArray, not } from "drizzle-orm";

import { db } from "@/db";
import { accounts, users } from "@/db/schema";
import {
  discordAvatarUrl,
  getDiscordBotToken,
  getDiscordGuildId,
  getDiscordMemberRoleIds,
  memberHasSyncRole,
  resolveDiscordDisplayName,
  type DiscordMemberProfile,
} from "@/lib/discord";

const DISCORD_API = "https://discord.com/api/v10";

const adminDiscordIds = (process.env.ADMIN_DISCORD_IDS ?? "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

export type DiscordMemberSyncResult = {
  created: number;
  updated: number;
  total: number;
  deactivated: number;
};

export class DiscordMemberSyncError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

async function promoteIfEligible(userId: string, discordId: string) {
  const [{ value: adminCount }] = await db
    .select({ value: count() })
    .from(users)
    .where(eq(users.role, "admin"));

  const shouldPromote =
    adminDiscordIds.includes(discordId) || adminCount === 0;

  if (shouldPromote) {
    await db.update(users).set({ role: "admin" }).where(eq(users.id, userId));
  }
}

async function fetchGuildMemberPage(
  guildId: string,
  token: string,
  after?: string,
): Promise<DiscordMemberProfile[]> {
  const url = new URL(`${DISCORD_API}/guilds/${guildId}/members`);
  url.searchParams.set("limit", "1000");
  if (after) url.searchParams.set("after", after);

  const response = await fetch(url, {
    headers: { authorization: `Bot ${token}` },
    cache: "no-store",
  });

  if (response.status === 403) {
    throw new DiscordMemberSyncError("error.discordMembersIntent");
  }
  if (!response.ok) {
    throw new DiscordMemberSyncError("error.discordMembersFetchFailed");
  }

  return (await response.json()) as DiscordMemberProfile[];
}

export async function fetchAllGuildMembers(): Promise<DiscordMemberProfile[]> {
  const guildId = getDiscordGuildId();
  const token = getDiscordBotToken();
  if (!guildId) throw new DiscordMemberSyncError("error.discordSyncNotConfigured");
  if (!token) throw new DiscordMemberSyncError("error.discordSyncNotConfigured");

  const members: DiscordMemberProfile[] = [];
  let after: string | undefined;

  while (true) {
    const batch = await fetchGuildMemberPage(guildId, token, after);
    if (batch.length === 0) break;

    members.push(...batch);
    if (batch.length < 1000) break;
    after = batch[batch.length - 1]?.user.id;
  }

  return members;
}

async function deactivateMembersOutsideRole(activeDiscordIds: Set<string>) {
  const requiredRoleIds = getDiscordMemberRoleIds();
  if (requiredRoleIds.length === 0 || activeDiscordIds.size === 0) {
    return 0;
  }

  const linked = await db
    .select({
      userId: accounts.userId,
      discordId: accounts.providerAccountId,
      role: users.role,
    })
    .from(accounts)
    .innerJoin(users, eq(users.id, accounts.userId))
    .where(eq(accounts.provider, "discord"));

  const toDeactivate = linked
    .filter(
      (row) =>
        row.role !== "admin" && !activeDiscordIds.has(row.discordId),
    )
    .map((row) => row.userId);

  if (toDeactivate.length === 0) return 0;

  await db
    .update(users)
    .set({ isActive: false, updatedAt: new Date() })
    .where(
      and(
        inArray(users.id, toDeactivate),
        eq(users.isActive, true),
        not(eq(users.role, "admin")),
      ),
    );

  return toDeactivate.length;
}

export async function syncDiscordGuildMembers(): Promise<DiscordMemberSyncResult> {
  const requiredRoleIds = getDiscordMemberRoleIds();
  const members = await fetchAllGuildMembers();
  const eligible = members.filter(
    (member) => !member.user.bot && memberHasSyncRole(member, requiredRoleIds),
  );

  let created = 0;
  let updated = 0;
  const activeDiscordIds = new Set<string>();

  for (const member of eligible) {
    const discordId = member.user.id;
    activeDiscordIds.add(discordId);
    const displayName = resolveDiscordDisplayName(member);
    const image = discordAvatarUrl(member.user);

    const [linked] = await db
      .select({ userId: accounts.userId })
      .from(accounts)
      .where(
        and(
          eq(accounts.provider, "discord"),
          eq(accounts.providerAccountId, discordId),
        ),
      )
      .limit(1);

    if (linked) {
      await db
        .update(users)
        .set({
          name: displayName,
          image,
          updatedAt: new Date(),
        })
        .where(eq(users.id, linked.userId));
      updated += 1;
      continue;
    }

    const [createdUser] = await db
      .insert(users)
      .values({
        name: displayName,
        email: `discord+${discordId}@moonshade.local`,
        image,
      })
      .returning({ id: users.id });

    await db.insert(accounts).values({
      userId: createdUser.id,
      type: "oauth",
      provider: "discord",
      providerAccountId: discordId,
    });

    await promoteIfEligible(createdUser.id, discordId);
    created += 1;
  }

  const deactivated = await deactivateMembersOutsideRole(activeDiscordIds);

  return {
    created,
    updated,
    total: eligible.length,
    deactivated,
  };
}
