UPDATE "registration"
SET "status" = 'received',
    "settled_at" = COALESCE("settled_at", NOW())
WHERE "status" = 'auctioned';
--> statement-breakpoint
UPDATE "allocation"
SET "status" = 'received',
    "settled_at" = COALESCE("settled_at", NOW())
WHERE "status" = 'auctioned';
