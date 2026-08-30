ALTER TABLE "event_item" ALTER COLUMN "quantity" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "event_item" ALTER COLUMN "quantity" DROP NOT NULL;--> statement-breakpoint
UPDATE "event_item"
SET "quantity" = NULL
WHERE NOT EXISTS (
  SELECT 1
  FROM "allocation"
  WHERE "allocation"."event_item_id" = "event_item"."id"
);
