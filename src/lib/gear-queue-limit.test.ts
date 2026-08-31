import assert from "node:assert/strict";
import { test } from "node:test";

import { wishlistTypeRules } from "./policy";

test("gear queue slot is only consumed by gear_queue type", () => {
  assert.equal(wishlistTypeRules.gear_queue.countsTowardWeeklyLimit, true);
  assert.equal(wishlistTypeRules.random_queue.countsTowardWeeklyLimit, false);
});
