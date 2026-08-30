import { MemberActions } from "@/components/member-actions";
import { SyncDiscordMembersButton } from "@/components/sync-discord-members-button";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { getDiscordBotToken, getDiscordGuildId } from "@/lib/discord";
import { listActivePenalties, listMembers } from "@/lib/queries";
import { getTranslations } from "@/lib/i18n/server";

export default async function AdminMembersPage() {
  const { t } = await getTranslations();
  const [members, activePenalties] = await Promise.all([
    listMembers(),
    listActivePenalties(),
  ]);

  const penaltyByUser = new Map(
    activePenalties.map((penalty) => [penalty.userId, penalty]),
  );
  const discordSyncReady = Boolean(getDiscordGuildId() && getDiscordBotToken());

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
            const penalty = penaltyByUser.get(member.id);
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
                  role={member.role}
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
