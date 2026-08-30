import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const sql = postgres(connectionString, { max: 1, prepare: false });
  const db = drizzle(sql);

  console.log("Running database migrations…");
  await migrate(db, { migrationsFolder: "drizzle" });
  await sql.end();
  console.log("Database migrations complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
