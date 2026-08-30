/**
 * Wipes runtime / test data, then leaves the DB ready for `npm run db:seed`.
 * Keeps nothing except what the seed script will recreate.
 */
import { db } from ".";
import {
  accounts,
  allocations,
  eventItems,
  events,
  items,
  penalties,
  registrations,
  sessions,
  users,
  verificationTokens,
} from "./schema";

async function main() {
  console.log("Clearing allocations, registrations, rounds...");
  await db.delete(allocations);
  await db.delete(registrations);
  await db.delete(eventItems);
  await db.delete(events);
  await db.delete(penalties);

  console.log("Clearing users and auth sessions...");
  await db.delete(sessions);
  await db.delete(accounts);
  await db.delete(verificationTokens);
  await db.delete(users);

  console.log("Clearing item catalogue...");
  await db.delete(items);

  console.log("Done. Run: npm run db:seed");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
