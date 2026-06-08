// Seed the hardcoded @omniumint.com super-admins as credentials (email +
// password) accounts so they can sign in WITHOUT SSO. Idempotent:
//   - creates the account with the shared password if it does not exist;
//   - if it already exists, enforces role=superadmin and only sets the password
//     when none is set yet (COALESCE) so a user-changed password is preserved.
// Shared password: env SUPERADMIN_SEED_PASSWORD, else the default below.
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import pg from "pg";

const PASSWORD = process.env.SUPERADMIN_SEED_PASSWORD;
if (!PASSWORD) {
  console.error("SUPERADMIN_SEED_PASSWORD env var is required");
  process.exit(1);
}

const EMAILS = [
  "antonio.resurreccion@omniumint.com",
  "matthew.eastwood@omniumint.com",
  "jeffrey.zacarias@omniumint.com",
  "ruslan.leonte@omniumint.com",
  "dalton.issac@omniumint.com",
  "kshitija.narkhede@omniumint.com",
  "bryan.imperial@omniumint.com",
  "mary.ibanez@omniumint.com",
  "kevin.athukorala@omniumint.com",
  "sheena.rellorosa@omniumint.com",
  "nicky.dobreanu@omniumint.com",
  "robert.halley@omniumint.com",
];

const titleCase = (s) =>
  s.replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim();

let url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
  url = env.match(/^DATABASE_URL_UNPOOLED\s*=\s*"?([^"\n]+)"?/m)?.[1]
    || env.match(/^DATABASE_URL\s*=\s*"?([^"\n]+)"?/m)?.[1];
}
const needsTls = /sslmode=(require|verify)|\.postgres\.database\.azure\.com|\.neon\.tech/i.test(url);
const pool = new pg.Pool({
  connectionString: url,
  ssl: needsTls ? { rejectUnauthorized: false } : false,
});

const hash = bcrypt.hashSync(PASSWORD, 10);

for (const raw of EMAILS) {
  const email = raw.trim().toLowerCase();
  const name = titleCase(email.split("@")[0]);
  await pool.query(
    `INSERT INTO px_user (id, email, name, password_hash, role, email_verified)
     VALUES ($1,$2,$3,$4,'superadmin', now())
     ON CONFLICT (email) DO UPDATE
       SET role = 'superadmin',
           password_hash = COALESCE(px_user.password_hash, EXCLUDED.password_hash),
           email_verified = COALESCE(px_user.email_verified, now()),
           updated_at = now()`,
    [randomUUID(), email, name, hash],
  );
}

const { rows } = await pool.query(
  `SELECT email, role FROM px_user WHERE email = ANY($1) ORDER BY email`,
  [EMAILS.map((e) => e.trim().toLowerCase())],
);
console.log(`Seeded ${rows.length} super-admins (shared password: ${PASSWORD})`);
for (const r of rows) console.log(`  ${r.role.padEnd(10)} ${r.email}`);
await pool.end();
