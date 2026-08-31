"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { CheckCircle2 } from "lucide-react";

import { ActionMessage } from "@/components/action-message";
import { SubmitButton } from "@/components/submit-button";
import { confirmWishlistAction } from "@/lib/actions/registrations";
import { idleState } from "@/lib/actions/types";
import { useT } from "@/lib/i18n/client";

export function WishlistConfirmBar({ eventId }: { eventId: string }) {
  const t = useT();
  const router = useRouter();
  const [state, formAction] = useActionState(confirmWishlistAction, idleState);

  useEffect(() => {
    if (state.status === "success") router.push("/wishlist/complete");
  }, [state, router]);

  return (
    <section className="mt-6 rounded-xl border border-emerald-400/30 bg-emerald-400/8 p-4">
      <div className="flex flex-wrap items-start gap-3">
        <CheckCircle2
          className="mt-0.5 size-5 shrink-0 text-emerald-300"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-emerald-100">
            {t("wishlist.readyToConfirm")}
          </p>
          <p className="mt-1 text-xs text-emerald-200/70">
            {t("wishlist.readyToConfirmHint")}
          </p>
        </div>
        <form action={formAction}>
          <input type="hidden" name="eventId" value={eventId} />
          <SubmitButton
            className="btn-primary"
            confirm={t("wishlist.confirmFinishPrompt")}
            pendingLabel={t("wishlist.confirming")}
          >
            {t("wishlist.confirmFinish")}
          </SubmitButton>
        </form>
      </div>
      <ActionMessage state={state} />
    </section>
  );
}
