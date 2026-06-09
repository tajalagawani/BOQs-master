// Seed the credentials (email + password) accounts, no SSO needed:
//   - taj@iox-1.dev          → superadmin (full access, reviews feedback)
//   - the 12 @omniumint.com  → role=user + aiAssistantTester (assistant ONLY;
//                              the proxy confines them to /rates/assistant)
// Shared password from env SUPERADMIN_SEED_PASSWORD. Idempotent. Role,
// capability and password are force-set so the accounts always match this
// definition (these are managed test accounts, not self-service users).
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import pg from "pg";

const PASSWORD = process.env.SUPERADMIN_SEED_PASSWORD;
if (!PASSWORD) {
  console.error("SUPERADMIN_SEED_PASSWORD env var is required");
  process.exit(1);
}

const SUPERADMINS = ["taj@iox-1.dev"];

const ASSISTANT_ONLY = [
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
  "ross.kelly@omniumint.com",
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

async function upsert(rawEmail, role, aiTester) {
  const email = rawEmail.trim().toLowerCase();
  const name = titleCase(email.split("@")[0]);
  await pool.query(
    // Role + capability are always enforced, but the password is only set when
    // none exists yet — so a deploy never clobbers a password a user changed.
    `INSERT INTO px_user (id, email, name, password_hash, role, ai_assistant_tester, email_verified)
     VALUES ($1,$2,$3,$4,$5,$6, now())
     ON CONFLICT (email) DO UPDATE
       SET role = EXCLUDED.role,
           ai_assistant_tester = EXCLUDED.ai_assistant_tester,
           password_hash = COALESCE(px_user.password_hash, EXCLUDED.password_hash),
           email_verified = COALESCE(px_user.email_verified, now()),
           updated_at = now()`,
    [randomUUID(), email, name, hash, role, aiTester],
  );
}

for (const e of SUPERADMINS) await upsert(e, "superadmin", false);
for (const e of ASSISTANT_ONLY) await upsert(e, "user", true);

const { rows } = await pool.query(
  `SELECT email, role, ai_assistant_tester
   FROM px_user
   WHERE email = ANY($1)
   ORDER BY role DESC, email`,
  [[...SUPERADMINS, ...ASSISTANT_ONLY].map((e) => e.trim().toLowerCase())],
);
console.log(`Seeded ${rows.length} accounts (shared password: ${PASSWORD})`);
for (const r of rows) {
  console.log(`  ${r.role.padEnd(10)} ai=${r.ai_assistant_tester ? "Y" : "N"}  ${r.email}`);
}
await pool.end();
