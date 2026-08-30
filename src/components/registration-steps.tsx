"use client";

import { Check } from "lucide-react";

import { useT } from "@/lib/i18n/client";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

export type RegistrationStep = "gr" | "gear_queue" | "random_queue";

const STEPS: { id: RegistrationStep; labelKey: TranslationKey }[] = [
  { id: "gr", labelKey: "wishlist.step.gr" },
  { id: "gear_queue", labelKey: "wishlist.step.gearQueue" },
  { id: "random_queue", labelKey: "wishlist.step.randomQueue" },
];

function stepIndex(step: RegistrationStep) {
  return STEPS.findIndex((item) => item.id === step);
}

export function RegistrationSteps({
  current,
  allComplete = false,
}: {
  current: RegistrationStep;
  allComplete?: boolean;
}) {
  const t = useT();
  const currentIndex = allComplete ? STEPS.length : stepIndex(current);

  return (
    <ol className="mb-6 flex flex-wrap items-center gap-2 sm:gap-0">
      {STEPS.map((step, index) => {
        const done = index < currentIndex || allComplete;
        const active = !allComplete && index === currentIndex;

        return (
          <li key={step.id} className="flex items-center">
            {index > 0 ? (
              <span
                className={`mx-2 hidden h-px w-6 sm:block ${
                  done ? "bg-moon-500/60" : "bg-white/15"
                }`}
                aria-hidden
              />
            ) : null}
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
                active
                  ? "border-moon-500/50 bg-moon-600/20 text-moon-300"
                  : done
                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                    : "border-white/10 bg-white/3 text-white/40"
              }`}
            >
              <span
                className={`grid size-5 place-items-center rounded-full text-[10px] ${
                  active
                    ? "bg-moon-500 text-white"
                    : done
                      ? "bg-emerald-500/25 text-emerald-200"
                      : "bg-white/10 text-white/45"
                }`}
              >
                {done ? <Check className="size-3" aria-hidden /> : index + 1}
              </span>
              {t(step.labelKey)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
