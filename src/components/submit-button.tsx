"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

import { Spinner } from "@/components/spinner";
import { useT } from "@/lib/i18n/client";

export function SubmitButton({
  children,
  className = "btn-primary",
  pendingLabel,
  confirm,
  title,
  name,
  value,
}: {
  children: ReactNode;
  className?: string;
  pendingLabel?: string;
  confirm?: string;
  title?: string;
  name?: string;
  value?: string;
}) {
  const t = useT();
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      name={name}
      value={value}
      title={title}
      className={className}
      disabled={pending}
      onClick={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
    >
      {pending ? (
        <>
          <Spinner size="sm" />
          {pendingLabel ?? t("common.loading")}
        </>
      ) : (
        children
      )}
    </button>
  );
}
