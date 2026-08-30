"use client";

import { CheckCircle2, TriangleAlert } from "lucide-react";

import type { ActionState } from "@/lib/actions/types";
import { useT } from "@/lib/i18n/client";

export function ActionMessage({ state }: { state: ActionState }) {
  const t = useT();
  if (state.status === "idle" || !state.message) return null;

  const isError = state.status === "error";
  const Icon = isError ? TriangleAlert : CheckCircle2;

  return (
    <p
      role="status"
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
        isError
          ? "border-red-500/30 bg-red-500/10 text-red-200"
          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
      }`}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      {t(state.message)}
    </p>
  );
}

export function FieldError({
  state,
  field,
}: {
  state: ActionState;
  field: string;
}) {
  const t = useT();
  const key = state.fieldErrors?.[field];
  if (!key) return null;
  return <p className="mt-1 text-xs text-red-300">{t(key)}</p>;
}
