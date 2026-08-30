import assert from "node:assert/strict";
import { test } from "node:test";

import { resolveDiscordDisplayName, memberHasSyncRole } from "./discord";

test("resolveDiscordDisplayName prefers nickname then display name", () => {
  assert.equal(
    resolveDiscordDisplayName({
      nick: "Moon Knight",
      user: { id: "1", username: "user123", global_name: "Global Name" },
    }),
    "Moon Knight",
  );
  assert.equal(
    resolveDiscordDisplayName({
      user: { id: "1", username: "user123", global_name: "Global Name" },
    }),
    "Global Name",
  );
  assert.equal(
    resolveDiscordDisplayName({
      user: { id: "1", username: "user123" },
    }),
    "user123",
  );
});

test("memberHasSyncRole requires at least one configured role", () => {
  const member = {
    roles: ["111", "222"],
    user: { id: "1", username: "user123" },
  };
  assert.equal(memberHasSyncRole(member, []), true);
  assert.equal(memberHasSyncRole(member, ["222"]), true);
  assert.equal(memberHasSyncRole(member, ["333"]), false);
});
