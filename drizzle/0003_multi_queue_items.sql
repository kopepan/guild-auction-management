ALTER TABLE "item" ADD COLUMN "queue_types" "wishlist_type"[] DEFAULT ARRAY['gear_queue']::wishlist_type[] NOT NULL;
ALTER TABLE "event_item" ADD COLUMN "queue_types" "wishlist_type"[] DEFAULT ARRAY['gear_queue']::wishlist_type[] NOT NULL;
ALTER TABLE "registration" ADD COLUMN "queue_type" "wishlist_type" DEFAULT 'gear_queue' NOT NULL;

UPDATE "item"
SET "queue_types" = ARRAY[
  CASE
    WHEN "wishlist_type" = 'title_random' THEN 'random_queue'::wishlist_type
    ELSE "wishlist_type"
  END
];

UPDATE "item"
SET "queue_types" = ARRAY[
  'gear_queue'::wishlist_type,
  'random_queue'::wishlist_type
]
WHERE "name_en" LIKE 'Royal %'
   OR "name_en" LIKE 'Mirage:%'
   OR "name_en" IN (
     'Red Accessory',
     'Mirage Card',
     'Red Accessory (Gear Rating queue)',
     'Mirage Card (Gear Rating queue)'
   );

UPDATE "event_item" ei
SET "queue_types" = i."queue_types"
FROM "item" i
WHERE i."id" = ei."item_id";

UPDATE "registration" r
SET "queue_type" = CASE
  WHEN i."wishlist_type" = 'title_random' THEN 'random_queue'::wishlist_type
  ELSE i."wishlist_type"
END
FROM "item" i
WHERE i."id" = r."item_id";

DROP INDEX "registration_unique";
CREATE UNIQUE INDEX "registration_unique"
  ON "registration" USING btree ("event_id", "item_id", "user_id", "queue_type");
