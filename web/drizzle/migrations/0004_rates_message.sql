CREATE TABLE IF NOT EXISTS "px_rates_message" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"user_email" text,
	"question" text,
	"answer" text,
	"tokens_in" integer DEFAULT 0 NOT NULL,
	"tokens_out" integer DEFAULT 0 NOT NULL,
	"tool_calls" jsonb,
	"tool_count" integer DEFAULT 0 NOT NULL,
	"latency_ms" integer DEFAULT 0 NOT NULL,
	"error" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "px_rates_feedback" ADD COLUMN IF NOT EXISTS "message_id" text;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "px_rates_message" ADD CONSTRAINT "px_rates_message_user_id_px_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "px_user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "px_rates_feedback" ADD CONSTRAINT "px_rates_feedback_message_id_px_rates_message_id_fk" FOREIGN KEY ("message_id") REFERENCES "px_rates_message"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
