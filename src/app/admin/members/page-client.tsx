"use client";

import { MemberActions } from "@/components/member-actions";
import { SyncDiscordMembersButton } from "@/components/sync-discord-members-button";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { PageLoader } from "@/components/spinner";
import { useT } from "@/lib/i18n/client";
import { usePageData } from "@/lib/use-page-data";

type AdminMembersData = {
  members: {
    id: string;
    name: string | null;
    characterName: string | null;
    inGameId: string | null;
    gearRating: number | null;
    role: string;
    isActive: boolean;
    entryCount: number;
    receivedCount: number;
  }[];
  penaltyByUser: Record<
    string,
    { id: string; userId: string; endsOn: string; reason: string | null }
  >;
  discordSyncReady: boolean;
};

export default function AdminMembersClient() {
  const state = usePageData<AdminMembersData>("/admin/members");
  const t = useT();

  if (state.status === "loading" || state.status === "redirect") {
    return <PageLoader />;
  }
  if (state.status === "notFound") {
    return null;
  }

  const { members, penaltyByUser, discordSyncReady } = state.data;

  return (
    <>
      <PageHeader
        title={t("adminMembers.title")}
        subtitle={t("adminMembers.subtitle")}
        action={
          discordSyncReady ? <SyncDiscordMembersButton /> : undefined
        }
      />

      {members.length === 0 ? (
        <EmptyState>{t("adminMembers.empty")}</EmptyState>
      ) : (
        <ul className="divide-y divide-white/6 rounded-xl border border-white/10 bg-white/[0.02]">
          {members.map((member) => {
            const penalty = penaltyByUser[member.id];
            return (
              <li
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 truncate text-sm font-medium text-white">
                    <span>{member.characterName || member.name || member.id}</span>
                    {member.role === "admin" ? (
                      <StatusBadge
                        status="admin"
                        label={t("common.admin")}
                      />
                    ) : null}
                    {!member.isActive ? (
                      <StatusBadge
                        status="inactive"
                        label={t("common.inactive")}
                      />
                    ) : null}
                    {penalty ? (
                      <StatusBadge
                        status="penalized"
                        label={t("penalty.banned")}
                      />
                    ) : null}
                  </p>
                  <p className="mt-0.5 flex flex-wrap gap-3 text-xs text-white/40">
                    {member.inGameId ? (
                      <span className="font-mono">{member.inGameId}</span>
                    ) : null}
                    {member.gearRating != null ? (
                      <span>
                        {t("items.gearRating")}{" "}
                        {member.gearRating.toLocaleString()}
                      </span>
                    ) : null}
                    <span>
                      {t("adminMembers.entries")}: {member.entryCount}
                    </span>
                    <span>
                      {t("adminMembers.received")}: {member.receivedCount}
                    </span>
                  </p>
                </div>

                <MemberActions
                  userId={member.id}
                  role={member.role as "member" | "admin"}
                  isActive={member.isActive}
                  activePenaltyId={penalty?.id ?? null}
                />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
