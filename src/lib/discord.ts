import { createPublicKey, verify } from "node:crypto";

const DISCORD_API = "https://discord.com/api/v10";

const DISCORD_WEBHOOK_HOSTS = new Set([
  "discord.com",
  "discordapp.com",
  "canary.discord.com",
  "canary.discordapp.com",
  "ptb.discord.com",
  "ptb.discordapp.com",
]);

export function getDiscordWebhookUrl(): string | null {
  const configured = process.env.DISCORD_WEBHOOK_URL?.trim();
  if (!configured) return null;

  try {
    const url = new URL(configured);
    if (
      url.protocol !== "https:" ||
      !DISCORD_WEBHOOK_HOSTS.has(url.hostname) ||
      !url.pathname.startsWith("/api/webhooks/")
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function getDiscordBotToken(): string | null {
  const token = process.env.DISCORD_BOT_TOKEN?.trim();
  return token || null;
}

export function getDiscordGuildId(): string | null {
  const guildId = process.env.DISCORD_GUILD_ID?.trim();
  return guildId || null;
}

/** When set, only guild members with at least one of these Discord role IDs are synced. */
export function getDiscordMemberRoleIds(): string[] {
  return (process.env.DISCORD_MEMBER_ROLE_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export function getDiscordPublicKey(): string | null {
  const key = process.env.DISCORD_PUBLIC_KEY?.trim();
  return key && /^[0-9a-fA-F]{64}$/.test(key) ? key : null;
}

export function getAppBaseUrl(): string | null {
  const configured = process.env.AUTH_URL?.trim();
  if (!configured) return null;

  try {
    const url = new URL(configured);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Verifies an Interactions request using the application's Ed25519 public key.
 */
export function verifyDiscordInteraction(
  publicKeyHex: string,
  signatureHex: string,
  timestamp: string,
  rawBody: string,
): boolean {
  try {
    const key = createPublicKey({
      format: "jwk",
      key: {
        kty: "OKP",
        crv: "Ed25519",
        x: Buffer.from(publicKeyHex, "hex").toString("base64url"),
      },
    });
    return verify(
      null,
      Buffer.from(timestamp + rawBody),
      key,
      Buffer.from(signatureHex, "hex"),
    );
  } catch {
    return false;
  }
}

export async function resolveWebhookChannelId(
  webhookUrl: string,
): Promise<string | null> {
  const response = await fetch(webhookUrl, {
    method: "GET",
    headers: { "content-type": "application/json" },
    cache: "no-store",
  });
  if (!response.ok) return null;

  const payload = (await response.json()) as { channel_id?: string };
  return payload.channel_id ?? null;
}

export type DiscordMessagePayload = {
  content?: string;
  embeds?: { title: string; thumbnail: { url: string } }[];
  components?: {
    type: 1;
    components: {
      type: 2;
      style: number;
      label: string;
      custom_id: string;
    }[];
  }[];
  allowed_mentions?: { parse: string[]; users: string[] };
};

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Posts a message as the bot so interactive buttons are attached to it.
 */
export async function postBotChannelMessage(
  channelId: string,
  payload: DiscordMessagePayload,
): Promise<"ok" | "rate_limited" | "failed"> {
  const token = getDiscordBotToken();
  if (!token) return "failed";

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(
      `${DISCORD_API}/channels/${channelId}/messages`,
      {
        method: "POST",
        headers: {
          authorization: `Bot ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      },
    );

    if (response.ok) return "ok";
    if (response.status === 429) {
      const body = (await response.json().catch(() => null)) as {
        retry_after?: number;
      } | null;
      const retryAfterMs = Math.ceil((body?.retry_after ?? 1) * 1000);
      await sleep(retryAfterMs);
      continue;
    }
    return "failed";
  }

  return "rate_limited";
}

export function getDiscordImageUrl(
  value: string | null | undefined,
): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export type DiscordMemberUser = {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
  bot?: boolean;
};

export type DiscordMemberProfile = {
  nick?: string | null;
  roles?: string[];
  user: DiscordMemberUser;
};

export function memberHasSyncRole(
  member: DiscordMemberProfile,
  requiredRoleIds: string[],
): boolean {
  if (requiredRoleIds.length === 0) return true;
  const memberRoles = member.roles ?? [];
  return requiredRoleIds.some((roleId) => memberRoles.includes(roleId));
}

/** Prefer server nickname, then Discord display name, then username. */
export function resolveDiscordDisplayName(
  member: DiscordMemberProfile,
): string {
  const nick = member.nick?.trim();
  if (nick) return nick;

  const globalName = member.user.global_name?.trim();
  if (globalName) return globalName;

  return member.user.username.trim();
}

export function discordAvatarUrl(user: DiscordMemberUser): string | null {
  if (!user.avatar) return null;
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
}
