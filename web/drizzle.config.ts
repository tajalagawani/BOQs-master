/**
 * Drizzle Kit config — IOX (ProcureX side).
 *
 * Coexists with Prisma. Same Postgres DB, Drizzle owns all tables
 * with the `px_` prefix; Prisma owns the rest. No collision possible.
 *
 * Uses DATABASE_URL_UNPOOLED if set (recommended for migrations), falls
 * back to DATABASE_URL.
 */
import { defineConfig } from "drizzle-kit";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "DATABASE_URL (or DATABASE_URL_UNPOOLED) is required for drizzle-kit.",
  );
}

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: { url },
  casing: "snake_case",
  verbose: true,
  strict: true,
});
