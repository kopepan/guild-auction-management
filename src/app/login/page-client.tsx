"use client";

import { Moon } from "lucide-react";

import { SubmitButton } from "@/components/submit-button";
import { Card } from "@/components/ui";
import { PageLoader } from "@/components/spinner";
import { signInWithDevAction, signInWithDiscordAction } from "@/lib/actions/auth";
import { useT } from "@/lib/i18n/client";
import { usePageData } from "@/lib/use-page-data";

type LoginData = {
  discordConfigured: boolean;
  devLoginEnabled: boolean;
};

export default function LoginClient() {
  const state = usePageData<LoginData>("/login");
  const t = useT();

  if (state.status === "loading" || state.status === "redirect") {
    return <PageLoader />;
  }
  if (state.status === "notFound") {
    return null;
  }

  const { discordConfigured, devLoginEnabled } = state.data;

  return (
    <div className="mx-auto max-w-md py-10">
      <div className="mb-8 text-center">
        <span className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-linear-to-br from-moon-500 to-moon-700 shadow-lg shadow-moon-700/30">
          <Moon className="size-7 text-white" aria-hidden />
        </span>
        <h1 className="text-2xl font-semibold text-white">{t("login.title")}</h1>
        <p className="mt-2 text-sm text-white/50">{t("login.subtitle")}</p>
      </div>

      <Card>
        {discordConfigured ? (
          <form action={signInWithDiscordAction}>
            <SubmitButton className="btn-primary w-full" pendingLabel={t("login.signingIn")}>
              {t("login.discord")}
            </SubmitButton>
          </form>
        ) : (
          <p className="rounded-lg border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">
            {t("login.notConfigured")}
          </p>
        )}

        {devLoginEnabled ? (
          <form
            action={signInWithDevAction}
            className="mt-5 border-t border-white/10 pt-5"
          >
            <p className="text-sm font-medium text-white/80">
              {t("login.devTitle")}
            </p>
            <p className="mt-1 mb-3 text-xs text-white/40">
              {t("login.devHint")}
            </p>
            <div className="flex gap-2">
              <input
                name="name"
                required
                className="input"
                placeholder="MoonKnight"
                autoComplete="off"
              />
              <SubmitButton
                className="btn-ghost whitespace-nowrap"
                pendingLabel={t("login.signingIn")}
              >
                {t("login.devSubmit")}
              </SubmitButton>
            </div>
          </form>
        ) : null}
      </Card>
    </div>
  );
}
