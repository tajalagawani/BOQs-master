/**
 * Rates v2 — loader for Buildings::Design Ratios.
 *
 * Each parsed row carries one NRM/CSI line plus a ratio value for many
 * (asset class × asset type × asset form) combinations. We:
 *
 *   1. Insert one row into `rates_fact_design_ratio` keyed on NRM/CSI/unit.
 *   2. Iterate the asset-type columns; for every one with a value, insert
 *      into `rates_fact_design_ratio_asset_type`.
 *
 * The asset-type column → (class, type, form) tuple mapping is fixed by the
 * existing column schema (see `web/modules/rates/lib/schemas.ts` line ~250).
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  createDimCache,
  findOrCreateSection,
  findOrCreateTab,
  findOrCreateNrmL1,
  findOrCreateNrmL2,
  findOrCreateNrmL3,
  findOrCreateCsiCode,
  findOrCreateUom,
  findOrCreateAssetClass,
  findOrCreateAssetType,
  findOrCreateAssetForm,
  type DimCache,
} from "./dimensions";

/**
 * Spreadsheet column key → (asset class, asset type, asset form) tuple.
 * Keep this in sync with `Buildings::Design Ratios` in schemas.ts.
 */
const ASSET_COL_MAP: Record<
  string,
  { assetClass: string; assetType: string; assetForm: string }
> = {
  resHighSteel:  { assetClass: "Residential",  assetType: "High Rise",       assetForm: "Steel frame" },
  resHighConc:   { assetClass: "Residential",  assetType: "High Rise",       assetForm: "Concrete frame" },
  resMedConc:    { assetClass: "Residential",  assetType: "Mid Rise",        assetForm: "Concrete frame" },
  hospHighConc:  { assetClass: "Hospitality",  assetType: "High Rise",       assetForm: "Concrete frame" },
  offHighSteel:  { assetClass: "Commercial",   assetType: "Office High Rise",assetForm: "Steel frame" },
  offMedConc:    { assetClass: "Commercial",   assetType: "Office Mid Rise", assetForm: "Concrete frame" },
  offLowConc:    { assetClass: "Commercial",   assetType: "Office Low Rise", assetForm: "Concrete frame" },
  mixHighConc:   { assetClass: "Mixed Use",    assetType: "High Rise",       assetForm: "Concrete frame" },
  mixMedConc:    { assetClass: "Mixed Use",    assetType: "Mid Rise",        assetForm: "Concrete frame" },
  eduLowConc:    { assetClass: "Education",    assetType: "Low Rise",        assetForm: "Concrete frame" },
  retailLowConc: { assetClass: "Retail",       assetType: "Low Rise",        assetForm: "Concrete frame" },
};

export interface RawDesignRatioRow {
  ref?: string | number | null;
  l1Code?: string | null;
  l1Name?: string | null;
  l2Code?: string | null;
  l2Name?: string | null;
  l2l3Code?: string | null;
  csi?: string | null;
  units?: string | null;
  // Asset-type ratio columns (any string keys from ASSET_COL_MAP — and we
  // also accept unknown keys silently to avoid crashing on future extras).
  [k: string]: unknown;
}

export interface LoadDesignRatiosArgs {
  sectionCode: string;
  tabLabel: string;
  rows: RawDesignRatioRow[];
  upload: {
    fileName: string;
    sizeBytes: number;
    sheetName?: string | null;
    parserName: string;
    parserVersion?: string | null;
    schemaVersion?: string | null;
    uploadedById?: string | null;
    extraColumns?: unknown;
    rawSample?: unknown;
  };
}

export interface LoadDesignRatiosResult {
  uploadId: string;
  inserted: number;        // fact_design_ratio rows
  assetValueRows: number;  // fact_design_ratio_asset_type rows
  skipped: number;
  skippedReasons: Record<string, number>;
}

/* ──────────────────────────── Helpers ─────────────────────────── */

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).replace(/[, _]/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function nz<T>(v: T | null | undefined): T | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string" && v.trim() === "") return null;
  return v;
}

function bump(map: Record<string, number>, key: string) {
  map[key] = (map[key] ?? 0) + 1;
}

/** Strip a "1.2" code into individual pieces — "1.2" → ["1", "2"]. */
function splitNrmCode(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return String(raw).split(/[\.\s]+/).filter(Boolean);
}

/* ──────────────────────────── Main loader ─────────────────────────── */

export async function loadDesignRatios(
  args: LoadDesignRatiosArgs,
): Promise<LoadDesignRatiosResult> {
  const cache: DimCache = createDimCache();
  const sectionId = await findOrCreateSection(args.sectionCode, undefined, cache);
  const tabId     = await findOrCreateTab(args.sectionCode, args.tabLabel, cache);

  const skipped: Record<string, number> = {};

  const upload = await prisma.ratesUploadV2.create({
    data: {
      sectionId,
      tabId,
      fileName:      args.upload.fileName,
      sizeBytes:     BigInt(args.upload.sizeBytes),
      sheetName:     args.upload.sheetName ?? null,
      parserName:    args.upload.parserName,
      parserVersion: args.upload.parserVersion ?? null,
      schemaVersion: args.upload.schemaVersion ?? null,
      uploadedById:  args.upload.uploadedById ?? null,
      extraColumns:  (args.upload.extraColumns ?? []) as Prisma.InputJsonValue,
      rawSample:     (args.upload.rawSample ?? null) as Prisma.InputJsonValue,
      status:        "parsed",
      rowCount:      args.rows.length,
    },
    select: { id: true },
  });

  let inserted = 0;
  let assetValueRows = 0;

  for (const raw of args.rows) {
    // Extract per-asset-type ratio values up front so we can skip empty rows.
    const valueEntries: Array<{
      colKey: string;
      assetClass: string;
      assetType: string;
      assetForm: string;
      value: number;
    }> = [];
    for (const [colKey, meta] of Object.entries(ASSET_COL_MAP)) {
      const v = toNumber(raw[colKey]);
      if (v === null) continue;
      valueEntries.push({ colKey, ...meta, value: v });
    }

    if (valueEntries.length === 0 && !raw.l1Code && !raw.l2Code && !raw.l2l3Code && !raw.csi) {
      bump(skipped, "empty_row");
      continue;
    }

    // Resolve NRM tree
    let nrmL1Id: string | null = null;
    let nrmL2Id: string | null = null;
    let nrmL3Id: string | null = null;

    const l1Code = nz(raw.l1Code);
    if (l1Code) {
      nrmL1Id = await findOrCreateNrmL1(
        String(l1Code),
        nz(raw.l1Name) ? String(raw.l1Name) : undefined,
        cache,
      );

      const l2Code = nz(raw.l2Code);
      if (l2Code) {
        nrmL2Id = await findOrCreateNrmL2(
          String(l2Code),
          nz(raw.l2Name) ? String(raw.l2Name) : undefined,
          String(l1Code),
          cache,
        );

        const l3Code = nz(raw.l2l3Code);
        if (l3Code) {
          // l2l3Code can be a leaf like "1.2.3" or just "3" — pull the last
          // segment as the L3 code.
          const parts = splitNrmCode(String(l3Code));
          const tail = parts[parts.length - 1] ?? String(l3Code);
          nrmL3Id = await findOrCreateNrmL3(
            tail,
            undefined,
            String(l2Code),
            String(l1Code),
            cache,
          );
        }
      }
    }

    // CSI code
    let csiCodeId: string | null = null;
    if (raw.csi) {
      const csiText = String(raw.csi).trim();
      if (csiText) {
        // CSI usually has the code at the start ("03 30 00 Cast-in-place …").
        const m = csiText.match(/^([0-9 ]+)\s+(.*)$/);
        const code = m ? m[1].trim() : csiText;
        const label = m ? m[2].trim() : csiText;
        csiCodeId = await findOrCreateCsiCode(code, label, cache);
      }
    }

    // Unit
    let unitId: string | null = null;
    if (raw.units) {
      try {
        unitId = await findOrCreateUom(String(raw.units), cache);
      } catch {
        bump(skipped, "unit_error");
      }
    }

    // Insert the parent row, get back its id
    const created = await prisma.ratesFactDesignRatio.create({
      data: {
        uploadId: upload.id,
        nrmL1Id,
        nrmL2Id,
        nrmL3Id,
        csiCodeId,
        unitId,
      },
      select: { id: true },
    });
    inserted++;

    // Insert side-table rows (asset-type combos with non-null values)
    if (valueEntries.length > 0) {
      const sideRows: Prisma.RatesFactDesignRatioAssetTypeCreateManyInput[] = [];
      for (const v of valueEntries) {
        const assetClassId = await findOrCreateAssetClass(v.assetClass, cache);
        const assetTypeId  = await findOrCreateAssetType(v.assetType, v.assetClass, cache);
        const assetFormId  = await findOrCreateAssetForm(v.assetForm, assetTypeId, cache);
        sideRows.push({
          ratioId: created.id,
          assetClassId,
          assetTypeId,
          assetFormId,
          ratioValue: new Prisma.Decimal(v.value),
        });
      }
      const r = await prisma.ratesFactDesignRatioAssetType.createMany({ data: sideRows });
      assetValueRows += r.count;
    }
  }

  await prisma.ratesUploadV2.update({
    where: { id: upload.id },
    data: {
      status:   inserted > 0 ? "loaded" : "failed",
      rowCount: inserted,
      loadedAt: new Date(),
    },
  });

  return {
    uploadId: upload.id,
    inserted,
    assetValueRows,
    skipped: Object.values(skipped).reduce((a, b) => a + b, 0),
    skippedReasons: skipped,
  };
}
