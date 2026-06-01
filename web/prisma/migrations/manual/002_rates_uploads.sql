-- RatesX uploads. One row per (section, tab) snapshot, stored as JSONB.
-- Idempotent so the production VM can re-run it safely after a deploy.
--
-- Run on the VM:
--   psql "$DATABASE_URL_UNPOOLED" -f web/prisma/migrations/manual/002_rates_uploads.sql
--
-- This SQL lives outside prisma/migrations/ for the same reason as
-- 001_platform_setting.sql — `prisma migrate dev` would drop Drizzle's
-- px_* tables. See ADR docs/architecture/decisions/0001-prisma-drizzle-coexistence.md.

CREATE TABLE IF NOT EXISTS "rates_uploads" (
  "id"            TEXT PRIMARY KEY,
  "section"       TEXT NOT NULL,
  "tab"           TEXT NOT NULL,
  "name"          TEXT NOT NULL,
  "size"          BIGINT NOT NULL,
  "rowCount"      INTEGER NOT NULL,
  "sheetName"     TEXT,
  "rows"          JSONB NOT NULL,
  "extraColumns"  JSONB NOT NULL DEFAULT '[]'::jsonb,
  "uploadedById"  TEXT,
  "uploadedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "rates_uploads_section_tab_key"
  ON "rates_uploads" ("section", "tab");
CREATE INDEX IF NOT EXISTS "rates_uploads_section_idx"
  ON "rates_uploads" ("section");

DO $$ BEGIN
  ALTER TABLE "rates_uploads"
    ADD CONSTRAINT "rates_uploads_uploadedById_fkey"
    FOREIGN KEY ("uploadedById") REFERENCES "users" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
