#!/usr/bin/env node
/**
 * Build BACKLOG.md + backlog.xlsx from the 24 KPI sub-components defined in
 * Schedule 1 Appendix A. Status / "What we have" / "What's missing" reflect
 * IOX's actual state today (May 31 2026).
 *
 * Run: node scripts/build-backlog.mjs
 * Outputs (written to repo root): BACKLOG.md, backlog.xlsx
 */
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
// `xlsx` is installed inside web/node_modules — point at it directly
const xlsx = require("../web/node_modules/xlsx");

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ────────────────────────────────────────────────────────────────────────────
// Data
// ────────────────────────────────────────────────────────────────────────────

/** @typedef {"Done"|"Strong"|"Partial"|"Weak"|"Not Started"} Status */

const ROWS = [
  // 1. Foundation & Security ─────────────────────────────────────────────────
  {
    ref: 1, component: "Foundation & Security", kpi: "C1-SC1",
    subComponent: "Cloud environment provisioning", phase: "Phase 1",
    deliverable: "Agreed core environments established",
    measurement: "Count of agreed environments provisioned and accessible",
    target: "100% of agreed Dev, Test and Production environments live",
    signOff: "Environment inventory, cloud console evidence, architecture diagram",
    status: "Partial",
    weHave: "Dev VM `iox-vm-01` live in Azure UAE North (D2s_v3, public IP 20.203.125.83). Resource group iox-rg tagged app=IOX-OS. Public IP+NSG+VNet+OS disk all provisioned.",
    missing: "Separate Test environment not yet stood up. Architecture diagram not produced. Environment inventory not formalised.",
  },
  {
    ref: 1, component: "Foundation & Security", kpi: "C1-SC2",
    subComponent: "Infrastructure as Code", phase: "Phase 1",
    deliverable: "IaC deployment baseline implemented",
    measurement: "Percentage of core environments deployed through approved IaC scripts",
    target: "100% of core environments deployable through IaC",
    signOff: "IaC repository, deployment logs, version-controlled templates",
    status: "Partial",
    weHave: "`scripts/azure-bootstrap.sh` (idempotent post-provision setup), committed in repo, re-runnable. NSG and VM created via documented `az` CLI commands.",
    missing: "No declarative IaC (Terraform/Bicep/ARM). Bash bootstrap is procedural. VM-creation steps live in chat history, not in a versioned template.",
  },
  {
    ref: 1, component: "Foundation & Security", kpi: "C1-SC3",
    subComponent: "Identity and access management", phase: "Phase 1",
    deliverable: "Role-based access model configured",
    measurement: "Ability to apply user roles and permission configurations",
    target: "At least 2 distinct roles created and implemented across application services",
    signOff: "Access control matrix, user access test record, security configuration evidence",
    status: "Partial",
    weHave: "NextAuth v5 + Drizzle adapter wired at `/api/auth/[...nextauth]`. UserRole enum: ADMIN, DEVELOPMENT_MANAGER, VIEWER + SUPER_ADMIN label. Per-module permission helpers (`canAccessProject`, `canAccessMasterplan`, etc.). Mock IOX session honours roles.",
    missing: "Only one seeded user (Arjun, SUPER_ADMIN). No 2nd distinct role actively in use. Access control matrix not documented. Security config evidence not exported.",
  },
  {
    ref: 1, component: "Foundation & Security", kpi: "C1-SC4",
    subComponent: "Data protection controls", phase: "Phase 1",
    deliverable: "Encryption controls implemented",
    measurement: "Percentage of in-scope environments and services with encryption enabled",
    target: "100% encryption at rest and in transit for in-scope services",
    signOff: "Security settings export, configuration evidence, compliance checklist",
    status: "Partial",
    weHave: "Azure Premium SSD = encryption at rest by default (platform-managed key). Postgres connection on localhost (no transport needed). Anthropic API calls go over HTTPS. .env permissions 600 on VM. HTTPS template + procedure ready at docs/operations/https-setup.md.",
    missing: "DEFERRED (PO): public HTTP traffic served on port 80 — no TLS until a domain is assigned. Revisit at production launch.",
  },
  {
    ref: 1, component: "Foundation & Security", kpi: "C1-SC5",
    subComponent: "Security assurance", phase: "Phase 3",
    deliverable: "Independent security validation completed",
    measurement: "Number of unresolved critical vulnerabilities at milestone sign-off",
    target: "0 critical vulnerabilities outstanding",
    signOff: "Penetration test report, remediation log, assessor confirmation",
    status: "Not Started",
    weHave: "Nothing yet.",
    missing: "Pen test not commissioned. Vulnerability scan not run. Remediation log doesn't exist.",
  },

  // 2. Data & Architecture ──────────────────────────────────────────────────
  {
    ref: 2, component: "Data & Architecture", kpi: "C2-SC1",
    subComponent: "Target architecture definition", phase: "Phase 1",
    deliverable: "Core architecture defined and approved",
    measurement: "Completion of logical and physical architecture pack",
    target: "Approved architecture pack issued",
    signOff: "Architecture diagrams, architecture decision record, approval note",
    status: "Partial",
    weHave: "Inline architectural docs (CLAUDE.md, BACKEND.md, PROJECT.md, UI.md, modules/*/README implied by file tree). Schema definitions are self-documenting. ProcureX migration plan captured in chat.",
    missing: "No single 'architecture pack' artefact. No ADRs (Architecture Decision Records). No formal approval note.",
  },
  {
    ref: 2, component: "Data & Architecture", kpi: "C2-SC2",
    subComponent: "Shared data model", phase: "Phase 2",
    deliverable: "Data model defined and deployed",
    measurement: "Core shared data entities/models designed and implemented",
    target: "Core shared data models deployed",
    signOff: "Shared data schema being used by multiple applications",
    status: "Strong",
    weHave: "One Postgres database, two ORMs: Prisma owns 17 tables (User, Masterplan, BoqRun, Configuration, …) used by CostX + BOQs + summary screens; Drizzle owns 48 `px_*` tables used by ProcureX. Users referenced across modules. ConfigModelEntry consumed by 5+ pages.",
    missing: "Formal 'shared data schema' diagram. Documentation of which app uses which entity.",
  },
  {
    ref: 2, component: "Data & Architecture", kpi: "C2-SC3",
    subComponent: "Data access and retrieval", phase: "Phase 2",
    deliverable: "Query and retrieval of data in shared and application data models",
    measurement: "Key queries to be defined to showcase successful access to data models",
    target: "Test queries to return expected results showing (if appropriate) test data",
    signOff: "Test scripts, test execution report, sample output validation",
    status: "Partial",
    weHave: "Live working queries across both ORMs: getMasterplans, getBenchmarkProjects, getCostModelEntries, getCategoryStatuses, etc. Demo data seeded (28 masterplans, 22 benchmarks, 6 procurex projects, 18 tenderers, 960 cost model entries). Each route smoke-tested HTTP 200.",
    missing: "No formal automated test suite (Vitest/Jest). No execution report. Smoke tests are ad-hoc curl, not codified.",
  },
  {
    ref: 2, component: "Data & Architecture", kpi: "C2-SC4",
    subComponent: "Modular service design", phase: "Phase 2",
    deliverable: "Services separable from other application services",
    measurement: "Showcase that modules are deployable independently",
    target: "100% of launch modules independently deployable",
    signOff: "Module deployment evidence, dependency map, architecture review",
    status: "Weak",
    weHave: "Logical modularity: code organised into `app/{costx,boqs,procurex,benchmarking,...}` route groups and `modules/{identity,workspace,procurex,…}` domain folders. Each module is self-contained per the faithful-port rule.",
    missing: "Physical modularity is monolithic — all modules deploy as one Next.js process. No independent service builds. No dependency map.",
  },

  // 3. Integration Capability ────────────────────────────────────────────────
  {
    ref: 3, component: "Integration Capability", kpi: "C3-SC1",
    subComponent: "API and integration design", phase: "Phase 1",
    deliverable: "Integration architecture and API specification completed",
    measurement: "Completion of API and interface capability",
    target: "API configuration documented",
    signOff: "API specification pack, integration architecture document, approval record",
    status: "Partial",
    weHave: "API surface exists: `app/api/*`, `app/procurex/api/*`, server actions in `modules/*/actions.ts`. Routes auto-documented by Next.js file-system convention.",
    missing: "No OpenAPI/Swagger spec generated. No integration architecture document. No approval record.",
  },
  {
    ref: 3, component: "Integration Capability", kpi: "C3-SC2",
    subComponent: "API gateway implementation", phase: "Phase 2",
    deliverable: "Secure API gateway deployed",
    measurement: "Gateway operational status against agreed design",
    target: "API gateway live with agreed security controls active",
    signOff: "Gateway configuration evidence, deployment record, security checklist",
    status: "Partial",
    weHave: "Nginx reverse proxy live in front of Next.js on the VM. Proxies all traffic, sets large body limits (1024M for tender uploads), keeps-alive long extraction reads.",
    missing: "Nginx is a reverse proxy, not a full API gateway. No rate limiting, no per-endpoint auth, no centralised request logging, no quota/throttling. Should adopt Azure API Management or similar for production.",
  },
  {
    ref: 3, component: "Integration Capability", kpi: "C3-SC3",
    subComponent: "System-to-system connectivity", phase: "Phase 2",
    deliverable: "Application service integration test cases executed",
    measurement: "All integration test cases passed",
    target: "100% pass rate on defined integration tests",
    signOff: "Integration test report, test logs, transaction evidence",
    status: "Not Started",
    weHave: "Ad-hoc smoke tests run during deploys (curl /procurex, /costx, etc.). All routes verified 200 manually.",
    missing: "No integration test framework wired. No test cases defined. No CI test job (CI currently only builds + deploys).",
  },
  {
    ref: 3, component: "Integration Capability", kpi: "C3-SC4",
    subComponent: "Bidirectional data exchange", phase: "Phase 3",
    deliverable: "End-to-end application service data exchange proven",
    measurement: "Number of successful bidirectional transactions completed",
    target: "Minimum agreed set of test transactions completed successfully",
    signOff: "Transaction logs, sample records, demonstration output",
    status: "Partial",
    weHave: "Anthropic API integration is fully bidirectional — request → agent loop → submit_verdict tool call → schema validation → persist. Verified end-to-end with a real FoT PDF (4 pages, 2401 in / 1244 out tokens). Workflow run output stored in px_workflow_run.",
    missing: "Other 3rd-party 2-way integrations (e.g. ERP push, Vercel Blob fully wired) not yet defined. No formal 'set of test transactions' documented.",
  },
  {
    ref: 3, component: "Integration Capability", kpi: "C3-SC5",
    subComponent: "Integration readiness for applications", phase: "Phase 3",
    deliverable: "Integration capabilty for third party application",
    measurement: "At least one application service ready to integrate with a third party application",
    target: "Documented integration instructions",
    signOff: "Integration instructions, assessor confirmation",
    status: "Strong",
    weHave: "Anthropic SDK fully wired (`@anthropic-ai/sdk` direct provider). Vercel Blob optional wiring present (`@vercel/blob` installed; falls back to local disk when no token). NextAuth supports OAuth providers (just need to enable Google/MS).",
    missing: "Integration instructions document for a hypothetical 3rd-party app not yet written. Assessor confirmation not pursued.",
  },

  // 4. Operational Readiness ────────────────────────────────────────────────
  {
    ref: 4, component: "Operational Readiness", kpi: "C4-SC1",
    subComponent: "Delivery governance", phase: "Phase 1",
    deliverable: "Platform delivery governance documented",
    measurement: "Completion of agreed governance artefacts",
    target: "100% of agreed governance artefacts completed",
    signOff: "Governance playbook, RACI, operating model summary",
    status: "Partial",
    weHave: "CLAUDE.md (PUB project architectural invariants, kept as a navigation layer). Git history is full and meaningful. Long-form chat transcript captures decisions. Memory file `feedback_faithful_port.md` codifies the do-not-simplify rule.",
    missing: "No RACI matrix. No formal governance playbook. No operating model summary.",
  },
  {
    ref: 4, component: "Operational Readiness", kpi: "C4-SC2",
    subComponent: "Release management", phase: "Phase 1",
    deliverable: "Release process documented and adopted",
    measurement: "Completion of formal release management process",
    target: "Approved release process in place",
    signOff: "Release procedure, approval record, document register",
    status: "Partial",
    weHave: "De-facto release process: push to main → GitHub Actions builds + rsyncs + pm2 reload → live in ~3 min. Workflow file `.github/workflows/deploy.yml` is the procedure-as-code. README in `.github/workflows/`.",
    missing: "No human-readable release procedure document. No approval record per release. No formal document register.",
  },
  {
    ref: 4, component: "Operational Readiness", kpi: "C4-SC3",
    subComponent: "CI/CD enablement", phase: "Phase 2",
    deliverable: "Automated deployment pipeline operational",
    measurement: "Percentage of agreed environments supported by CI/CD pipeline",
    target: "100% of agreed environments supported",
    signOff: "CI/CD workflow evidence, pipeline screenshots, deployment logs",
    status: "Strong",
    weHave: "GitHub Actions workflow `deploy.yml` triggers on push to main (paths: web/**). Builds on GH runner, rsyncs to Azure VM, applies new Drizzle migrations idempotently, reloads pm2, smoke-tests public IP. ~3 min end-to-end. Last successful run #26712395245.",
    missing: "Test environment not yet covered by CI/CD (Dev/Prod-like only). Rollback not automated.",
  },
  {
    ref: 4, component: "Operational Readiness", kpi: "C4-SC4",
    subComponent: "Change and prioritisation control", phase: "Phase 1",
    deliverable: "Backlog and change control process active",
    measurement: "Completion and adoption of prioritisation and change control framework",
    target: "Approved and in active use",
    signOff: "Backlog process document, change log, governance minutes",
    status: "Partial",
    weHave: "BACKLOG.md (this file). Git commit history is the change log. Chat transcript captures prioritisation decisions in real time.",
    missing: "No formal backlog process document. No governance minutes. GitHub Issues / Projects not configured.",
  },
  {
    ref: 4, component: "Operational Readiness", kpi: "C4-SC5",
    subComponent: "Operational usability and support", phase: "Phase 3",
    deliverable: "Platform and core modules usable with support ownership defined",
    measurement: "Completion of user readiness and support model",
    target: "Named support ownership active and agreed core modules usable by IOX personnel",
    signOff: "Support model, user walkthroughs, acceptance record",
    status: "Partial",
    weHave: "All core modules render + work end-to-end (CostX, BOQs, ProcureX, Projects, Benchmarking, Configuration, Rate Analysis). Sign-in works. Demo data populated. Tag `app=IOX-OS` on all Azure resources.",
    missing: "No documented support model. No user walkthroughs / training material. No formal user acceptance record from IOX personnel.",
  },

  // 5. Platform Launch / First Live Service ──────────────────────────────────
  {
    ref: 5, component: "Platform Launch / First Live Service", kpi: "C5-SC1",
    subComponent: "Production monitoring", phase: "Phase 3",
    deliverable: "Monitoring and alerting active",
    measurement: "Percentage of agreed production monitoring controls enabled",
    target: "100% of agreed monitoring controls active",
    signOff: "Monitoring dashboard, alert configuration, operations checklist",
    status: "Weak",
    weHave: "pm2 status + pm2 logs (per-process), nginx access/error logs, Postgres logs locally. Activity log table tracks user actions across modules.",
    missing: "No external monitoring (Azure Monitor / Datadog / Sentry). No alerting on crashes / 5xx spikes / queue backups / disk-full. No operations checklist.",
  },
  {
    ref: 5, component: "Platform Launch / First Live Service", kpi: "C5-SC2",
    subComponent: "Performance validation", phase: "Phase 3",
    deliverable: "Load and performance tests available",
    measurement: "Agreed performance measures available",
    target: "100% of agreed performance metrics generated",
    signOff: "Load test report, performance test output, assessor review",
    status: "Not Started",
    weHave: "Nothing.",
    missing: "No load testing (k6 / Artillery / JMeter). No baseline RPS / latency / error rate captured. No assessor review.",
  },
  {
    ref: 5, component: "Platform Launch / First Live Service", kpi: "C5-SC3",
    subComponent: "Production deployment", phase: "Phase 3",
    deliverable: "First live service deployed",
    measurement: "Count of live services/modules successfully deployed to production",
    target: "Minimum 1 live service/module deployed",
    signOff: "Production deployment record, release evidence, go-live approval",
    status: "Strong",
    weHave: "IOX live at http://20.203.125.83 serving 5+ modules: CostX (masterplan list/editor/summary), BOQs (run dashboard), ProcureX (project + tender wizard), Projects, Benchmarking, Configuration, Rate Analysis. All HTTP 200. CI/CD redeploys on every push.",
    missing: "Formal production deployment record (release notes per deploy). No go-live approval signed.",
  },
  {
    ref: 5, component: "Platform Launch / First Live Service", kpi: "C5-SC4",
    subComponent: "Production quality assurance", phase: "Phase 3",
    deliverable: "Critical live defects resolved",
    measurement: "Number of unresolved critical production defects at sign-off",
    target: "0 critical production defects outstanding",
    signOff: "Defect log, remediation record, production readiness report",
    status: "Partial",
    weHave: "Defects found in chat have been fixed live: BOQ loader getCell(0) crash, AUTH_TRUST_HOST missing, HeroUI Pro postinstall, NextAuth cookie stale, FoT extraction with empty docs/. Each fix committed.",
    missing: "No formal defect log (severity / status / age tracking). No production readiness report.",
  },
  {
    ref: 5, component: "Platform Launch / First Live Service", kpi: "C5-SC5",
    subComponent: "Live operational readiness", phase: "Phase 3",
    deliverable: "Live service stable and usable in practice",
    measurement: "Completion of agreed live readiness checks and user validation",
    target: "Production environment stable for at least a week and agreed live module usable by Omnium personnel",
    signOff: "Uptime report, user validation record, go-live sign-off",
    status: "Weak",
    weHave: "App live since today (May 31 2026), no observed crashes since the cookie/heroui fixes. pm2 restart counter at 0.",
    missing: "Not yet stable for 1 week (just deployed). No uptime report. No user validation record from Omnium. No go-live sign-off.",
  },
];

// Status colour for the MD file (works in GitHub-flavoured MD)
const STATUS_ORDER = ["Strong", "Done", "Partial", "Weak", "Not Started"];
const STATUS_ICON = {
  Done: "🟢",
  Strong: "🟢",
  Partial: "🟡",
  Weak: "🟠",
  "Not Started": "🔴",
};

// ────────────────────────────────────────────────────────────────────────────
// MD output
// ────────────────────────────────────────────────────────────────────────────

const byComponent = {};
for (const r of ROWS) {
  byComponent[r.component] ??= [];
  byComponent[r.component].push(r);
}

const totals = ROWS.reduce(
  (a, r) => {
    a[r.status] = (a[r.status] ?? 0) + 1;
    return a;
  },
  /** @type {Record<Status, number>} */ ({}),
);

let md = `# IOX — Schedule 1 Appendix A: KPI Backlog & Tracking

> Source of truth: \`Schedule 1_Appendix A (KPI Breakdown).pdf\`. Each of the
> **24 sub-components** below is mapped to IOX's actual state on **${new Date().toISOString().slice(0, 10)}**.
> Re-generate this file: \`node scripts/build-backlog.mjs\`

## Status summary

| Status | Count | What it means |
|---|---|---|
| 🟢 Strong / Done | ${(totals.Strong ?? 0) + (totals.Done ?? 0)} | KPI substantively met today. May need formal sign-off artefacts. |
| 🟡 Partial | ${totals.Partial ?? 0} | Working substance exists but formal deliverable / evidence is missing. |
| 🟠 Weak | ${totals.Weak ?? 0} | Minimal coverage — would not satisfy an assessor. |
| 🔴 Not Started | ${totals["Not Started"] ?? 0} | No work begun. |
| **Total** | **${ROWS.length}** | |

---

`;

for (const [component, rows] of Object.entries(byComponent)) {
  md += `## ${rows[0].ref}. ${component}\n\n`;
  for (const r of rows) {
    md += `### ${STATUS_ICON[r.status]} ${r.kpi} — ${r.subComponent}  *(${r.phase})*\n\n`;
    md += `**Deliverable:** ${r.deliverable}  \n`;
    md += `**How it's measured:** ${r.measurement}  \n`;
    md += `**Target:** ${r.target}  \n`;
    md += `**Sign-off evidence required:** ${r.signOff}\n\n`;
    md += `| | |\n|---|---|\n`;
    md += `| **Status** | **${r.status}** |\n`;
    md += `| **What we have** | ${r.weHave} |\n`;
    md += `| **What's missing** | ${r.missing} |\n\n`;
  }
}

md += `---\n\n## Component level-of-effort (from the PDF)\n\n`;
md += `| Ref | Component | % LoE |\n|---|---|---:|\n`;
md += `| 1 | Foundation & Security | 10% |\n`;
md += `| 2 | Data & Architecture | 45% |\n`;
md += `| 3 | Integration Capability | 25% |\n`;
md += `| 4 | Operational Readiness | 10% |\n`;
md += `| 5 | Platform Launch / First Live Service | 10% |\n`;
md += `| **Total** | | **100%** |\n\n`;

md += `## Equity release per phase\n\n`;
md += `| Phase | % LoE |\n|---|---:|\n| Phase 1 | 5% |\n| Phase 2 | 10% |\n| Phase 3 | 5% |\n| **Total** | **20%** |\n`;

writeFileSync(resolve(ROOT, "BACKLOG.md"), md);
console.log(`✓ Wrote ${resolve(ROOT, "BACKLOG.md")} (${md.length} bytes)`);

// ────────────────────────────────────────────────────────────────────────────
// XLSX output (without qty / percentage columns per request)
// ────────────────────────────────────────────────────────────────────────────

const headers = [
  "Ref",
  "Component Name",
  "KPI Ref",
  "Sub-Component",
  "Phase",
  "KPI / Deliverable",
  "Measurement Basis",
  "Target / Threshold",
  "Sign-Off Basis",
  "Status",
  "What we have today",
  "What's still missing",
];

const data = [
  headers,
  ...ROWS.map((r) => [
    r.ref,
    r.component,
    r.kpi,
    r.subComponent,
    r.phase,
    r.deliverable,
    r.measurement,
    r.target,
    r.signOff,
    r.status,
    r.weHave,
    r.missing,
  ]),
];

const wb = xlsx.utils.book_new();
const ws = xlsx.utils.aoa_to_sheet(data);

// Column widths
ws["!cols"] = [
  { wch: 4 },   // Ref
  { wch: 24 },  // Component Name
  { wch: 8 },   // KPI Ref
  { wch: 28 },  // Sub-Component
  { wch: 8 },   // Phase
  { wch: 38 },  // Deliverable
  { wch: 38 },  // Measurement Basis
  { wch: 38 },  // Target / Threshold
  { wch: 38 },  // Sign-Off Basis
  { wch: 12 },  // Status
  { wch: 50 },  // What we have
  { wch: 50 },  // What's still missing
];
ws["!rows"] = [{ hpt: 28 }]; // header taller

xlsx.utils.book_append_sheet(wb, ws, "KPI Backlog");

// Optional summary sheet
const summary = [
  ["IOX KPI Backlog summary", ""],
  [`Generated`, new Date().toISOString().slice(0, 16)],
  ["", ""],
  ["Status", "Count"],
  ["Strong / Done", (totals.Strong ?? 0) + (totals.Done ?? 0)],
  ["Partial", totals.Partial ?? 0],
  ["Weak", totals.Weak ?? 0],
  ["Not Started", totals["Not Started"] ?? 0],
  ["Total", ROWS.length],
  ["", ""],
  ["Component", "% LoE"],
  ["Foundation & Security", "10%"],
  ["Data & Architecture", "45%"],
  ["Integration Capability", "25%"],
  ["Operational Readiness", "10%"],
  ["Platform Launch / First Live Service", "10%"],
];
const ws2 = xlsx.utils.aoa_to_sheet(summary);
ws2["!cols"] = [{ wch: 38 }, { wch: 14 }];
xlsx.utils.book_append_sheet(wb, ws2, "Summary");

xlsx.writeFile(wb, resolve(ROOT, "backlog.xlsx"));
console.log(`✓ Wrote ${resolve(ROOT, "backlog.xlsx")}`);
