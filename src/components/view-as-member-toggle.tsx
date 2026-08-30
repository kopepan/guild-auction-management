import { Eye, Shield } from "lucide-react";

import { SubmitButton } from "@/components/submit-button";
import {
  disableViewAsMemberAction,
  enableViewAsMemberAction,
} from "@/lib/actions/view-as-member";
import { getTranslations } from "@/lib/i18n/server";

export async function ViewAsMemberToggle({
  viewAsMember,
  prominent = false,
}: {
  viewAsMember: boolean;
  prominent?: boolean;
}) {
  const { t } = await getTranslations();
  const buttonClass = prominent
    ? "btn-primary btn-sm whitespace-nowrap"
    : "btn-ghost btn-sm whitespace-nowrap";

  if (viewAsMember) {
    return (
      <form action={disableViewAsMemberAction} className="flex items-center gap-2">
        <span className="rounded-lg border border-amber-400/25 bg-amber-400/10 px-2 py-1 text-[11px] text-amber-200">
          {t("nav.viewAsMemberActive")}
        </span>
        <SubmitButton className={buttonClass}>
          <Shield className="size-4" aria-hidden />
          {t("nav.exitViewAsMember")}
        </SubmitButton>
      </form>
    );
  }

  return (
    <form action={enableViewAsMemberAction}>
      <SubmitButton className={buttonClass}>
        <Eye className="size-4" aria-hidden />
        {t("nav.viewAsMember")}
      </SubmitButton>
    </form>
  );
}
