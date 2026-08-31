"use client";

import { ProfileForm } from "@/components/profile-form";
import {
  Card,
  EmptyState,
  PageHeader,
  SectionTitle,
  StatusBadge,
} from "@/components/ui";
import { PageLoader } from "@/components/spinner";
import { useT } from "@/lib/i18n/client";
import { usePageData } from "@/lib/use-page-data";

type ProfileData = {
  gearRating: number | null;
  penalties: {
    id: string;
    startsOn: string;
    endsOn: string;
    reason: string | null;
    isActive: boolean;
  }[];
};

export default function ProfileClient() {
  const state = usePageData<ProfileData>("/profile");
  const t = useT();

  if (state.status === "loading" || state.status === "redirect") {
    return <PageLoader />;
  }
  if (state.status === "notFound") {
    return null;
  }

  const { gearRating, penalties } = state.data;

  return (
    <>
      <PageHeader title={t("profile.title")} subtitle={t("profile.subtitle")} />
      <div className="max-w-lg space-y-4">
        <Card>
          <ProfileForm gearRating={gearRating} />
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
