import { eq, inArray, sql } from "drizzle-orm";

import { parseIsoWeek } from "@/lib/week";

import "./load-env";
import { db } from ".";
import {
  eventItems,
  events,
  items,
  registrations,
  SETTING_KEYS,
  settings,
  users,
} from "./schema";

/**
 * Seeds the item catalogue, the guild's published rules and one open round.
 */

/**
 * Red-quality accessories from RO World Journey's SEA equipment database.
 * Quality 6 is labelled Red and item type 60 is Accessory on the source page.
 */
const redQualityAccessories = [
  ["Royal Orleans's Glove", 70, "icon_equip_jewelry_102"],
  ["Royal Orleans's Necklace", 70, "icon_equip_jewelry_101"],
  ["Royal Rogue's Treasure", 70, "icon_equip_jewelry_21"],
  ["Royal Cold Heart", 70, "icon_equip_jewelry_63"],
  ["Royal Morrigane's Pendant", 70, "icon_equip_jewelry_36"],
  ["Royal Morrigane's Belt", 70, "icon_equip_jewelry_35"],
  ["Royal Ring of Shout", 70, "icon_equip_jewelry_62"],
  ["Royal Golden Bell", 70, "icon_equip_jewelry_81"],
  ["Royal Bradium Brooch", 70, "icon_equip_jewelry_74"],
  ["Royal Nile Rose", 70, "icon_equip_jewelry_32"],
  ["Royal Kind Heart", 70, "icon_equip_jewelry_76"],
  ["Royal Flower Ring", 70, "icon_equip_jewelry_13"],
  ["Royal Safety Ring", 70, "icon_equip_jewelry_16"],
  ["Royal Eye of Dullahan", 70, "icon_equip_jewelry_15"],
] satisfies ReadonlyArray<readonly [name: string, level: number, icon: string]>;

/** Retired from catalogue — removed on each seed so local DBs stay in sync. */
const retiredItemNames = [
  "Royal Recovery Ring",
  "Royal Exorcising Ring",
  "Royal Scarf Belt",
  "Royal Lunatic Brooch",
  "Royal Bradium Ring",
  "Royal Bison Horn",
] as const;

/**
 * Purple MVP cards from RO World Journey's SEA card handbook.
 * Quality 4 is Purple; monster class filter `mvp` marks MVP drops.
 */
const mvpPurpleCards = [
  ["Mirage: Mistress Card", "Backwear", "icon_item_card_fh_01"],
  ["Mirage: Orc Hero Card", "Headwear", "icon_item_card_sryx_01"],
  ["Mirage: Angeling Card", "Backwear", "icon_item_card_tsbl_01"],
  ["Mirage: Orc Lord Card", "Headwear", "icon_item_card_srqz_01"],
  ["Mirage: Osiris Card", "Mouthwear", "icon_item_card_esls_01"],
  ["Mirage: Phreeoni Card", "Mouthwear", "icon_item_card_pln_01"],
  ["Mirage: Dracula Card", "Facewear", "icon_item_card_dglnj_01"],
  ["Mirage: Goblin Leader Card", "Facewear", "icon_item_card_gblsl_01"],
] satisfies ReadonlyArray<
  readonly [name: string, slot: string, icon: string]
>;

const orangeRelicStats = ["STR", "AGI", "VIT", "INT", "DEX", "LUK"] as const;

/**
 * Catalogue: named red accessories and Mirage cards (both queue types), plus
 * random-only pets/boxes/title items. Generic category placeholders are
 * omitted — members register for specific named items.
 */
const titleUpgradeItems = [
  {
    nameEn: "Green Title Upgrade",
    nameTh: "อัพยศเขียว",
    category: "title" as const,
    wishlistType: "random_queue" as const,
    queueTypes: ["random_queue" as const],
    imageUrl: "https://roworlddb.com/media/images/item/icon_item_touxian_01.webp",
    descriptionEn:
      "Green title upgrade material. Random queue with quantity. Source: RO World Journey SEA guild shop (Merit).",
    descriptionTh: "ของอัพยศสีเขียว คิวสุ่ม ระบุจำนวนได้",
  },
  {
    nameEn: "Blue Title Upgrade",
    nameTh: "อัพยศฟ้า",
    category: "title" as const,
    wishlistType: "random_queue" as const,
    queueTypes: ["random_queue" as const],
    imageUrl: "https://roworlddb.com/media/images/item/icon_item_touxian_01.webp",
    descriptionEn:
      "Blue title upgrade material. Random queue with quantity. Source: RO World Journey SEA guild shop (Merit).",
    descriptionTh: "ของอัพยศสีฟ้า คิวสุ่ม ระบุจำนวนได้",
  },
  {
    nameEn: "Purple Title Upgrade",
    nameTh: "อัพยศม่วง",
    category: "title" as const,
    wishlistType: "random_queue" as const,
    queueTypes: ["random_queue" as const],
    imageUrl: "https://roworlddb.com/media/images/item/icon_item_touxian_01.webp",
    descriptionEn:
      "Purple title upgrade material. Random queue with quantity. Source: RO World Journey SEA guild shop (Merit).",
    descriptionTh: "ของอัพยศสีม่วง คิวสุ่ม ระบุจำนวนได้",
  },
  {
    nameEn: "Orange Title Upgrade",
    nameTh: "อัพยศส้ม",
    category: "title" as const,
    wishlistType: "random_queue" as const,
    queueTypes: ["random_queue" as const],
    imageUrl: "https://roworlddb.com/media/images/item/icon_item_touxian_01.webp",
    descriptionEn:
      "Orange title upgrade material. Random queue with quantity. Source: RO World Journey SEA guild shop (Merit).",
    descriptionTh: "ของอัพยศสีส้ม คิวสุ่ม ระบุจำนวนได้",
  },
];

const catalogue = [
  ...orangeRelicStats.map((stat) => ({
    nameEn: `Orange Relic - ${stat}`,
    nameTh: `Relic สีส้ม - ${stat}`,
    category: "other" as const,
    wishlistType: "gear_queue" as const,
    queueTypes: ["gear_queue" as const, "random_queue" as const],
    imageUrl:
      "https://roworlddb.com/media/images/item/icon_item_zhshengwu_01.webp",
    descriptionEn:
      `Orange-quality ${stat} Relic from the Ancient Ruins event. Available in both Gear Rating and random queues. Source: RO World Journey SEA event database.`,
    descriptionTh:
      `Relic สีส้ม - ${stat} จากกิจกรรม Ancient Ruins ลงได้ทั้งคิวตาม Gear Rating และคิวแบบสุ่ม`,
  })),
  {
    nameEn: "Rita",
    nameTh: "Rita",
    category: "pet" as const,
    wishlistType: "random_queue" as const,
    queueTypes: ["random_queue" as const],
    imageUrl: "https://roworlddb.com/media/images/pet/icon_pet_head_jjsn_3.webp",
    descriptionEn:
      "Legendary (SSR) pet. Random queue. Have enough diamonds ready, or you forfeit the round. Source: RO World Journey SEA pet library.",
    descriptionTh:
      "สัตว์เลี้ยงระดับ Legendary (SSR) คิวสุ่ม ต้องมีเพชรพร้อมประมูล ไม่พอถือว่าสละสิทธิในรอบนั้น",
  },
  {
    nameEn: "Advanced Gem Box",
    nameTh: "Advanced Gem Box",
    category: "box" as const,
    wishlistType: "random_queue" as const,
    queueTypes: ["random_queue" as const],
    imageUrl: "https://roworlddb.com/media/images/item/icon_item_stonebox_14.webp",
    descriptionEn:
      "A magical box filled with various gems. Random queue. Have enough diamonds for the amount you ask for, or you forfeit the round. Source: RO World Journey SEA guild shop (Merit).",
    descriptionTh:
      "กล่องอัญมณีเวทมนตร์ คิวสุ่ม ต้องมีเพชรพอตามจำนวนที่ระบุ ไม่พอถือว่าสละสิทธิในรอบนั้น",
  },
  ...titleUpgradeItems,
  ...redQualityAccessories.map(([name, level, icon]) => ({
    nameEn: name,
    category: "accessory" as const,
    wishlistType: "gear_queue" as const,
    queueTypes: ["gear_queue" as const, "random_queue" as const],
    imageUrl: `https://roworlddb.com/media/images/equip/${icon}.webp`,
    descriptionEn: `Red-quality accessory (level ${level}). Source: RO World Journey SEA equipment database.`,
  })),
  ...mvpPurpleCards.map(([name, slot, icon]) => ({
    nameEn: name,
    category: "card" as const,
    wishlistType: "gear_queue" as const,
    queueTypes: ["gear_queue" as const, "random_queue" as const],
    imageUrl: `https://roworlddb.com/media/images/item/${icon}.webp`,
    descriptionEn: `Purple MVP card (${slot}). Source: RO World Journey SEA card handbook.`,
  })),
];

const rulesEn = `MoonShade guild auction wishlist rules

Registration is per week. If you place a bid on an item that is not your queue, the guild managing group decides the penalty: a bid ban of 1 to 4 weeks, or expulsion from the guild.

Carry-over: when a queued entry is carried to next week, next week's new registrations queue behind those carried over.

Type 1 — Gear Rating queue, one item per week
Register to queue for a Red Accessory, Mirage Card or Orange Relic. The queue is ordered by Gear Rating, from highest to lowest. Queues are separate per item each week, and you may register for only one item of this type per week. If you do not have enough diamonds when your turn comes, you forfeit that round.

Type 2 — Random queue
Register to queue for a Red Accessory, Mirage Card, Orange Relic, Rita pet, Gem Box, Green Title Upgrade, Blue Title Upgrade, Purple Title Upgrade or Orange Title Upgrade. Everyone who registers is shuffled into a random order, and you may register for as many items as you like. For Advanced Gem Box and the four title upgrade items you may request a quantity; the manager reviews that quantity and marks whether the member received the item or forfeited. No actual stock count is required.

Keep your character name, 8-digit in-game ID and Gear Rating up to date. Your Gear Rating decides your place in Gear Rating queues.`;

const rulesTh = `กติกาการลงชื่อจองคิวประมูล (Wishlist) กิลด์ MoonShade

การลงชื่อเป็นแบบรายสัปดาห์ หากไม่มีสิทธิประมูลแต่ทำการประมูลทับ ทางทีมงานจะลงโทษตามวิจารณญาณ โดยบทลงโทษมีตั้งแต่ตัดสิทธิประมูล 1-4 สัปดาห์ หรือไล่ออกจากกิลด์

การยกคิว: เมื่อมีการยกคิวไปสัปดาห์หน้า คิวของสัปดาห์หน้าจะต่อหลังคิวที่ยกมา

ประเภทที่ 1 — Wishlist ต่อคิวตาม Gear Rating 1 ชิ้นต่อสัปดาห์
ลงชื่อ "ต่อคิว" ประดับแดง การ์ด Mirage หรือ Relic สีส้ม โดยจะจัดคิวเรียงตามค่า Gear Rating จากสูงสุดไปต่ำสุด แยกคิวตามแต่ละชิ้นที่มีคนลงชื่อในแต่ละสัปดาห์ โดยสามารถลงชื่อได้แค่ 1 ชิ้นต่อสัปดาห์ ผู้ที่ได้รับสิทธิจะต้องมีเพชรพอประมูลของที่ลงชื่อไว้ หากมีไม่พอจะถือว่าสละสิทธิในรอบนั้น

ประเภทที่ 2 — Wishlist แบบสุ่มคิว
ลงชื่อ "สุ่มคิว" ประดับแดง, การ์ด Mirage, Relic สีส้ม, สัตว์เลี้ยง Rita, กล่อง Gem Box และอัพยศทั้ง 4 สี โดยจะนำชื่อคนที่ลงชื่อทั้งหมดมาสุ่มจัดคิว สามารถลงชื่อกี่ชิ้นก็ได้ สำหรับ Advanced Gem Box และอัพยศทั้ง 4 สี สามารถระบุจำนวนได้ ผู้จัดการจะพิจารณาจำนวนที่ขอและกดยืนยันว่า “รับของแล้ว” หรือ “สละสิทธิ” โดยไม่ต้องกรอกจำนวนของจริง

กรุณาอัปเดตชื่อตัวละคร ID 8 หลัก และค่า Gear Rating ให้เป็นปัจจุบัน เพราะค่า Gear Rating ใช้จัดลำดับคิว`;

async function main() {
  console.log("Removing dev and demo test members...");
  await db.delete(users).where(
    sql`${users.email} LIKE '%@demo.local' OR ${users.email} LIKE '%@dev.local'`,
  );

  console.log("Splitting legacy Orange Relic into stat variants...");
  await db
    .update(items)
    .set({
      nameEn: "Orange Relic - STR",
      nameTh: "Relic สีส้ม - STR",
      descriptionEn:
        "Orange-quality STR Relic from the Ancient Ruins event. Available in both Gear Rating and random queues. Source: RO World Journey SEA event database.",
      descriptionTh:
        "Relic สีส้ม - STR จากกิจกรรม Ancient Ruins ลงได้ทั้งคิวตาม Gear Rating และคิวแบบสุ่ม",
      updatedAt: new Date(),
    })
    .where(eq(items.nameEn, "Orange Relic"));

  console.log("Renaming legacy title upgrade → Green Title Upgrade...");
  await db
    .update(items)
    .set({
      nameEn: "Green Title Upgrade",
      nameTh: "อัพยศเขียว",
      descriptionEn:
        "Green title upgrade material. Random queue with quantity. Source: RO World Journey SEA guild shop (Merit).",
      descriptionTh: "ของอัพยศสีเขียว คิวสุ่ม ระบุจำนวนได้",
      updatedAt: new Date(),
    })
    .where(inArray(items.nameEn, ["Traveler's Note", "อัพยศ"]));

  console.log("Removing retired level-40 accessories...");
  const retired = await db
    .select({ id: items.id })
    .from(items)
    .where(inArray(items.nameEn, [...retiredItemNames]));
  if (retired.length > 0) {
    const retiredIds = retired.map((row) => row.id);
    await db.delete(registrations).where(inArray(registrations.itemId, retiredIds));
    await db.delete(eventItems).where(inArray(eventItems.itemId, retiredIds));
    await db.delete(items).where(inArray(items.id, retiredIds));
  }

  console.log("Seeding item catalogue...");
  for (const item of catalogue) {
    await db
      .insert(items)
      .values(item)
      .onConflictDoUpdate({
        target: items.nameEn,
        set: {
          queueTypes: item.queueTypes,
          wishlistType: item.wishlistType,
          imageUrl: item.imageUrl ?? null,
          descriptionEn: item.descriptionEn ?? null,
          descriptionTh: "descriptionTh" in item ? item.descriptionTh ?? null : null,
          maxQuantityPerMember: null,
          updatedAt: new Date(),
        },
      });
  }
  await db.update(items).set({ maxQuantityPerMember: null });

  console.log("Seeding wishlist rules...");
  await db
    .insert(settings)
    .values({ key: SETTING_KEYS.rules, valueEn: rulesEn, valueTh: rulesTh })
    .onConflictDoUpdate({
      target: settings.key,
      set: { valueEn: rulesEn, valueTh: rulesTh, updatedAt: new Date() },
    });

  const existingEvents = await db.select({ id: events.id }).from(events);
  let eventId = existingEvents[0]?.id;

  if (!eventId) {
    console.log("Seeding this week's round...");
    const week = parseIsoWeek("2026-W33")!;
    const [created] = await db
      .insert(events)
      .values({
        nameEn: week.nameEn,
        nameTh: week.nameTh,
        startsOn: week.startsOn,
        endsOn: week.endsOn,
        status: "open",
      })
      .returning({ id: events.id });
    eventId = created.id;

  }

  const seeded = await db
    .select({
      id: items.id,
      queueTypes: items.queueTypes,
    })
    .from(items)
    .where(eq(items.isActive, true));

  await db
    .insert(eventItems)
    .values(
      seeded.map((item) => ({
        eventId: eventId!,
        itemId: item.id,
        queueTypes: item.queueTypes,
      })),
    )
    .onConflictDoNothing();

  const [{ count: itemCount }] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(items);
  console.log(`Done. ${itemCount} items in the catalogue.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
