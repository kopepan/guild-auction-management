"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { Trash2 } from "lucide-react";

import { ActionMessage } from "@/components/action-message";
import { SubmitButton } from "@/components/submit-button";
import { deleteEventAction } from "@/lib/actions/events";
import { idleState } from "@/lib/actions/types";
import { useT } from "@/lib/i18n/client";

export function DeleteEventButton({
  eventId,
  variant = "default",
}: {
  eventId: string;
  variant?: "default" | "inline";
}) {
  const t = useT();
  const router = useRouter();
  const [state, formAction] = useActionState(deleteEventAction, idleState);

  useEffect(() => {
    if (state.status !== "success") return;
    if (variant === "inline") router.refresh();
    else router.push("/admin/events");
  }, [state, router, variant]);

  const confirm = t("adminEvents.confirmDelete");

  if (variant === "inline") {
    return (
      <div className="space-y-2">
        <form action={formAction} className="inline">
          <input type="hidden" name="id" value={eventId} />
          <SubmitButton
            className="btn-danger btn-sm"
            confirm={confirm}
            title={t("common.delete")}
          >
            <Trash2 className="size-4" aria-hidden />
            <span className="sr-only">{t("common.delete")}</span>
          </SubmitButton>
        </form>
        {state.status === "error" ? <ActionMessage state={state} /> : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <form action={formAction}>
        <input type="hidden" name="id" value={eventId} />
        <SubmitButton className="btn-danger" confirm={confirm}>
          <Trash2 className="size-4" aria-hidden />
          {t("common.delete")}
        </SubmitButton>
      </form>
      <ActionMessage state={state} />
    </div>
  );
}
