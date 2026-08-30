"use client";

import { useActionState } from "react";

import { ActionMessage } from "@/components/action-message";
import { SubmitButton } from "@/components/submit-button";
import {
  publishRulesToDiscordAction,
  saveRulesAction,
} from "@/lib/actions/settings";
import { idleState } from "@/lib/actions/types";
import { useT } from "@/lib/i18n/client";

export function RulesForm({
  valueEn,
  valueTh,
}: {
  valueEn: string | null;
  valueTh: string | null;
}) {
  const t = useT();
  const [state, formAction] = useActionState(saveRulesAction, idleState);
  const [discordState, publishRules] = useActionState(
    publishRulesToDiscordAction,
    idleState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <label className="label" htmlFor="valueTh">
            {t("rules.thai")}
          </label>
          <textarea
            id="valueTh"
            name="valueTh"
            rows={16}
            defaultValue={valueTh ?? ""}
            className="input resize-y leading-relaxed"
          />
        </div>
        <div>
          <label className="label" htmlFor="valueEn">
            {t("rules.english")}
          </label>
          <textarea
            id="valueEn"
            name="valueEn"
            rows={16}
            defaultValue={valueEn ?? ""}
            className="input resize-y leading-relaxed"
          />
        </div>
      </div>

      <ActionMessage state={state} />

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingLabel={t("common.saving")}>
          {t("common.save")}
        </SubmitButton>

        <form action={publishRules}>
          <SubmitButton
            className="btn-ghost"
            confirm={t("discord.confirmRules")}
            pendingLabel={t("discord.sending")}
          >
            {t("discord.sendRules")}
          </SubmitButton>
        </form>
      </div>

      <ActionMessage state={discordState} />
    </form>
  );
}
