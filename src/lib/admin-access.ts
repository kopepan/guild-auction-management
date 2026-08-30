/** Discord user IDs that are always system admins. */
export function getAdminDiscordUserIds(): string[] {
  return (process.env.ADMIN_DISCORD_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

/** Discord guild role IDs whose members become system admins. */
export function getAdminDiscordRoleIds(): string[] {
  return (process.env.ADMIN_DISCORD_ROLE_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export function memberHasAdminDiscordRole(
  roles: string[] | undefined,
): boolean {
  const adminRoleIds = getAdminDiscordRoleIds();
  if (adminRoleIds.length === 0) return false;
  const memberRoles = roles ?? [];
  return adminRoleIds.some((roleId) => memberRoles.includes(roleId));
}

export function shouldPromoteToAdmin(input: {
  discordId?: string | null;
  roles?: string[];
  adminCount: number;
}): boolean {
  if (input.discordId && getAdminDiscordUserIds().includes(input.discordId)) {
    return true;
  }
  if (memberHasAdminDiscordRole(input.roles)) {
    return true;
  }
  return input.adminCount === 0;
}
