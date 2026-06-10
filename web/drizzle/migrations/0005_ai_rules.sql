CREATE TABLE IF NOT EXISTS "px_rates_ai_rule" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"category" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_by" text,
	"created_by_email" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "px_rates_ai_rule" ADD CONSTRAINT "px_rates_ai_rule_created_by_px_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "px_user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
