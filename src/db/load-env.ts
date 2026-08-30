import { existsSync } from "node:fs";

import { config } from "dotenv";

/** Load `.env.local` when present (local dev). Railway injects env vars directly. */
if (existsSync(".env.local")) {
  config({ path: ".env.local" });
}
