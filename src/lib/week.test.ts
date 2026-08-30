import assert from "node:assert/strict";
import { test } from "node:test";

import {
  currentIsoWeek,
  isoWeekFromDate,
  parseIsoWeek,
} from "./week";

test("parseIsoWeek maps ISO week to Monday through Sunday", () => {
  const week = parseIsoWeek("2026-W33");
  assert.equal(week?.isoWeek, "2026-W33");
  assert.equal(week?.startsOn, "2026-08-10");
  assert.equal(week?.endsOn, "2026-08-16");
  assert.equal(week?.nameEn, "10 Aug – 16 Aug 2026");
  assert.equal(week?.nameTh, "10 ส.ค. – 16 ส.ค. 2569");
});

test("parseIsoWeek rejects invalid values", () => {
  assert.equal(parseIsoWeek(""), null);
  assert.equal(parseIsoWeek("2026-08-10"), null);
  assert.equal(parseIsoWeek("2026-W99"), null);
});

test("isoWeekFromDate round-trips through parseIsoWeek", () => {
  const isoWeek = isoWeekFromDate("2026-08-12");
  assert.equal(isoWeek, "2026-W33");
  assert.equal(parseIsoWeek(isoWeek)?.startsOn, "2026-08-10");
});

test("currentIsoWeek returns a valid ISO week string", () => {
  assert.notEqual(parseIsoWeek(currentIsoWeek()), null);
});
