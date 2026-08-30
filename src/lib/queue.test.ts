import assert from "node:assert/strict";
import { test } from "node:test";

import { orderQueue, type QueueCandidate } from "./queue";

let clock = 0;
function candidate(overrides: Partial<QueueCandidate> & { id: string }): QueueCandidate {
  clock += 1000;
  return {
    userId: overrides.id,
    quantityRequested: 1,
    gearRatingSnapshot: null,
    randomOrder: null,
    carryDepth: 0,
    priorRank: null,
    registeredAt: new Date(clock),
    ...overrides,
  };
}

const ids = (rows: QueueCandidate[]) => rows.map((row) => row.id);

test("gear queue orders by Gear Rating, highest first", () => {
  const rows = [
    candidate({ id: "low", gearRatingSnapshot: 12_000 }),
    candidate({ id: "high", gearRatingSnapshot: 38_000 }),
    candidate({ id: "mid", gearRatingSnapshot: 25_000 }),
  ];
  assert.deepEqual(ids(orderQueue(rows, "gear_queue")), ["high", "mid", "low"]);
});

test("a member without a Gear Rating never jumps the queue", () => {
  const rows = [
    candidate({ id: "unknown", gearRatingSnapshot: null }),
    candidate({ id: "known", gearRatingSnapshot: 11_000 }),
  ];
  assert.deepEqual(ids(orderQueue(rows, "gear_queue")), ["known", "unknown"]);
});

test("random queue follows the assigned shuffle, not Gear Rating", () => {
  const rows = [
    candidate({ id: "second", randomOrder: 0.8, gearRatingSnapshot: 40_000 }),
    candidate({ id: "first", randomOrder: 0.1, gearRatingSnapshot: 11_000 }),
  ];
  assert.deepEqual(ids(orderQueue(rows, "random_queue")), ["first", "second"]);
});

test("fifo queue follows registration time", () => {
  const early = candidate({ id: "early" });
  const late = candidate({ id: "late" });
  assert.deepEqual(ids(orderQueue([late, early], "fifo_queue")), [
    "early",
    "late",
  ]);
});

test("carried entries are drawn ahead of fresh registrations", () => {
  const rows = [
    candidate({ id: "fresh-strong", gearRatingSnapshot: 40_000 }),
    candidate({ id: "carried-weak", gearRatingSnapshot: 11_000, carryDepth: 1, priorRank: 3 }),
  ];
  assert.deepEqual(ids(orderQueue(rows, "gear_queue")), [
    "carried-weak",
    "fresh-strong",
  ]);
});

test("among carried entries the longest wait leads, then previous rank", () => {
  const rows = [
    candidate({ id: "carried-once-rank2", carryDepth: 1, priorRank: 2 }),
    candidate({ id: "carried-twice", carryDepth: 2, priorRank: 5 }),
    candidate({ id: "carried-once-rank1", carryDepth: 1, priorRank: 1 }),
  ];
  assert.deepEqual(ids(orderQueue(rows, "random_queue")), [
    "carried-twice",
    "carried-once-rank1",
    "carried-once-rank2",
  ]);
});

test("ordering is stable and does not mutate the input", () => {
  const rows = [
    candidate({ id: "b", gearRatingSnapshot: 20_000 }),
    candidate({ id: "a", gearRatingSnapshot: 20_000 }),
  ];
  const snapshot = ids(rows);
  const ordered = orderQueue(rows, "gear_queue");
  // Equal Gear Ratings fall back to who registered first.
  assert.deepEqual(ids(ordered), ["b", "a"]);
  assert.deepEqual(ids(rows), snapshot);
});

