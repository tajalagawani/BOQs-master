// Shared types for the rates module — server (Prisma) and client (browser)
// both consume this. Keeping the shapes here means the API route, the
// initial-page loader, and the React table all agree on field names.

import type { Column } from "@/modules/rates/lib/schemas";

export type RatesRow = Record<string, unknown>;

export type RatesUploadMeta = {
  name: string;
  size: number;
  rowCount: number;
  sheetName?: string;
};

export type RatesDataEntry = {
  meta: RatesUploadMeta;
  rows: RatesRow[];
  extraColumns: Column[];
};

/** Keyed by `${section} :: ${tab}`. */
export type PersistedStore = Record<string, RatesDataEntry | undefined>;
