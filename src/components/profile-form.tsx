"use client";

import { useActionState, useState } from "react";

import { ActionMessage, FieldError } from "@/components/action-message";
import { SubmitButton } from "@/components/submit-button";
import { updateProfileAction } from "@/lib/actions/profile";
import { idleState } from "@/lib/actions/types";
import { useT } from "@/lib/i18n/client";

export function ProfileForm({
  gearRating,
  blankDefault = false,
  hintKey = "profile.gearRatingHint",
  submitLabelKey = "common.save",
}: {
  gearRating: number | null;
  blankDefault?: boolean;
  hintKey?: "profile.gearRatingHint" | "registerGearRating.hint";
  submitLabelKey?: "common.save" | "registerGearRating.submit";
}) {
  const t = useT();
  const [state, formAction] = useActionState(updateProfileAction, idleState);
  const defaultValue = blankDefault ? "" : (gearRating ?? "");
  const [gearRatingInput, setGearRatingInput] = useState(defaultValue);
  const [confirming, setConfirming] = useState(false);

  function handlePrepareSubmit(event: React.FormEvent) {
    if (!blankDefault || confirming) return;
    event.preventDefault();
    setConfirming(true);
  }

  return (
    <form
      action={formAction}
      onSubmit={handlePrepareSubmit}
      className="space-y-4"
    >
      {blankDefault ? (
        <input type="hidden" name="forRegistrationRound" value="1" />
      ) : null}
      <div>
        <label className="label" htmlFor="gearRating">
          {t("profile.gearRating")}
        </label>
        <input
          id="gearRating"
          name="gearRating"
          value={gearRatingInput}
          onChange={(event) => {
            setGearRatingInput(event.target.value);
            if (confirming) setConfirming(false);
          }}
          required
          inputMode="numeric"
          min={0}
          type="number"
          className="input"
          autoComplete="off"
          readOnly={confirming}
        />
        <p className="mt-1 text-xs text-white/35">{t(hintKey)}</p>
        <FieldError state={state} field="gearRating" />
      </div>

      <ActionMessage state={state} />

      {blankDefault && confirming ? (
        <div className="space-y-3 rounded-lg border border-moon-500/30 bg-moon-600/10 px-3 py-3">
          <p className="text-sm text-moon-100">
            {t("registerGearRating.confirm", {
              gearRating: gearRatingInput,
            })}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => setConfirming(false)}
            >
              {t("common.cancel")}
            </button>
            <SubmitButton pendingLabel={t("common.saving")} className="btn-primary btn-sm">
              {t("wishlist.confirmSubmit")}
            </SubmitButton>
          </div>
        </div>
      ) : (
        <SubmitButton pendingLabel={t("common.saving")}>
          {t(submitLabelKey)}
        </SubmitButton>
      )}
    </form>
  );
}
