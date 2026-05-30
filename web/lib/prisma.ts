/**
 * Prisma 7 client singleton with the pg driver adapter.
 *
 * Prisma 7 split the engine into a driver-adapter model — the JS
 * client constructor requires either a driver adapter (`PrismaPg`,
 * `PrismaNeon`, etc.) or `accelerateUrl`. We use `@prisma/adapter-pg`
 * for local Postgres.
 *
 * Singleton pattern: stash on globalThis so Next.js dev reloads reuse
 * the same instance and don't exhaust the connection pool.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function makeClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add it to web/.env (postgresql://…/iox).",
    );
  }
  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });
}

export const prisma: PrismaClient = globalThis.__prisma ?? makeClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}
