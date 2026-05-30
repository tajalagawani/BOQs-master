/**
 * Prisma 7 configuration — points at the IOX schema and pulls the
 * datasource URL from web/.env via dotenv.
 *
 * The schema's datasource block no longer needs `url` in Prisma 7 —
 * it's injected here.
 */
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
