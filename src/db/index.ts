import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local.");
}

// Next.js hot reloading would otherwise open a new pool on every edit.
const globalForDb = globalThis as unknown as {
  moonshadeSql?: ReturnType<typeof postgres>;
};

const isServerless = Boolean(
  process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME,
);

const client =
  globalForDb.moonshadeSql ??
  postgres(connectionString, {
    max: isServerless ? 1 : 10,
    // Required for pooled/serverless Postgres (Neon, Supabase pooler).
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.moonshadeSql = client;
}

export const db = drizzle(client, { schema });
export { schema };
