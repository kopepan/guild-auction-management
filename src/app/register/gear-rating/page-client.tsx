"use client";

import { ProfileForm } from "@/components/profile-form";
import { RegistrationSteps } from "@/components/registration-steps";
import { Card, PageHeader } from "@/components/ui";
import { PageLoader } from "@/components/spinner";
import { useT } from "@/lib/i18n/client";
import { usePageData } from "@/lib/use-page-data";

type RegisterGearRatingData = {
  round: { id: string };
  gearRating: number | null;
  alreadySubmitted: boolean;
  gearStepComplete: boolean;
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

  const { gearRating, alreadySubmitted, gearStepComplete } = state.data;

  return (
    <>
      <PageHeader
        title={t("registerGearRating.title")}
        subtitle={
          alreadySubmitted
            ? t("registerGearRating.editSubtitle")
            : t("registerGearRating.subtitle")
        }
      />
      <RegistrationSteps
        current="gr"
        hrefs={
          alreadySubmitted
            ? {
                gr: "/register/gear-rating",
                gear_queue: "/wishlist?queue=gear_queue",
                ...(gearStepComplete
                  ? { random_queue: "/wishlist?queue=random_queue" }
                  : {}),
              }
            : undefined
        }
      />
      <div className="mx-auto max-w-md">
        <Card>
          <ProfileForm
            blankDefault={!alreadySubmitted}
            requireConfirm
            forRegistrationRound
            hintKey="registerGearRating.hint"
            submitLabelKey={
              alreadySubmitted
                ? "registerGearRating.update"
                : "registerGearRating.submit"
            }
            gearRating={gearRating}
          />
        </Card>
      </div>
    </>
  );
}
