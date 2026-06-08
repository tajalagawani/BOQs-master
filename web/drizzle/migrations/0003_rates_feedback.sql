CREATE TABLE IF NOT EXISTS "px_rates_feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"user_email" text,
	"vote" text NOT NULL,
	"reason" text,
	"question" text,
	"answer" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "px_rates_feedback" ADD CONSTRAINT "px_rates_feedback_user_id_px_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "px_user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
