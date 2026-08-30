"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { Trash2 } from "lucide-react";

import { ActionMessage } from "@/components/action-message";
import { SubmitButton } from "@/components/submit-button";
import { deleteItemAction } from "@/lib/actions/items";
import { idleState } from "@/lib/actions/types";
import { useT } from "@/lib/i18n/client";

export function DeleteItemButton({ itemId }: { itemId: string }) {
  const t = useT();
  const router = useRouter();
  const [state, formAction] = useActionState(deleteItemAction, idleState);

  useEffect(() => {
    if (state.status === "success") router.push("/admin/items");
  }, [state, router]);

  return (
    <div className="space-y-3">
      <form action={formAction}>
        <input type="hidden" name="id" value={itemId} />
        <SubmitButton className="btn-danger" confirm={t("common.confirmDelete")}>
          <Trash2 className="size-4" aria-hidden />
          {t("common.delete")}
        </SubmitButton>
      </form>
      <ActionMessage state={state} />
    </div>
  );
}
