import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { accounts, users } from "@/db/schema";
import {
  createTranslator,
  defaultLocale,
  type TranslationKey,
} from "@/lib/i18n/dictionaries";
import { getAppBaseUrl } from "@/lib/discord";
import { WISHLIST_TYPES, type WishlistType } from "@/lib/policy";
import { markOwnRegistrationReceived } from "@/lib/receipt";

const EPHEMERAL = 1 << 6;

type DiscordUser = { id: string };

type DiscordInteraction = {
  type: number;
  data?: {
    custom_id?: string;
    components?: {
      components?: { custom_id?: string; value?: string }[];
    }[];
  };
  member?: { user?: DiscordUser };
  user?: DiscordUser;
};

function t(key: TranslationKey, vars?: Record<string, string | number>) {
  return createTranslator(defaultLocale)(key, vars);
}

function ephemeral(content: string) {
  return {
    type: 4,
    data: {
      content,
      flags: EPHEMERAL,
    },
  };
}

function parseReceiveCustomId(customId: string): {
  eventId: string;
  itemId: string;
  queueType: WishlistType;
} | null {
  const [action, eventId, itemId, queueType] = customId.split(":");
  if (action !== "receive-mine" || !eventId || !itemId || !queueType) {
    return null;
  }
  if (!WISHLIST_TYPES.includes(queueType as WishlistType)) return null;
  return { eventId, itemId, queueType: queueType as WishlistType };
}

async function findUserByDiscordId(discordId: string) {
  const [row] = await db
    .select({ id: users.id })
    .from(accounts)
    .innerJoin(users, eq(users.id, accounts.userId))
    .where(
      and(
        eq(accounts.provider, "discord"),
        eq(accounts.providerAccountId, discordId),
      ),
    )
    .limit(1);
  return row ?? null;
}

function signInHint(): string {
  const baseUrl = getAppBaseUrl();
  const loginUrl = baseUrl ? `${baseUrl}/login` : "/login";
  return t("discord.needSignIn", { url: loginUrl });
}

/**
 * Handles Discord interaction payloads after signature verification.
 */
export async function handleDiscordInteraction(
  interaction: DiscordInteraction,
): Promise<Record<string, unknown>> {
  if (interaction.type === 1) {
    return { type: 1 };
  }

  const discordUser = interaction.member?.user ?? interaction.user;
  if (!discordUser?.id) {
    return ephemeral(t("error.unauthorized"));
  }

  const customId = interaction.data?.custom_id ?? "";

  if (interaction.type === 3) {
    const receive = parseReceiveCustomId(customId);
    if (!receive) return ephemeral(t("error.invalidInput"));

    const user = await findUserByDiscordId(discordUser.id);
    if (!user) return ephemeral(signInHint());

    const result = await markOwnRegistrationReceived({
      userId: user.id,
      eventId: receive.eventId,
      itemId: receive.itemId,
      queueType: receive.queueType,
    });
    return ephemeral(t(result.message));
  }

  return ephemeral(t("error.invalidInput"));
}
