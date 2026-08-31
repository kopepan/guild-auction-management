"use client";

import { ProfileForm } from "@/components/profile-form";
import { RegistrationSteps } from "@/components/registration-steps";
import { Card, PageHeader } from "@/components/ui";
import { PageLoader } from "@/components/spinner";
import { useT } from "@/lib/i18n/client";
import { usePageData } from "@/lib/use-page-data";

type RegisterGearRatingData = {
  round: { id: string };
};

export default function RegisterGearRatingClient() {
  const state = usePageData<RegisterGearRatingData>("/register/gear-rating");
  const t = useT();

  if (state.status === "loading" || state.status === "redirect") {
    return <PageLoader />;
  }
  if (state.status === "notFound") {
    return null;
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
          <ProfileForm
            blankDefault
            hintKey="registerGearRating.hint"
            submitLabelKey="registerGearRating.submit"
            gearRating={null}
          />
        </Card>
      </div>
    </>
  );
}
