import { ProfileForm } from "@/components/profile-form";
import {
  Card,
  EmptyState,
  PageHeader,
  SectionTitle,
  StatusBadge,
} from "@/components/ui";
import { requireUser } from "@/lib/guards";
import { redirectProfileDuringRegistration } from "@/lib/phase";
import { getTranslations } from "@/lib/i18n/server";
import { listPenaltiesForUser } from "@/lib/queries";

export default async function ProfilePage() {
  await redirectProfileDuringRegistration();
  const user = await requireUser();
  const { t } = await getTranslations();
  const penalties = await listPenaltiesForUser(user.id);

  return (
    <>
      <PageHeader title={t("profile.title")} subtitle={t("profile.subtitle")} />
      <div className="max-w-lg space-y-4">
        <Card>
          <ProfileForm gearRating={user.gearRating} />
        </Card>

        <Card>
          <SectionTitle>{t("profile.penalties")}</SectionTitle>
          {penalties.length === 0 ? (
            <EmptyState>{t("profile.noPenalties")}</EmptyState>
          ) : (
            <ul className="divide-y divide-white/6 text-sm">
              {penalties.map((penalty) => (
                <li
                  key={penalty.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2"
                >
                  <span className="text-white/70">
                    {penalty.startsOn} – {penalty.endsOn}
                    {penalty.reason ? ` · ${penalty.reason}` : ""}
                  </span>
                  {penalty.isActive ? (
                    <StatusBadge
                      status="penalized"
                      label={t("penalty.banned")}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
