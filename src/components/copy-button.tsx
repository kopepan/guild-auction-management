"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { useT } from "@/lib/i18n/client";

export function CopyButton({ text }: { text: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className="btn-ghost btn-sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? (
        <Check className="size-4 text-emerald-300" aria-hidden />
      ) : (
        <Copy className="size-4" aria-hidden />
      )}
      {copied ? t("common.copied") : t("common.copy")}
    </button>
  );
}
