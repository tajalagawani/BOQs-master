/**
 * ProcureX demo seed.
 *
 * Idempotent: gated by an entry in px_audit_log so re-runs no-op.
 * Seeds:
 *   - 6 projects in varied statuses
 *   - 3-4 tenderers per project (random companies pulled from a fixed list)
 *   - 1 tender document per project
 *   - Wires Arjun (super admin) as owner / project_member
 */
import "dotenv/config";
import { Pool } from "pg";
import crypto from "node:crypto";

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL_UNPOOLED required");
const pool = new Pool({ connectionString: url });

const ARJUN_EMAIL = "arjun.mehta@iox.local";

const projectTemplates = [
  { name: "Skyline Tower — Phase 2 Civils",        status: "configured" },
  { name: "Roshn Sedra District 3 — Substructure",  status: "analysing" },
  { name: "Diriyah Heritage Villas — MEP Package",  status: "review" },
  { name: "Trojena Cable Car Station — Tender Re-Bid", status: "draft" },
  { name: "Red Sea Resort Cluster 4 — Facade",      status: "reported" },
  { name: "KAFD Tower B — Vertical Transportation", status: "configured" },
];

const companyPool = [
  "L&T Construction",
  "El Seif Engineering",
  "Saudi Binladin Group",
  "Salini Impregilo",
  "Bouygues Bâtiment",
  "Drake & Scull",
  "Almabani General Contractors",
  "Nesma & Partners",
  "Saudi Pan Kingdom",
  "China Harbour Engineering",
];

function uuid(): string {
  return crypto.randomUUID();
}
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log("🌱 ProcureX seed");

  // Gate
  const gate = await pool.query(
    `SELECT 1 FROM px_audit_log WHERE action = 'procurex_seed_v1' LIMIT 1`,
  );
  if (gate.rowCount && gate.rowCount > 0) {
    console.log("   ✓ procurex_seed_v1 already applied — skipping");
    await pool.end();
    return;
  }

  // Locate Arjun + his workspace
  const arjunQ = await pool.query(
    `SELECT id FROM px_user WHERE email = $1`,
    [ARJUN_EMAIL],
  );
  if (arjunQ.rowCount === 0) throw new Error("Arjun not seeded; run sign-in once first");
  const arjunId = arjunQ.rows[0].id;

  const wsQ = await pool.query(
    `SELECT id FROM px_workspace WHERE created_by_user_id = $1 LIMIT 1`,
    [arjunId],
  );
  if (wsQ.rowCount === 0) throw new Error("No workspace for Arjun; sign in via /procurex/sign-in first");
  const workspaceId = wsQ.rows[0].id;
  console.log(`   workspace: ${workspaceId.slice(0, 8)}…`);

  // 1. Seed companies (if not already present)
  console.log("\n🏢 Companies");
  const companyIds: string[] = [];
  for (const name of companyPool) {
    const existing = await pool.query(
      `SELECT id FROM px_company WHERE workspace_id = $1 AND name = $2`,
      [workspaceId, name],
    );
    if (existing.rowCount && existing.rowCount > 0) {
      companyIds.push(existing.rows[0].id);
      continue;
    }
    const r = await pool.query(
      `INSERT INTO px_company (id, workspace_id, name, is_active, created_by_user_id, created_at, updated_at)
       VALUES ($1, $2, $3, true, $4, NOW(), NOW()) RETURNING id`,
      [uuid(), workspaceId, name, arjunId],
    );
    companyIds.push(r.rows[0].id);
  }
  console.log(`   ✓ ${companyIds.length} companies`);

  // 2. Seed projects
  console.log("\n📋 Projects");
  const projectIds: string[] = [];
  for (const t of projectTemplates) {
    const existing = await pool.query(
      `SELECT id FROM px_project WHERE workspace_id = $1 AND name = $2`,
      [workspaceId, t.name],
    );
    if (existing.rowCount && existing.rowCount > 0) {
      projectIds.push(existing.rows[0].id);
      continue;
    }
    const r = await pool.query(
      `INSERT INTO px_project (id, workspace_id, name, status, created_by_user_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '${Math.floor(Math.random() * 60) + 1} days', NOW())
       RETURNING id, name, status`,
      [uuid(), workspaceId, t.name, t.status, arjunId],
    );
    console.log(`   + ${r.rows[0].name} [${r.rows[0].status}]`);
    projectIds.push(r.rows[0].id);
  }

  // 3. Seed project_member entries (Arjun as owner of each)
  console.log("\n👤 Project members");
  let memCount = 0;
  for (const pid of projectIds) {
    await pool.query(
      `INSERT INTO px_project_member (project_id, user_id, role, joined_at)
       VALUES ($1, $2, 'owner', NOW())
       ON CONFLICT (project_id, user_id) DO NOTHING`,
      [pid, arjunId],
    ).catch(() => null);
    memCount++;
  }
  console.log(`   ✓ ${memCount} owner assignments`);

  // 4. Seed tenderers — 3 random companies per project
  console.log("\n🤝 Tenderers");
  let tenderCount = 0;
  for (const pid of projectIds) {
    const shuffled = [...companyIds].sort(() => Math.random() - 0.5).slice(0, 3);
    for (let i = 0; i < shuffled.length; i++) {
      const cid = shuffled[i];
      const code = `T${i + 1}`;
      const companyName = companyPool[companyIds.indexOf(cid)];
      const slugged = companyName.toLowerCase().replace(/[^a-z]+/g, ".").slice(0, 18);
      await pool.query(
        `INSERT INTO px_tenderer
         (id, project_id, company_id, code, contact_name, contact_email, status, qs_upload, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, false, true, NOW(), NOW())
         ON CONFLICT DO NOTHING`,
        [
          uuid(),
          pid,
          cid,
          code,
          `Estimating Team — ${companyName.split(" ")[0]}`,
          `estimating@${slugged}.example`,
          pick(["pending", "invited", "submitted"]),
        ],
      );
      tenderCount++;
    }
  }
  console.log(`   ✓ ${tenderCount} tenderers`);

  // 5. Seed one ITT document per project
  console.log("\n📄 Documents");
  let docCount = 0;
  for (const pid of projectIds) {
    await pool.query(
      `INSERT INTO px_document
       (id, workspace_id, target_kind, target_id, scope, category, filename, blob_pathname, version, status, created_at)
       VALUES ($1, $2, 'project', $3, 'project', 'itt', $4, $5, 1, 'uploaded', NOW())
       ON CONFLICT DO NOTHING`,
      [
        uuid(),
        workspaceId,
        pid,
        `ITT_Package_v1.pdf`,
        `seed/${pid}/itt.pdf`,
      ],
    ).catch(() => null);
    docCount++;
  }
  console.log(`   ✓ ${docCount} documents`);

  // 6. Mark seed done via audit_log entry
  await pool.query(
    `INSERT INTO px_audit_log (id, workspace_id, actor_user_id, actor_kind, action, target_kind, target_id, payload, created_at)
     VALUES ($1, $2, $3, 'user', 'procurex_seed_v1', 'workspace', $2, $4, NOW())`,
    [
      uuid(),
      workspaceId,
      arjunId,
      JSON.stringify({
        projects: projectIds.length,
        tenderers: tenderCount,
        documents: docCount,
        companies: companyIds.length,
      }),
    ],
  ).catch((e) => console.warn("   (audit log write failed — non-fatal)", e.message));

  console.log("\n✅ ProcureX seed complete");
  await pool.end();
}

main().catch((e) => {
  console.error("❌ Seed failed:", e);
  process.exit(1);
});
