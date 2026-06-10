// Seed the starter expert rules for the RatesX AI, drawn from the trial
// feedback. Idempotent: only seeds when the table is empty, so it never
// duplicates or clobbers rules the team has added/edited.
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import pg from "pg";

const RULES = [
  ["Area basis", "Area basis", "Always state the area basis (GIA/GFA/BUA) in every building rate; default to GIA when unspecified and say so. Never quote a building rate per m² of land/plot area."],
  ["Contingency by stage", "Allowances", "Design contingency ≈ 10% at concept design, ~5% at schematic, tapering to 0% by DD/IFC. Give a range and name the stage."],
  ["Prelims method", "Allowances", "Prelims % = prelims cost ÷ net cost of measured works (excluding prelims). Typical 8–15% depending on project type and duration."],
  ["Relative pricing", "Materials", "Curved/circular formwork costs more than flat; intumescent fire protection costs more than cementitious; imported marble/granite costs more than porcelain tiles."],
  ["Tier materials", "Materials", "Branded/luxury residential typically uses marble/granite/quartz finishes, not just porcelain — include these when 'branded' or 'luxury' is specified."],
  ["M&E band (residential)", "Benchmarks", "M&E for residential typically runs AED 1,400–1,800/m² GIA. If the library returns much lower, flag it as possibly shell-and-core only rather than fully fitted."],
  ["Recency", "Recency", "Library data runs through 2024. For 'latest'/2025/2026, say so and offer an escalation factor; the library has no live market events — say so honestly."],
  ["Methodology", "Methodology", "When asked how a figure is calculated, show the source lines (evidence) and report median + q1–q3 range + sample size; flag samples below ~5 projects as low-confidence."],
];

let url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
  url = env.match(/^DATABASE_URL_UNPOOLED\s*=\s*"?([^"\n]+)"?/m)?.[1]
    || env.match(/^DATABASE_URL\s*=\s*"?([^"\n]+)"?/m)?.[1];
}
const needsTls = /sslmode=(require|verify)|\.postgres\.database\.azure\.com|\.neon\.tech/i.test(url);
const pool = new pg.Pool({ connectionString: url, ssl: needsTls ? { rejectUnauthorized: false } : false });

const { rows } = await pool.query("SELECT count(*)::int n FROM px_rates_ai_rule");
if (rows[0].n > 0) {
  console.log(`px_rates_ai_rule already has ${rows[0].n} rules — skipping seed.`);
} else {
  for (const [title, category, body] of RULES) {
    await pool.query(
      `INSERT INTO px_rates_ai_rule (id, title, body, category, enabled, created_by_email) VALUES ($1,$2,$3,$4,true,$5)`,
      [randomUUID(), title, body, category, "starter@iox-1.dev"],
    );
  }
  console.log(`Seeded ${RULES.length} starter AI rules.`);
}
await pool.end();
