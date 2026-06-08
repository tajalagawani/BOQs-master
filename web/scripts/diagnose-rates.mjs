// Diagnose why the RatesX AI sees "no data": run the exact list_dimensions
// queries (each isolated) + key counts against DATABASE_URL, printing rows or
// the precise error per query. Read-only.
import { readFileSync } from "node:fs";
import pg from "pg";

let url = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED;
if (!url) {
  const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
  url = env.match(/^DATABASE_URL\s*=\s*"?([^"\n]+)"?/m)?.[1];
}
const needsTls = /sslmode=(require|verify)|\.postgres\.database\.azure\.com|\.neon\.tech/i.test(url || "");
const pool = new pg.Pool({ connectionString: url, ssl: needsTls ? { rejectUnauthorized: false } : false });

const q = async (label, sql) => {
  try {
    const r = await pool.query(sql);
    console.log(`OK   ${label}: ${r.rows.length} rows -> ${JSON.stringify(r.rows.slice(0, 4))}`);
  } catch (e) {
    console.log(`FAIL ${label}: ${e.message}`);
  }
};

await q("count rate_item", "SELECT count(*)::int n FROM rates_fact_rate_item");
await q("count benchmark", "SELECT count(*)::int n FROM rates_fact_project_benchmark");
await q("count dim_project", "SELECT count(*)::int n FROM rates_dim_project");
await q("rate_item w/ currency", "SELECT count(*)::int n FROM rates_fact_rate_item WHERE currency_id IS NOT NULL");
await q("project w/ country", "SELECT count(*)::int n FROM rates_dim_project WHERE country_id IS NOT NULL");
// The 6 list_dimensions queries, isolated:
await q("LD elements", "SELECT DISTINCT n.label FROM rates_fact_project_benchmark b JOIN rates_dim_nrm_l1 n ON n.id=b.nrm_l1_id ORDER BY 1");
await q("LD asset_classes", "SELECT DISTINCT ac.label FROM rates_dim_project p JOIN rates_dim_asset_class ac ON ac.id=p.asset_class_id WHERE p.asset_class_id IS NOT NULL ORDER BY 1");
await q("LD asset_types", "SELECT DISTINCT at.label FROM rates_dim_project p JOIN rates_dim_asset_type at ON at.id=p.asset_type_id WHERE p.asset_type_id IS NOT NULL ORDER BY 1");
await q("LD countries", "SELECT DISTINCT c.name FROM rates_dim_project p JOIN rates_dim_country c ON c.id=p.country_id WHERE p.country_id IS NOT NULL ORDER BY 1");
await q("LD currencies", "SELECT cur.iso4217 iso, count(*)::int n FROM rates_fact_rate_item ri JOIN rates_dim_currency cur ON cur.id=ri.currency_id GROUP BY 1 ORDER BY 2 DESC");
await q("LD years", "SELECT EXTRACT(YEAR FROM min(base_date))::int min, EXTRACT(YEAR FROM max(base_date))::int max FROM rates_dim_project WHERE base_date IS NOT NULL");
await pool.end();
