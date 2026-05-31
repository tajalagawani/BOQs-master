import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"

import { env } from "./env"

/**
 * Single drizzle client backed by `pg` (node-postgres).
 *
 * Works against both local Postgres (`postgres://localhost/...`) and
 * Neon's standard postgres-protocol endpoint (the `*.neon.tech` URLs).
 * Set `DATABASE_URL` accordingly in `.env.local`.
 *
 * (The `@neondatabase/serverless` HTTP driver is no longer used here —
 * it triggered webpack bundling issues on App Router. The standard
 * `pg` Pool talks to Neon over plain TCP+TLS via the same DATABASE_URL.)
 */
const url = env.DATABASE_URL
const needsTls = url.includes("sslmode=") || /\.neon\.tech\b/i.test(url)

const pool = new Pool({
  connectionString: url,
  ssl: needsTls ? { rejectUnauthorized: false } : false,
})

export const db = drizzle({ client: pool })
export type Db = typeof db
