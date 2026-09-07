import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";

export type UserProfileRow = {
  id: string;
  name: string | null;
  image: string | null;
  role: "member" | "admin";
  characterName: string | null;
  inGameId: string | null;
  gearRating: number | null;
  gearRatingSubmittedEventId: string | null;
  wishlistConfirmedEventId: string | null;
  discordRoleIds: string[] | null;
  isActive: boolean;
};

type CacheEntry = { savedAt: number; profile: UserProfileRow };

const cache = new Map<string, CacheEntry>();
const TTL_MS = 5_000;

export function invalidateUserProfileCache(userId: string) {
  cache.delete(userId);
}

export async function getUserProfile(
  userId: string,
): Promise<UserProfileRow | null> {
  const hit = cache.get(userId);
  if (hit && Date.now() - hit.savedAt < TTL_MS) {
    return hit.profile;
  }

  const started = performance.now();
  const [record] = await db
    .select({
      id: users.id,
      name: users.name,
      image: users.image,
      role: users.role,
      characterName: users.characterName,
      inGameId: users.inGameId,
      gearRating: users.gearRating,
      gearRatingSubmittedEventId: users.gearRatingSubmittedEventId,
      wishlistConfirmedEventId: users.wishlistConfirmedEventId,
      discordRoleIds: users.discordRoleIds,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (process.env.RAILWAY_ENVIRONMENT || process.env.TIMING_LOGS === "1") {
    const ms = Math.round(performance.now() - started);
    console.info(
      `[timing] userProfile.db ${ms}ms cache=${hit ? "stale" : "miss"}`,
    );
  }

  if (!record) {
    cache.delete(userId);
    return null;
  }

  cache.set(userId, { savedAt: Date.now(), profile: record });
  return record;
}
