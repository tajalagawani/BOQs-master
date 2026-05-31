-- Idempotently create the platform_setting table consumed by the
-- /platform/settings UI. Run once on the production VM:
--
--   psql "$DATABASE_URL_UNPOOLED" -f web/prisma/migrations/manual/001_platform_setting.sql
--
-- This SQL lives outside the regular `prisma/migrations/` folder because
-- Prisma + Drizzle share the IOX database; running `prisma migrate dev`
-- would drop every px_* table that Drizzle owns. See ADR
-- docs/architecture/decisions/0001-prisma-drizzle-coexistence.md.

CREATE TABLE IF NOT EXISTS "platform_setting" (
  "key"       TEXT PRIMARY KEY,
  "value"     TEXT NOT NULL,
  "isSecret"  BOOLEAN NOT NULL DEFAULT false,
  "updatedBy" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
