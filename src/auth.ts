import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { count, eq } from "drizzle-orm";
import NextAuth, { type DefaultSession } from "next-auth";
import type { JWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import Discord from "next-auth/providers/discord";

import { db } from "@/db";
import { accounts, sessions, users, verificationTokens } from "@/db/schema";
import { shouldPromoteToAdmin } from "@/lib/admin-access";
import { persistDiscordRoleIds } from "@/lib/admin-access-runtime";
import { getUserProfile } from "@/lib/user-profile-cache";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "member" | "admin";
      characterName: string | null;
      inGameId: string | null;
      gearRating: number | null;
      gearRatingSubmittedEventId: string | null;
      wishlistConfirmedEventId: string | null;
      discordRoleIds: string[];
      isActive: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "member" | "admin";
    characterName?: string | null;
    inGameId?: string | null;
    gearRating?: number | null;
    gearRatingSubmittedEventId?: string | null;
    wishlistConfirmedEventId?: string | null;
    discordRoleIds?: string[];
    isActive?: boolean;
    image?: string | null;
    name?: string | null;
    profileCachedAt?: number;
  }
}

/**
 * Discord user IDs listed in ADMIN_DISCORD_IDS are always admins.
 * Members with a role listed in ADMIN_DISCORD_ROLE_IDS also become admins.
 * As a bootstrap for a brand new install, the very first account to sign in
 * also becomes an admin.
 */
const discordGuildId = process.env.DISCORD_GUILD_ID?.trim() || null;

export const devLoginEnabled =
  process.env.ALLOW_DEV_LOGIN === "true" && process.env.NODE_ENV !== "production";

const discordConfigured = Boolean(
  process.env.AUTH_DISCORD_ID && process.env.AUTH_DISCORD_SECRET,
);

type DiscordGuildMember = {
  nick?: string | null;
  roles?: string[];
  user?: {
    username?: string;
    global_name?: string | null;
  };
};

/**
 * Prefer the MoonShade server nickname, then Discord display name, then username.
 */
async function fetchGuildMember(
  accessToken: string,
): Promise<DiscordGuildMember | null> {
  if (!discordGuildId) return null;

  try {
    const response = await fetch(
      `https://discord.com/api/users/@me/guilds/${discordGuildId}/member`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
        signal: AbortSignal.timeout(2_500),
      },
    );

    if (!response.ok) return null;
    return (await response.json()) as DiscordGuildMember;
  } catch {
    return null;
  }
}

function resolveGuildDisplayName(member: DiscordGuildMember): string | null {
  const nick = member.nick?.trim();
  if (nick) return nick;

  const globalName = member.user?.global_name?.trim();
  if (globalName) return globalName;

  const username = member.user?.username?.trim();
  return username || null;
}

async function promoteIfEligible(
  userId: string,
  discordId?: string | null,
  roles?: string[],
) {
  const [{ value: adminCount }] = await db
    .select({ value: count() })
    .from(users)
    .where(eq(users.role, "admin"));

  if (
    shouldPromoteToAdmin({
      discordId,
      roles,
      adminCount,
    })
  ) {
    await db.update(users).set({ role: "admin" }).where(eq(users.id, userId));
  }
}

async function hydrateProfileToken(token: JWT): Promise<JWT> {
  if (!token.sub) return token;

  const record = await getUserProfile(token.sub);
  if (!record) return token;

  token.name = record.name;
  token.picture = record.image;
  token.role = record.role;
  token.characterName = record.characterName;
  token.inGameId = record.inGameId;
  token.gearRating = record.gearRating;
  token.gearRatingSubmittedEventId = record.gearRatingSubmittedEventId;
  token.wishlistConfirmedEventId = record.wishlistConfirmedEventId;
  token.discordRoleIds = record.discordRoleIds ?? [];
  token.isActive = record.isActive;
  token.profileCachedAt = Date.now();
  return token;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  // Required for `next start` / reverse proxies; Auth.js rejects localhost
  // otherwise with UntrustedHost.
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    ...(discordConfigured
      ? [
          Discord({
            authorization: {
              params: {
                // guilds.members.read is required for the server nickname.
                scope: discordGuildId
                  ? "identify email guilds guilds.members.read"
                  : "identify email",
              },
            },
          }),
        ]
      : []),
    ...(devLoginEnabled
      ? [
          Credentials({
            id: "dev",
            name: "Development login",
            credentials: {
              name: { label: "Character name", type: "text" },
            },
            async authorize(raw) {
              const name = String(raw?.name ?? "").trim();
              if (!name) return null;

              const email = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}@dev.local`;
              const existing = await db.query.users.findFirst({
                where: eq(users.email, email),
              });
              if (existing) return { id: existing.id, name: existing.name, email };

              const [created] = await db
                .insert(users)
                .values({ name, email, characterName: name })
                .returning();
              await promoteIfEligible(created.id);
              return { id: created.id, name: created.name, email };
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      // Always refresh profile from DB. Request slowness was Discord HTTP, not
      // this query — stale JWT broke Gear Rating / confirm redirects.
      return hydrateProfileToken(token);
    },
    session({ session, token }) {
      if (!token.sub) return session;

      session.user = {
        ...session.user,
        id: token.sub,
        name: token.name ?? session.user.name,
        image: (token.picture as string | null | undefined) ?? session.user.image,
        role: token.role ?? "member",
        characterName: token.characterName ?? null,
        inGameId: token.inGameId ?? null,
        gearRating: token.gearRating ?? null,
        gearRatingSubmittedEventId: token.gearRatingSubmittedEventId ?? null,
        wishlistConfirmedEventId: token.wishlistConfirmedEventId ?? null,
        discordRoleIds: token.discordRoleIds ?? [],
        isActive: token.isActive ?? true,
      };
      return session;
    },
  },
  events: {
    async signIn({ user, account, profile }) {
      if (!user.id) return;
      const discordId =
        account?.provider === "discord"
          ? (profile?.id as string | undefined) ?? account.providerAccountId
          : null;

      let roles: string[] | undefined;
      if (account?.provider === "discord" && account.access_token) {
        const member = await fetchGuildMember(account.access_token);
        if (member) {
          roles = member.roles;
          await persistDiscordRoleIds(user.id, roles);
          const guildName = resolveGuildDisplayName(member);
          if (guildName) {
            await db
              .update(users)
              .set({ name: guildName, updatedAt: new Date() })
              .where(eq(users.id, user.id));
          }
        }
      }

      await promoteIfEligible(user.id, discordId, roles);
    },
  },
});
