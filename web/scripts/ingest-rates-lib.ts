// One-time: ingest the lib seed dataset (modules/rates/data/rates.json) into the
// RatesX v2 warehouse via the SAME loader the upload route uses, so the AI
// assistant (which queries rates_fact_* / rates_dim_*) can see it without a
// re-upload. Idempotent-ish: re-running creates a fresh upload + fact rows.
//
//   npx tsx scripts/ingest-rates-lib.ts
import "dotenv/config";
import seedRates from "@/modules/rates/data/rates.json";
import { dispatchUpload } from "@/modules/rates/lib/db/load-dispatch";
import { prisma } from "@/lib/prisma";

async function main() {
  // Idempotent: only seed when the warehouse is empty, so this is safe to run
  // on every deploy (it never duplicates the lib data).
  const existing = await prisma.ratesFactRateItem.count();
  if (existing > 0) {
    console.log(`[ingest] warehouse already has ${existing} rate items — skipping`);
    return;
  }

  const rows = seedRates as Record<string, unknown>[];
  console.log(`[ingest] ${rows.length} lib rate rows → Buildings :: Rates`);
  const res = await dispatchUpload({
    sectionLabel: "Buildings",
    tabLabel: "Rates",
    rows,
    upload: {
      fileName: "rates.json (lib seed)",
      sizeBytes: 0,
      parserName: "lib-seed-ingest",
      parserVersion: "1",
      uploadedById: null,
    },
  });
  console.log("[ingest] result:", JSON.stringify(res, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("[ingest] FAILED:", e);
    process.exit(1);
  });
