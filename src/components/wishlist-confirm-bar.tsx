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
    <section className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-emerald-300/60 bg-linear-to-t from-emerald-950 via-emerald-900/95 to-night-950/98 px-4 py-4 shadow-[0_-20px_60px_rgba(16,185,129,0.35)] backdrop-blur-xl sm:py-5">
      <div
        className="pointer-events-none absolute inset-x-0 -top-px h-px bg-linear-to-r from-transparent via-emerald-300 to-transparent"
        aria-hidden
      />
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
        <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-emerald-400 text-night-950 shadow-[0_0_24px_rgba(52,211,153,0.55)]">
            <CheckCircle2 className="size-6" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold tracking-tight text-white sm:text-lg">
              {t("wishlist.readyToConfirm")}
            </p>
            <p className="mt-0.5 text-sm text-emerald-100/85">
              {t("wishlist.readyToConfirmHint")}
            </p>
          </div>
        </div>
        <form action={formAction} className="w-full shrink-0 sm:w-auto">
          <input type="hidden" name="eventId" value={eventId} />
          <SubmitButton
            className="btn w-full bg-emerald-400 px-6 py-3 text-base font-semibold text-night-950 shadow-[0_0_28px_rgba(52,211,153,0.45)] hover:bg-emerald-300 focus-visible:ring-2 focus-visible:ring-emerald-200 focus-visible:outline-none sm:w-auto"
            confirm={t("wishlist.confirmFinishPrompt")}
            pendingLabel={t("wishlist.confirming")}
          >
            {t("wishlist.confirmFinish")}
          </SubmitButton>
        </form>
      </div>
      <div className="mx-auto max-w-6xl">
        <ActionMessage state={state} />
      </div>
    </section>
  );
}
