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

/**
 * Only true serverless runtimes need a tiny pool. Railway / `next start` is a
 * long-lived Node process — treating it as serverless forced max=1 and made
 * every page serialize DB queries (~300ms+ each).
 */
const isServerless = Boolean(
  process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME,
);

const useInternalRailway =
  connectionString.includes("railway.internal") ||
  connectionString.includes(".rlwy.internal");

const client =
  globalForDb.moonshadeSql ??
  postgres(connectionString, {
    max: isServerless ? 1 : 10,
    // Required for pooled/serverless Postgres (Neon, Supabase pooler).
    prepare: false,
    // Private Railway networking does not need TLS; skipping handshake saves
    // a noticeable chunk of every query on the hobby tier.
    ssl: useInternalRailway ? false : undefined,
    // Keep connections warm. A 20s idle timeout was closing the pool between
    // page loads so the next request paid ~1s reconnect before any query.
    idle_timeout: isServerless ? 20 : 300,
    max_lifetime: isServerless ? 60 * 30 : 60 * 60,
    connect_timeout: 10,
  });

const isNewPool = !globalForDb.moonshadeSql;
// Reuse across hot reload and production workers in the same process.
globalForDb.moonshadeSql = client;

if (
  isNewPool &&
  (process.env.RAILWAY_ENVIRONMENT || process.env.TIMING_LOGS === "1")
) {
  console.info(
    `[db] pool max=${isServerless ? 1 : 10} internal=${useInternalRailway}`,
  );
}

export const db = drizzle(client, { schema });
export { schema };
