"use client";

import { RefreshCw } from "lucide-react";
import { useActionState } from "react";

import { ActionMessage } from "@/components/action-message";
import { SubmitButton } from "@/components/submit-button";
import { syncDiscordMembersAction } from "@/lib/actions/members";
import { idleState } from "@/lib/actions/types";
import { useT } from "@/lib/i18n/client";

export function SyncDiscordMembersButton() {
  const t = useT();
  const [state, formAction] = useActionState(
    syncDiscordMembersAction,
    idleState,
  );

  return (
    <form action={formAction} className="space-y-2">
      <SubmitButton
        pendingLabel={t("adminMembers.syncing")}
        className="btn-ghost btn-sm"
      >
        <RefreshCw className="size-4" aria-hidden />
        {t("adminMembers.syncDiscord")}
      </SubmitButton>
      <ActionMessage state={state} />
    </form>
  );
}
