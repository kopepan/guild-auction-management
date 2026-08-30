import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildQueueAnnouncement,
  splitDiscordMessage,
} from "./announcement";

test("queue announcement includes positions and carried entries", () => {
  const message = buildQueueAnnouncement({
    locale: "th",
    roundName: "รอบประจำสัปดาห์",
    items: [
      {
        name: "Advanced Gem Box",
        queueLabel: "คิวแบบสุ่ม",
        entries: [
          {
            position: 1,
            discordId: "999000111222333444",
            fallbackName: "MoonShade",
            quantityRequested: 2,
            carryDepth: 0,
            status: "pending",
          },
          {
            position: 2,
            discordId: null,
            fallbackName: "NightShade",
            quantityRequested: 1,
            carryDepth: 1,
            status: "pending",
          },
        ],
      },
    ],
  });

  assert.match(message, /รอบประจำสัปดาห์ — ลำดับคิวปัจจุบัน/);
  assert.match(
    message,
    /\*\*1\.\*\* <@999000111222333444> — ×2/,
  );
  assert.match(message, /\*\*2\.\*\* @NightShade — ยกมาจากรอบก่อน/);
  assert.doesNotMatch(message, /12345678|GR /);
});

test("queue announcement includes empty queues so members can join", () => {
  const message = buildQueueAnnouncement({
    locale: "th",
    roundName: "รอบประจำสัปดาห์",
    items: [
      {
        name: "Empty Item",
        queueLabel: "คิวแบบสุ่ม",
        entries: [],
      },
      {
        name: "Queued Item",
        queueLabel: "คิวแบบสุ่ม",
        entries: [
          {
            position: 1,
            discordId: "999000111222333444",
            fallbackName: "MoonShade",
            quantityRequested: 1,
            carryDepth: 0,
            status: "pending",
          },
        ],
      },
    ],
  });

  assert.match(message, /Empty Item/);
  assert.match(message, /ยังไม่มีคนลงชื่อ/);
  assert.match(message, /Queued Item/);
});

test("long Discord messages split at line boundaries", () => {
  const content = Array.from(
    { length: 12 },
    (_, index) => `queue entry ${index} ${"x".repeat(30)}`,
  ).join("\n");

  const chunks = splitDiscordMessage(content, 80);

  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((chunk) => chunk.length <= 80));
  assert.equal(chunks.join("\n"), content);
});
