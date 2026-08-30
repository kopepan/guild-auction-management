import { db } from "../src/db";
import { users } from "../src/db/schema";

/**
 * The suite drives the guild rules through the admin pages, so the account it
 * signs in with has to hold the admin role. Dev login only promotes the very
 * first account on a fresh install, which is not something a local database can
 * be relied on to be, so the role is set here instead.
 */
export const ADMIN_NAME = "GuildLeader";

/** Dev login derives this address from the name, so the row is reused. */
const ADMIN_EMAIL = "guildleader@dev.local";

export default async function globalSetup() {
  await db
    .insert(users)
    .values({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      characterName: ADMIN_NAME,
      role: "admin",
    })
    .onConflictDoUpdate({
      target: users.email,
      set: { role: "admin", isActive: true },
    });
}
