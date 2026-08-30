ALTER TABLE "item" DROP COLUMN IF EXISTS "ticket_value";--> statement-breakpoint
DROP TABLE IF EXISTS "ticket_tier";--> statement-breakpoint
DELETE FROM "setting" WHERE "key" = 'green_per_blue';
