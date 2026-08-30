"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { SETTING_KEYS, settings } from "@/db/schema";
import { splitDiscordMessage } from "@/lib/announcement";
import {
  failure,
  runAction,
  success,
  type ActionState,
} from "@/lib/actions/types";
import {
  getAppBaseUrl,
  getDiscordBotToken,
  getDiscordWebhookUrl,
  postBotChannelMessage,
  resolveWebhookChannelId,
} from "@/lib/discord";
import { assertAdmin } from "@/lib/guards";
import { getTranslations } from "@/lib/i18n/server";
import { getSetting } from "@/lib/queries";

export async function saveRulesAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await assertAdmin();

    const valueEn = String(formData.get("valueEn") ?? "").trim() || null;
    const valueTh = String(formData.get("valueTh") ?? "").trim() || null;

    await db
      .insert(settings)
      .values({ key: SETTING_KEYS.rules, valueEn, valueTh })
      .onConflictDoUpdate({
        target: settings.key,
        set: { valueEn, valueTh, updatedAt: new Date() },
      });

    revalidatePath("/rules");
    revalidatePath("/admin/rules");
    return success("common.save");
  });
}

async function resolveDiscordChannelId() {
  const webhookUrl = getDiscordWebhookUrl();
  if (!webhookUrl || !getDiscordBotToken()) return null;
  return resolveWebhookChannelId(webhookUrl);
}

export async function publishRulesToDiscordAction(
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await assertAdmin();

    const channelId = await resolveDiscordChannelId();
    if (!channelId) return failure("discord.botNotConfigured");

    const setting = await getSetting(SETTING_KEYS.rules);
    const valueTh = setting?.valueTh?.trim() ?? "";
    const valueEn = setting?.valueEn?.trim() ?? "";
    if (!valueTh && !valueEn) return failure("discord.rulesEmpty");

    const { t } = await getTranslations();
    const baseUrl = getAppBaseUrl();
    const rulesUrl = baseUrl ? `${baseUrl}/rules` : null;

    const sections: string[] = [];
    if (valueTh) {
      sections.push(`${t("discord.rulesHeadingTh")}\n\n${valueTh}`);
    }
    if (valueEn) {
      sections.push(`${t("discord.rulesHeadingEn")}\n\n${valueEn}`);
    }
    if (rulesUrl) {
      sections.push(t("discord.rulesLink", { url: rulesUrl }));
    }

    const chunks = splitDiscordMessage(sections.join("\n\n"));
    for (const content of chunks) {
      const posted = await postBotChannelMessage(channelId, { content });
      if (posted === "rate_limited") return failure("discord.rateLimited");
      if (posted === "failed") return failure("discord.sendFailed");
    }

    return success("discord.rulesSent");
  });
}
