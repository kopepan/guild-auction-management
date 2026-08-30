import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "@/auth";
import { ActionError } from "@/lib/action-error";

export { ActionError };

export type SessionUser = {
  id: string;
  name: string | null;
  image: string | null;
  role: "member" | "admin";
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
  return {
    id: session.user.id,
    name: session.user.name ?? null,
    image: session.user.image ?? null,
    role: session.user.role,
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
  if (user.role !== "admin") redirect("/");
  return user;
}

export async function assertAdmin(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new ActionError("error.unauthorized");
  if (user.role !== "admin") throw new ActionError("error.forbidden");
  return user;
}

export async function assertUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new ActionError("error.unauthorized");
  return user;
}
