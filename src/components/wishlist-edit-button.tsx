"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { Pencil } from "lucide-react";

import { SubmitButton } from "@/components/submit-button";
import { editWishlistAction } from "@/lib/actions/registrations";
import { idleState } from "@/lib/actions/types";
import { useT } from "@/lib/i18n/client";

export function WishlistEditButton() {
  const t = useT();
  const router = useRouter();
  const [state, formAction] = useActionState(editWishlistAction, idleState);

  useEffect(() => {
    if (state.status === "success") router.push("/wishlist");
  }, [state, router]);

  return (
    <form action={formAction}>
      <SubmitButton
        className="btn-ghost"
        pendingLabel={t("common.loading")}
      >
        <Pencil className="size-4" aria-hidden />
        {t("wishlist.editEntries")}
      </SubmitButton>
    </form>
  );
}
