// One-off: add the role + ai_assistant_tester columns to px_user using the same
// pg connection the app uses. Idempotent. Delete after running.
import { readFileSync } from "node:fs";
import pg from "pg";

// Prefer the live shell's DATABASE_URL (it carries the password the running app
// uses); fall back to the value in .env.
let connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  const envFile = readFileSync(new URL("../.env", import.meta.url), "utf8");
  const m = envFile.match(/^DATABASE_URL\s*=\s*"?([^"\n]+)"?/m);
  if (!m) throw new Error("DATABASE_URL not found in env or .env");
  connectionString = m[1];
}

const pool = new pg.Pool({ connectionString, ssl: false });
const sql = `
DO $$ BEGIN
  CREATE TYPE px_user_role AS ENUM ('superadmin','director','user');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
ALTER TABLE px_user ADD COLUMN IF NOT EXISTS role px_user_role NOT NULL DEFAULT 'user';
ALTER TABLE px_user ADD COLUMN IF NOT EXISTS ai_assistant_tester boolean NOT NULL DEFAULT false;
`;
await pool.query(sql);
const { rows } = await pool.query(
  "select column_name from information_schema.columns where table_name='px_user' and column_name in ('role','ai_assistant_tester') order by column_name",
);
console.log("OK — px_user now has:", rows.map((r) => r.column_name).join(", "));
await pool.end();
