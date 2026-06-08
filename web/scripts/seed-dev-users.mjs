// Seed the px_user (Auth.js) dev login accounts so the sign-in page's
// quick-fill + credentials login work locally. Password for all = "dev".
// Idempotent (upsert by email). Roles exercise the new role model.
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import pg from "pg";

let url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
  url = env.match(/^DATABASE_URL_UNPOOLED\s*=\s*"?([^"\n]+)"?/m)?.[1]
    || env.match(/^DATABASE_URL\s*=\s*"?([^"\n]+)"?/m)?.[1];
}
// Local container = no TLS; managed Postgres (Azure / Neon) requires it.
const needsTls = /sslmode=(require|verify)|\.postgres\.database\.azure\.com|\.neon\.tech/i.test(url);
const pool = new pg.Pool({
  connectionString: url,
  ssl: needsTls ? { rejectUnauthorized: false } : false,
});
const hash = bcrypt.hashSync("dev", 10);

const users = [
  ["arjun.mehta@iox.local", "Arjun Mehta", "superadmin", "Super Admin"],
  ["layla.alsaud@iox.local", "Layla Al-Saud", "director", "Director"],
  ["khalid.alotaibi@iox.local", "Khalid Al-Otaibi", "director", "Director"],
  ["raj.patel@iox.local", "Raj Patel", "director", "Director"],
  ["nora.alfaisal@iox.local", "Nora Al-Faisal", "director", "Director"],
  ["maya.hernandez@iox.local", "Maya Hernandez", "user", "User"],
  ["sara.alkhalifa@iox.local", "Sara Al-Khalifa", "user", "User"],
  ["yusuf.alghamdi@iox.local", "Yusuf Al-Ghamdi", "user", "User"],
  ["aisha.alrashid@iox.local", "Aisha Al-Rashid", "user", "User"],
  ["daniel.park@iox.local", "Daniel Park", "user", "User"],
];

for (const [email, name, role, label] of users) {
  await pool.query(
    `INSERT INTO px_user (id, email, name, password_hash, role, is_dev_seed, dev_role_label, email_verified)
     VALUES ($1,$2,$3,$4,$5,true,$6, now())
     ON CONFLICT (email) DO UPDATE
       SET name = EXCLUDED.name,
           password_hash = EXCLUDED.password_hash,
           role = EXCLUDED.role,
           is_dev_seed = true,
           dev_role_label = EXCLUDED.dev_role_label,
           updated_at = now()`,
    [randomUUID(), email, name, hash, role, label],
  );
}
const { rows } = await pool.query(
  "SELECT role, count(*)::int FROM px_user WHERE is_dev_seed GROUP BY role ORDER BY role",
);
console.log("px_user dev accounts seeded (password: dev):");
for (const r of rows) console.log(`  ${r.role}: ${r.count}`);
await pool.end();
