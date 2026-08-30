"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";

import { ActionMessage, FieldError } from "@/components/action-message";
import { SubmitButton } from "@/components/submit-button";
import { createEventAction, updateEventAction } from "@/lib/actions/events";
import { idleState } from "@/lib/actions/types";
import { useT } from "@/lib/i18n/client";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { currentIsoWeek, parseIsoWeek } from "@/lib/week";

const editStatuses = ["open", "locked", "completed"] as const;

export type EventFormValues = {
  id?: string;
  week?: string;
  status: (typeof editStatuses)[number];
};

export function EventForm({ event }: { event?: EventFormValues }) {
  const t = useT();
  const router = useRouter();
  const isEdit = Boolean(event?.id);
  const defaultWeek = event?.week ?? currentIsoWeek();
  const [week, setWeek] = useState(defaultWeek);
  const [state, formAction] = useActionState(
    isEdit ? updateEventAction : createEventAction,
    idleState,
  );

  const preview = useMemo(() => parseIsoWeek(week), [week]);

  useEffect(() => {
    if (state.status === "success" && !isEdit) router.push("/admin/events");
  }, [state, isEdit, router]);

  return (
    <form action={formAction} className="space-y-4">
      {event?.id ? <input type="hidden" name="id" value={event.id} /> : null}

      <div>
        <label className="label" htmlFor="week">
          {t("adminEvents.week")}
        </label>
        <input
          id="week"
          name="week"
          type="week"
          required
          value={week}
          onChange={(e) => setWeek(e.target.value)}
          className="input sm:max-w-xs"
        />
        <p className="mt-1 text-xs text-white/40">{t("adminEvents.weekHint")}</p>
        <FieldError state={state} field="week" />
      </div>

      {preview ? (
        <div className="rounded-lg border border-white/8 bg-white/3 p-3 text-sm">
          <p className="text-xs text-white/40">{t("adminEvents.generatedName")}</p>
          <p className="mt-1 text-white">{preview.nameTh}</p>
          <p className="text-white/60">{preview.nameEn}</p>
          <p className="mt-2 text-xs text-white/40">
            {t("events.dates", { start: preview.startsOn, end: preview.endsOn })}
          </p>
        </div>
      ) : null}

      {isEdit ? (
        <div>
          <label className="label" htmlFor="status">
            {t("common.status")}
          </label>
          <select
            id="status"
            name="status"
            defaultValue={event?.status ?? "open"}
            className="input sm:max-w-xs"
          >
            {editStatuses.map((status) => (
              <option key={status} value={status} className="bg-night-900">
                {t(`event.status.${status}` as TranslationKey)}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <ActionMessage state={state} />

      <SubmitButton pendingLabel={t("common.saving")}>
        {isEdit ? t("common.save") : t("common.create")}
      </SubmitButton>
    </form>
  );
}
