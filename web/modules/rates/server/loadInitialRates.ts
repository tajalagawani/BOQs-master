// Server-only loader for the /rates page. Returns the seed Buildings :: Rates
// dataset (rates.json) + the seed filter taxonomy (filters.json) + any
// previously-uploaded snapshots persisted to the main IOX Postgres via the
// RatesUpload model. The page passes all three to the client workspace, which
// then mirrors uploads back to the DB through /api/rates/uploads.

import "server-only";
import { prisma } from "@/lib/prisma";
import type { PersistedStore, RatesDataEntry } from "@/modules/rates/lib/types";

// Seed JSON lives inside the module so the original Omnium import paths
// (`import rates from "@/data/rates.json"`) map cleanly to the new home.
import seedRates from "@/modules/rates/data/rates.json";
import seedFilters from "@/modules/rates/data/filters.json";

export async function loadInitialRates(): Promise<{
  rates: Record<string, unknown>[];
  filters: Record<string, string[]>;
  persisted: PersistedStore;
}> {
  let persisted: PersistedStore = {};
  try {
    const uploads = await prisma.ratesUpload.findMany({
      orderBy: { uploadedAt: "asc" },
    });
    for (const u of uploads) {
      const key = `${u.section} :: ${u.tab}`;
      persisted[key] = {
        meta: {
          name: u.name,
          size: Number(u.size),
          rowCount: u.rowCount,
          sheetName: u.sheetName ?? undefined,
        },
        rows: (u.rows as unknown as Record<string, unknown>[]) ?? [],
        extraColumns: (u.extraColumns as unknown as RatesDataEntry["extraColumns"]) ?? [],
      };
    }
  } catch (err) {
    // The migration may not have run yet — log and fall back to seed data so
    // the page still renders the Buildings :: Rates view.
    console.warn("[rates] persisted uploads unavailable:", (err as Error).message);
  }
  return {
    rates: seedRates as Record<string, unknown>[],
    filters: seedFilters as Record<string, string[]>,
    persisted,
  };
}
