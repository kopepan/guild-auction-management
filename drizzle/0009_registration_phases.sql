ALTER TABLE "user" ADD COLUMN "gear_rating_submitted_event_id" uuid;
--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_gear_rating_submitted_event_id_event_id_fk" FOREIGN KEY ("gear_rating_submitted_event_id") REFERENCES "public"."event"("id") ON DELETE set null ON UPDATE no action;
