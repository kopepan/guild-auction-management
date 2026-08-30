import { redirect } from "next/navigation";

import { ProfileForm } from "@/components/profile-form";
import { RegistrationSteps } from "@/components/registration-steps";
import { Card, PageHeader } from "@/components/ui";
import { getTranslations } from "@/lib/i18n/server";
import {
  redirectIfGearRatingCompleteForRound,
} from "@/lib/phase";
import { getRegistrationRound } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function RegisterGearRatingPage() {
  await redirectIfGearRatingCompleteForRound();

  const { t } = await getTranslations();
  const round = await getRegistrationRound();

  if (!round) {
    redirect("/wishlist");
  }

  return (
    <>
      <PageHeader
        title={t("registerGearRating.title")}
        subtitle={t("registerGearRating.subtitle")}
      />
      <RegistrationSteps current="gr" />
      <div className="mx-auto max-w-md">
        <Card>
          <ProfileForm blankDefault hintKey="registerGearRating.hint" submitLabelKey="registerGearRating.submit" gearRating={null} />
        </Card>
      </div>
    </>
  );
}
