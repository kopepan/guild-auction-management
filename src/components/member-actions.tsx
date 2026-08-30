"use client";

import { useActionState, useState } from "react";
import {
  Ban,
  ShieldCheck,
  ShieldOff,
  UserCheck,
  UserX,
} from "lucide-react";

import { SubmitButton } from "@/components/submit-button";
import {
  setMemberActiveAction,
  setMemberRoleAction,
} from "@/lib/actions/members";
import {
  issuePenaltyAction,
  liftPenaltyAction,
} from "@/lib/actions/penalties";
import { idleState } from "@/lib/actions/types";
import { useT } from "@/lib/i18n/client";

export function MemberActions({
  userId,
  role,
  isActive,
  activePenaltyId,
}: {
  userId: string;
  role: "member" | "admin";
  isActive: boolean;
  activePenaltyId: string | null;
}) {
  const t = useT();
  const [roleState, roleAction] = useActionState(
    setMemberRoleAction,
    idleState,
  );
  const [, activeAction] = useActionState(setMemberActiveAction, idleState);
  const [penaltyState, issuePenalty] = useActionState(
    issuePenaltyAction,
    idleState,
  );
  const [, liftPenalty] = useActionState(liftPenaltyAction, idleState);
  const [showPenaltyForm, setShowPenaltyForm] = useState(false);

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      <form action={roleAction}>
        <input type="hidden" name="userId" value={userId} />
        <input
          type="hidden"
          name="role"
          value={role === "admin" ? "member" : "admin"}
        />
        <SubmitButton className="btn-ghost btn-sm">
          {role === "admin" ? (
            <ShieldOff className="size-3.5" aria-hidden />
          ) : (
            <ShieldCheck className="size-3.5" aria-hidden />
          )}
          {role === "admin"
            ? t("adminMembers.demote")
            : t("adminMembers.promote")}
        </SubmitButton>
      </form>

      <form action={activeAction}>
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="isActive" value={String(!isActive)} />
        <SubmitButton className="btn-ghost btn-sm">
          {isActive ? (
            <UserX className="size-3.5" aria-hidden />
          ) : (
            <UserCheck className="size-3.5" aria-hidden />
          )}
          {isActive
            ? t("adminMembers.deactivate")
            : t("adminMembers.activate")}
        </SubmitButton>
      </form>

      {activePenaltyId ? (
        <form action={liftPenalty}>
          <input type="hidden" name="penaltyId" value={activePenaltyId} />
          <SubmitButton className="btn-ghost btn-sm">
            {t("penalty.lift")}
          </SubmitButton>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowPenaltyForm((open) => !open)}
          className="btn-ghost btn-sm"
        >
          <Ban className="size-3.5" aria-hidden />
          {t("penalty.title")}
        </button>
      )}

      {showPenaltyForm && !activePenaltyId ? (
        <form
          action={issuePenalty}
          className="w-full rounded-lg border border-white/10 bg-white/[0.03] p-3"
        >
          <input type="hidden" name="userId" value={userId} />
          <p className="mb-2 text-xs text-white/45">{t("penalty.hint")}</p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-xs text-white/50">
              {t("penalty.weeks")}
              <input
                type="number"
                name="weeks"
                min={1}
                max={4}
                defaultValue={1}
                className="input w-20"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-xs text-white/50">
              {t("penalty.reason")}
              <input type="text" name="reason" className="input" />
            </label>
            <SubmitButton className="btn-primary btn-sm">
              {t("penalty.issue")}
            </SubmitButton>
          </div>
          {penaltyState.status === "error" && penaltyState.message ? (
            <p className="mt-2 text-xs text-red-300">
              {t(penaltyState.message)}
            </p>
          ) : null}
        </form>
      ) : null}

      {roleState.status === "error" && roleState.message ? (
        <span className="w-full text-right text-xs text-red-300">
          {t(roleState.message)}
        </span>
      ) : null}
    </div>
  );
}
