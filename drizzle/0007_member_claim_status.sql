ALTER TYPE "registration_status" ADD VALUE IF NOT EXISTS 'auctioned';
--> statement-breakpoint
ALTER TYPE "allocation_status" ADD VALUE IF NOT EXISTS 'auctioned';
