import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "@/auth";
import { ActionError } from "@/lib/action-error";
import { isSystemAdminRole } from "@/lib/admin-access";
import { ensureDiscordAdminPromotion } from "@/lib/admin-access-runtime";

export { ActionError };

export type SessionUser = {
  id: string;
  name: string | null;
  image: string | null;
  role: "member" | "admin";
  /** True for DB admins and Discord-configured managers. */
  isSystemAdmin: boolean;
  characterName: string | null;
  inGameId: string | null;
  gearRating: number | null;
  gearRatingSubmittedEventId: string | null;
  isActive: boolean;
};

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  let session;
  try {
    session = await auth();
  } catch {
    // Stale or tampered JWT cookies (e.g. after AUTH_SECRET changed) should
    // behave like a signed-out visitor, not crash the layout.
    return null;
  }
  if (!session?.user?.id) return null;

  const role = await ensureDiscordAdminPromotion(
    session.user.id,
    session.user.role,
  );

  return {
    id: session.user.id,
    name: session.user.name ?? null,
    image: session.user.image ?? null,
    role,
    isSystemAdmin: isSystemAdminRole(role),
    characterName: session.user.characterName,
    inGameId: session.user.inGameId,
    gearRating: session.user.gearRating,
    gearRatingSubmittedEventId: session.user.gearRatingSubmittedEventId,
    isActive: session.user.isActive,
  };
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.isSystemAdmin) redirect("/");
  return user;
}

export async function assertAdmin(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new ActionError("error.unauthorized");
  if (!user.isSystemAdmin) throw new ActionError("error.forbidden");
  return user;
}

export async function assertUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new ActionError("error.unauthorized");
  return user;
}
