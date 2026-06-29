CREATE TABLE IF NOT EXISTS "px_sso_org" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"allowed_email_domains" text[] DEFAULT '{}'::text[] NOT NULL,
	"default_role" "px_user_role" DEFAULT 'user' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "px_sso_org_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "px_sso_org" ADD CONSTRAINT "px_sso_org_created_by_px_user_id_fk"
		FOREIGN KEY ("created_by") REFERENCES "px_user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
-- Seed the IOX home tenant as the locked primary org (superadmin), so the org
-- can never lock itself out and existing iox SSO behaviour is preserved.
INSERT INTO "px_sso_org" ("id", "tenant_id", "name", "allowed_email_domains", "default_role", "enabled", "is_primary")
VALUES (
	'iox-primary',
	'5c1c05b1-7b56-45e5-b38e-c9aea88f4588',
	'IOX',
	ARRAY['iox-solutions.com','ioxsolutions2026.onmicrosoft.com']::text[],
	'superadmin',
	true,
	true
)
ON CONFLICT ("tenant_id") DO NOTHING;
