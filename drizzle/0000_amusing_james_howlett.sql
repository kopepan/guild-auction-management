CREATE TYPE "public"."allocation_status" AS ENUM('proposed', 'received', 'forfeited', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('draft', 'open', 'locked', 'completed');--> statement-breakpoint
CREATE TYPE "public"."item_category" AS ENUM('accessory', 'card', 'pet', 'box', 'title', 'weapon', 'armor', 'costume', 'material', 'consumable', 'other');--> statement-breakpoint
CREATE TYPE "public"."registration_status" AS ENUM('pending', 'allocated', 'received', 'unfilled', 'forfeited', 'skipped', 'penalized', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('member', 'admin');--> statement-breakpoint
CREATE TYPE "public"."wishlist_type" AS ENUM('gear_queue', 'random_queue', 'title_random', 'fifo_queue');--> statement-breakpoint
CREATE TABLE "account" (
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "account_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "allocation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_item_id" uuid NOT NULL,
	"registration_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"slot" integer NOT NULL,
	"quantity_requested" integer DEFAULT 1 NOT NULL,
	"quantity_allocated" integer DEFAULT 1 NOT NULL,
	"status" "allocation_status" DEFAULT 'proposed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"settled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "event_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name_en" text NOT NULL,
	"name_th" text,
	"starts_on" date,
	"ends_on" date,
	"status" "event_status" DEFAULT 'draft' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name_en" text NOT NULL,
	"name_th" text,
	"category" "item_category" DEFAULT 'other' NOT NULL,
	"wishlist_type" "wishlist_type" DEFAULT 'gear_queue' NOT NULL,
	"max_quantity_per_member" integer,
	"ticket_value" integer DEFAULT 1 NOT NULL,
	"image_url" text,
	"description_en" text,
	"description_th" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "penalty" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"reason" text,
	"issued_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "registration" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"quantity_requested" integer DEFAULT 1 NOT NULL,
	"gear_rating_snapshot" integer,
	"random_order" double precision,
	"carry_depth" integer DEFAULT 0 NOT NULL,
	"prior_rank" integer,
	"carried_from_id" uuid,
	"final_rank" integer,
	"status" "registration_status" DEFAULT 'pending' NOT NULL,
	"registered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"settled_at" timestamp with time zone,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "session" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "setting" (
	"key" text PRIMARY KEY NOT NULL,
	"value_en" text,
	"value_th" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"email" text,
	"email_verified" timestamp,
	"image" text,
	"role" "user_role" DEFAULT 'member' NOT NULL,
	"character_name" text,
	"in_game_id" text,
	"gear_rating" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_token" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verification_token_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allocation" ADD CONSTRAINT "allocation_event_item_id_event_item_id_fk" FOREIGN KEY ("event_item_id") REFERENCES "public"."event_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allocation" ADD CONSTRAINT "allocation_registration_id_registration_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."registration"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allocation" ADD CONSTRAINT "allocation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_item" ADD CONSTRAINT "event_item_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_item" ADD CONSTRAINT "event_item_item_id_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penalty" ADD CONSTRAINT "penalty_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penalty" ADD CONSTRAINT "penalty_issued_by_id_user_id_fk" FOREIGN KEY ("issued_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration" ADD CONSTRAINT "registration_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration" ADD CONSTRAINT "registration_item_id_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration" ADD CONSTRAINT "registration_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "allocation_registration_unique" ON "allocation" USING btree ("registration_id");--> statement-breakpoint
CREATE INDEX "allocation_event_item_idx" ON "allocation" USING btree ("event_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "event_item_unique" ON "event_item" USING btree ("event_id","item_id");--> statement-breakpoint
CREATE INDEX "event_item_event_idx" ON "event_item" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "item_name_en_unique" ON "item" USING btree ("name_en");--> statement-breakpoint
CREATE INDEX "penalty_user_idx" ON "penalty" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "penalty_window_idx" ON "penalty" USING btree ("ends_on");--> statement-breakpoint
CREATE UNIQUE INDEX "registration_unique" ON "registration" USING btree ("event_id","item_id","user_id");--> statement-breakpoint
CREATE INDEX "registration_round_idx" ON "registration" USING btree ("event_id","item_id");--> statement-breakpoint
CREATE INDEX "registration_user_idx" ON "registration" USING btree ("user_id");