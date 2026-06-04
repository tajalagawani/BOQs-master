CREATE TYPE "public"."px_user_role" AS ENUM('superadmin', 'director', 'user');--> statement-breakpoint
ALTER TABLE "px_user" ADD COLUMN "role" "px_user_role" DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "px_user" ADD COLUMN "ai_assistant_tester" boolean DEFAULT false NOT NULL;