// One-time: ingest the lib Building Benchmarks database (XLSX) into the v2
// warehouse `rates_fact_project_benchmark` via the dedicated parser + the same
// loader the upload route uses — so the AI's benchmark_rate / elemental tools
// have building per-m² data without a re-upload. Idempotent (skips if filled).
//
//   npx tsx scripts/ingest-buildings-benchmarks.ts
import "dotenv/config";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import * as XLSX from "xlsx";
import { parseBuildingsBenchmarks } from "@/modules/rates/lib/parsers/buildings-benchmarks";
import { dispatchUpload } from "@/modules/rates/lib/db/load-dispatch";
import { prisma } from "@/lib/prisma";

const DIR = "modules/rates/data/Buildings";

/** Newest "Building Benchmarks Database - *.xlsx" in the folder. */
function latestBenchmarkFile(): string | null {
  const files = readdirSync(DIR)
    .filter((f) => /^Building Benchmarks Database .*\.xlsx$/i.test(f))
    .sort(); // dated names sort chronologically
  return files.length ? join(DIR, files[files.length - 1]) : null;
}

async function main() {
  const existing = await prisma.ratesFactProjectBenchmark.count();
  if (existing > 0) {
    console.log(`[bench] warehouse already has ${existing} benchmark rows — skipping`);
    return;
  }
  const file = latestBenchmarkFile();
  if (!file) {
    console.log("[bench] no Building Benchmarks Database file found — skipping");
    return;
  }
  console.log(`[bench] parsing ${file}`);
  const wb = XLSX.readFile(file);
  const rows = parseBuildingsBenchmarks(wb);
  console.log(`[bench] parsed ${rows.length} benchmark rows`);
  if (rows.length === 0) {
    console.log("[bench] parser returned 0 rows — aborting");
    return;
  }
  const res = await dispatchUpload({
    sectionLabel: "Buildings",
    tabLabel: "Benchmarks",
    rows,
    upload: {
      fileName: file.split("/").pop() ?? "Building Benchmarks (lib)",
      sizeBytes: 0,
      parserName: "buildings-benchmarks",
      parserVersion: "1",
      uploadedById: null,
    },
  });
  console.log("[bench] result:", JSON.stringify(res, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("[bench] FAILED:", e);
    process.exit(1);
  });
