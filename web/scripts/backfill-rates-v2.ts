/**
 * One-shot backfill: walk every legacy `rates_uploads` blob and pump it
 * through the v2 dispatcher so the new fact tables are populated.
 *
 * Idempotent: every v2 upload row produced by this script is tagged with
 * `parserName = "backfill:<legacy_upload_id>"`. Re-running the script will
 * detect those markers and skip the corresponding legacy rows.
 *
 *   USAGE:
 *     cd web
 *     npx tsx scripts/backfill-rates-v2.ts            # run for real
 *     npx tsx scripts/backfill-rates-v2.ts --dry      # print plan only
 *     npx tsx scripts/backfill-rates-v2.ts --force    # ignore the marker
 *
 * Output ends with a single summary table — easy to copy into release notes.
 */

import { prisma } from "@/lib/prisma";
import {
  dispatchUpload,
  SECTION_CODE,
} from "@/modules/rates/lib/db/load-dispatch";

const DRY  = process.argv.includes("--dry");
const FORCE = process.argv.includes("--force");

interface Summary {
  legacyId: string;
  section: string;
  tab: string;
  legacyRowCount: number;
  result: "skipped" | "no_loader" | "loaded" | "error";
  inserted?: number;
  skipped?: number;
  reasons?: Record<string, number>;
  error?: string;
}

function fmt(n: number | undefined | null): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString();
}

async function main() {
  const startedAt = Date.now();

  // Pull every legacy upload, oldest first so re-runs are deterministic.
  const legacy = await prisma.ratesUpload.findMany({
    orderBy: { uploadedAt: "asc" },
    select: {
      id: true,
      section: true,
      tab: true,
      name: true,
      size: true,
      rowCount: true,
      sheetName: true,
      rows: true,
      extraColumns: true,
      uploadedById: true,
    },
  });

  console.log(
    `[backfill] ${legacy.length} legacy upload(s) found · ${
      DRY ? "DRY RUN" : FORCE ? "FORCE MODE" : "live"
    }`,
  );

  // Existing v2 markers — used to skip already-backfilled rows.
  const existingMarkers = FORCE
    ? new Set<string>()
    : new Set(
        (
          await prisma.ratesUploadV2.findMany({
            where: { parserName: { startsWith: "backfill:" } },
            select: { parserName: true },
          })
        )
          .map((u) => u.parserName.slice("backfill:".length))
          .filter(Boolean),
      );

  const summaries: Summary[] = [];

  for (const row of legacy) {
    const base: Summary = {
      legacyId: row.id,
      section: row.section,
      tab: row.tab,
      legacyRowCount: row.rowCount,
      result: "loaded",
    };

    if (existingMarkers.has(row.id)) {
      summaries.push({ ...base, result: "skipped" });
      console.log(
        `  · ${row.section} :: ${row.tab}  (${row.id})  — already loaded, skipped`,
      );
      continue;
    }

    if (!SECTION_CODE[row.section]) {
      summaries.push({ ...base, result: "no_loader", error: `unknown section '${row.section}'` });
      console.log(`  · ${row.section} :: ${row.tab}  — unknown section, skipped`);
      continue;
    }

    const blob = row.rows;
    const rows = Array.isArray(blob) ? (blob as Record<string, unknown>[]) : [];
    if (rows.length === 0) {
      summaries.push({ ...base, result: "no_loader", error: "empty rows" });
      console.log(`  · ${row.section} :: ${row.tab}  — empty rows blob, skipped`);
      continue;
    }

    if (DRY) {
      summaries.push({ ...base, result: "loaded", inserted: rows.length });
      console.log(
        `  · ${row.section} :: ${row.tab}  (${row.id})  — would load ${rows.length} rows`,
      );
      continue;
    }

    try {
      const out = await dispatchUpload({
        sectionLabel: row.section,
        tabLabel: row.tab,
        rows,
        upload: {
          fileName: row.name,
          sizeBytes: Number(row.size),
          sheetName: row.sheetName,
          parserName: `backfill:${row.id}`,
          parserVersion: "1",
          uploadedById: row.uploadedById,
          extraColumns: row.extraColumns,
        },
      });

      if (out.kind === "noop") {
        summaries.push({ ...base, result: "no_loader", error: out.result.reason });
        console.log(
          `  · ${row.section} :: ${row.tab}  — no loader: ${out.result.reason}`,
        );
      } else {
        const r = out.result as { inserted?: number; skipped?: number; skippedReasons?: Record<string, number>; assetValueRows?: number };
        const inserted = (r.inserted ?? 0) + (r.assetValueRows ?? 0);
        summaries.push({
          ...base,
          result: "loaded",
          inserted,
          skipped: r.skipped ?? 0,
          reasons: r.skippedReasons,
        });
        console.log(
          `  ✓ ${row.section} :: ${row.tab}  — ${fmt(inserted)} loaded · ${fmt(r.skipped)} skipped`,
        );
      }
    } catch (err) {
      summaries.push({
        ...base,
        result: "error",
        error: err instanceof Error ? err.message : String(err),
      });
      console.error(
        `  ✗ ${row.section} :: ${row.tab}  — ERROR: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────
  const tookSec = ((Date.now() - startedAt) / 1000).toFixed(1);
  const loaded = summaries.filter((s) => s.result === "loaded");
  const skippedRows = summaries.filter((s) => s.result === "skipped");
  const noLoader = summaries.filter((s) => s.result === "no_loader");
  const errored = summaries.filter((s) => s.result === "error");

  console.log("");
  console.log("──────────────────────────────────────────────────────────────");
  console.log(`  Backfill summary  (${tookSec}s, ${DRY ? "DRY RUN" : "applied"})`);
  console.log("──────────────────────────────────────────────────────────────");
  console.log(`  Uploads loaded     : ${loaded.length}`);
  console.log(`  Uploads skipped    : ${skippedRows.length}  (already backfilled)`);
  console.log(`  Uploads w/o loader : ${noLoader.length}`);
  console.log(`  Uploads errored    : ${errored.length}`);
  console.log(`  Fact rows inserted : ${fmt(loaded.reduce((s, x) => s + (x.inserted ?? 0), 0))}`);
  console.log(`  Source rows skipped: ${fmt(loaded.reduce((s, x) => s + (x.skipped ?? 0), 0))}`);
  if (errored.length > 0) {
    console.log("");
    console.log("  Errors:");
    for (const e of errored) {
      console.log(`    ${e.section} :: ${e.tab}  →  ${e.error}`);
    }
  }
  if (noLoader.length > 0) {
    console.log("");
    console.log("  No-loader (this is normal for Market Testing Log etc.):");
    for (const n of noLoader) {
      console.log(`    ${n.section} :: ${n.tab}  →  ${n.error}`);
    }
  }
  console.log("──────────────────────────────────────────────────────────────");

  // Post-run fact counts so we can confirm the data actually landed.
  if (!DRY) {
    const counts = await Promise.all([
      prisma.ratesFactRateItem.count(),
      prisma.ratesFactProjectBenchmark.count(),
      prisma.ratesFactDesignRatio.count(),
      prisma.ratesFactMaterialPrice.count(),
      prisma.ratesUploadV2.count(),
      prisma.ratesDimProject.count(),
    ]);
    console.log("");
    console.log("  v2 fact counts after backfill:");
    console.log(`    rate_items         : ${fmt(counts[0])}`);
    console.log(`    project_benchmarks : ${fmt(counts[1])}`);
    console.log(`    design_ratios      : ${fmt(counts[2])}`);
    console.log(`    material_prices    : ${fmt(counts[3])}`);
    console.log(`    uploads_v2         : ${fmt(counts[4])}`);
    console.log(`    projects           : ${fmt(counts[5])}`);
  }
}

main()
  .catch((err) => {
    console.error("[backfill] fatal:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
