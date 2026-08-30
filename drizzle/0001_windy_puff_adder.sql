CREATE TABLE "ticket_tier" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"min_gear_rating" integer NOT NULL,
	"blue_tickets" integer DEFAULT 0 NOT NULL,
	"green_tickets" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "ticket_tier_min_gear_rating_unique" ON "ticket_tier" USING btree ("min_gear_rating");