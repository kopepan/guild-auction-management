import type { Locale } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";
import { getSessionUser } from "@/lib/guards";
import { shouldUseRegistrationChrome } from "@/lib/phase";
import { getRegistrationRound } from "@/lib/queries";
import { isViewAsMember } from "@/lib/view-as-member";

export type BootstrapData = {
  locale: Locale;
  user: {
    name: string | null;
    characterName: string | null;
    isSystemAdmin: boolean;
    viewAsMember: boolean;
  } | null;
  registrationOnly: boolean;
  isSystemAdmin: boolean;
  viewAsMember: boolean;
};

export async function loadBootstrap(): Promise<BootstrapData> {
  const [locale, user, registrationRound, viewAsMember] = await Promise.all([
    getLocale(),
    getSessionUser(),
    getRegistrationRound(),
    isViewAsMember(),
  ]);

  const registrationOnly = shouldUseRegistrationChrome({
    registrationRound,
    user,
    viewAsMember,
  });

  return {
    locale,
    user: user
      ? {
          name: user.name,
          characterName: user.characterName,
          isSystemAdmin: user.isSystemAdmin,
          viewAsMember,
        }
      : null,
    registrationOnly,
    isSystemAdmin: Boolean(user?.isSystemAdmin),
    viewAsMember,
  };
}
