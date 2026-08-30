import assert from "node:assert/strict";
import { test } from "node:test";

import {
  memberHasAdminDiscordRole,
  shouldPromoteToAdmin,
} from "./admin-access";

test("memberHasAdminDiscordRole matches configured role ids", () => {
  process.env.ADMIN_DISCORD_ROLE_IDS = "1522288621296685076,999";
  assert.equal(
    memberHasAdminDiscordRole(["1522288621296685076", "111"]),
    true,
  );
  assert.equal(memberHasAdminDiscordRole(["111"]), false);
  delete process.env.ADMIN_DISCORD_ROLE_IDS;
});

test("shouldPromoteToAdmin prefers explicit user ids and admin roles", () => {
  process.env.ADMIN_DISCORD_IDS = "user-1";
  process.env.ADMIN_DISCORD_ROLE_IDS = "role-1";
  assert.equal(
    shouldPromoteToAdmin({ discordId: "user-1", roles: [], adminCount: 5 }),
    true,
  );
  assert.equal(
    shouldPromoteToAdmin({ discordId: "other", roles: ["role-1"], adminCount: 5 }),
    true,
  );
  assert.equal(
    shouldPromoteToAdmin({ discordId: "other", roles: [], adminCount: 5 }),
    false,
  );
  assert.equal(
    shouldPromoteToAdmin({ discordId: "other", roles: [], adminCount: 0 }),
    true,
  );
  delete process.env.ADMIN_DISCORD_IDS;
  delete process.env.ADMIN_DISCORD_ROLE_IDS;
});
