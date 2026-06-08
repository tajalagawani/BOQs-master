// Bulk-ingest lib XLSX databases into the v2 warehouse via the same parsers /
// generic mapper + loaders the upload route uses. Idempotent per (file, sheet):
// skips a sheet whose upload already exists. Extend JOBS to add more sections.
//
//   npx tsx scripts/ingest-rates-databases.ts
import "dotenv/config";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import * as XLSX from "xlsx";
import { SCHEMAS } from "@/modules/rates/lib/schemas";
import { mapUploadToSchema } from "@/modules/rates/lib/upload-mapper";
import { getParser } from "@/modules/rates/lib/parsers";
import { dispatchUpload } from "@/modules/rates/lib/db/load-dispatch";
import { prisma } from "@/lib/prisma";

const BASE = "modules/rates/data";

interface Job {
  section: string;
  folder: string;
  filePrefix?: string;
  sheets: { sheet: string; tab: string }[];
}

// Section → newest file in folder → which sheets map to which (section, tab).
// Buildings is loaded via ingest-rates-lib.ts (rates) + ingest-buildings-benchmarks.ts.
const JOBS: Job[] = [
  {
    section: "Infrastructure", folder: "Infrastructure",
    filePrefix: "Infrastructure Rate & Benchmark Database",
    sheets: [
      { sheet: "Infrastructure Rates", tab: "Rates & Benchmarks" },
      { sheet: "Infrastructure Benchmarks", tab: "Benchmarks" },
    ],
  },
  { section: "Ground Investigation", folder: "Ground Investigation",
    filePrefix: "Ground Investigation Rates Database",
    sheets: [{ sheet: "GI", tab: "Rates" }] },
  { section: "Marine", folder: "Marine",
    filePrefix: "Marine Rates Database",
    sheets: [{ sheet: "Marine Rates", tab: "Rates" }] },
  { section: "Piling", folder: "Piling",
    filePrefix: "Piling Rates Database",
    sheets: [{ sheet: "Buildings new", tab: "Rates" }] },
  { section: "Public Realm", folder: "Landscaping",
    filePrefix: "Public Realm Rates Database",
    sheets: [{ sheet: "Landscaping", tab: "Rates" }] },
  { section: "Public Realm", folder: "Landscaping",
    filePrefix: "Public Realm Benchmark Database",
    sheets: [{ sheet: "Public Realm Benchmarks", tab: "Benchmarks" }] },
  { section: "Industrial", folder: "Industrial",
    filePrefix: "Industrial Benchmarks Database",
    sheets: [{ sheet: "Data", tab: "Benchmarks" }] },
  { section: "Stadium", folder: "Stadia",
    filePrefix: "Stadia Benchmarks Database",
    sheets: [{ sheet: "Stadium Rates", tab: "Benchmarks" }] },
];

function newestFile(folder: string, prefix?: string): string | null {
  const files = readdirSync(join(BASE, folder))
    .filter((f) => f.endsWith(".xlsx") && (!prefix || f.startsWith(prefix)))
    .sort();
  return files.length ? join(BASE, folder, files[files.length - 1]) : null;
}

async function main() {
  for (const job of JOBS) {
    const file = newestFile(job.folder, job.filePrefix);
    if (!file) {
      console.log(`[skip] ${job.section}: no file in ${job.folder}`);
      continue;
    }
    const fileName = file.split("/").pop() ?? job.section;
    const wb = XLSX.readFile(file);

    for (const { sheet, tab } of job.sheets) {
      // Some sheet names carry trailing spaces — match by trimmed name.
      const actualName = wb.SheetNames.find((n) => n.trim() === sheet.trim());
      const ws = actualName ? wb.Sheets[actualName] : undefined;
      if (!ws) {
        console.log(`[skip] ${job.section}: sheet "${sheet}" not found (have: ${wb.SheetNames.join(", ")})`);
        continue;
      }
      const already = await prisma.ratesUploadV2.count({
        where: { fileName, sheetName: sheet },
      });
      if (already > 0) {
        console.log(`[skip] ${fileName} :: ${sheet} already ingested`);
        continue;
      }

      const parser = getParser(job.section, tab);
      let rows: Record<string, unknown>[];
      if (parser) {
        rows = parser(wb) as Record<string, unknown>[];
      } else {
        const schema = SCHEMAS[`${job.section} :: ${tab}`];
        if (!schema) {
          console.log(`[skip] no schema for "${job.section} :: ${tab}"`);
          continue;
        }
        const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, {
          header: 1,
          defval: null,
          blankrows: false,
        });
        const headers = (aoa[0] ?? []).map((h) => String(h ?? ""));
        const dataRows = aoa.slice(1);
        rows = mapUploadToSchema({ headers, rows: dataRows } as never, schema).rows;
      }

      console.log(`[ingest] ${job.section} :: ${tab} — ${rows.length} rows from "${sheet}"`);
      const res = await dispatchUpload({
        sectionLabel: job.section,
        tabLabel: tab,
        rows,
        upload: {
          fileName,
          sizeBytes: 0,
          sheetName: sheet,
          parserName: parser ? `parser:${job.section}` : "generic-mapper",
          parserVersion: "1",
          uploadedById: null,
        },
      });
      console.log(`  → ${JSON.stringify(res.result)}`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("[ingest] FAILED:", e);
    process.exit(1);
  });
