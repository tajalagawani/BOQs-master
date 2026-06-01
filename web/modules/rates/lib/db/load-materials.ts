/**
 * Rates v2 — loader for Materials::Materials and Materials::Commodities.
 *
 *   Materials::Materials   — line is material × spec × unit × price × year
 *   Materials::Commodities — line is commodity × region × unit × price × year
 *
 * Both tabs feed `rates_fact_material_price`. The `region` column on
 * Commodities is normalized to a country when it looks like one (e.g.
 * "Saudi Arabia") and otherwise stored as the material `notes`.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  createDimCache,
  findOrCreateSection,
  findOrCreateTab,
  findOrCreateMaterial,
  findOrCreateCountry,
  findOrCreateCurrency,
  findOrCreateUom,
  type DimCache,
} from "./dimensions";

export interface RawMaterialRow {
  // Materials tab
  category?: string | null;
  material?: string | null;
  spec?: string | null;
  // Commodities tab
  commodity?: string | null;
  region?: string | null;
  // Common
  unit?: string | null;
  currency?: string | null;
  rate?: number | string | null;
  year?: string | number | Date | null;
  source?: string | null;
  notes?: string | null;
}

export interface LoadMaterialsArgs {
  sectionCode: string;       // 'materials'
  tabLabel: string;          // 'Materials' | 'Commodities'
  rows: RawMaterialRow[];
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

export interface LoadMaterialsResult {
  uploadId: string;
  inserted: number;
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

function toVintage(v: RawMaterialRow["year"]): Date | null {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) return Number.isFinite(v.getTime()) ? v : null;
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isInteger(n) && n >= 1900 && n <= 2100) {
    return new Date(Date.UTC(n, 0, 1));
  }
  const s = String(v).trim();
  if (/^\d{4}$/.test(s)) return new Date(Date.UTC(Number(s), 0, 1));
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d : null;
}

function nz<T>(v: T | null | undefined): T | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string" && v.trim() === "") return null;
  return v;
}

function bump(map: Record<string, number>, key: string) {
  map[key] = (map[key] ?? 0) + 1;
}

/** Heuristic: does this region string look like a country? */
function looksLikeCountry(raw: string): boolean {
  // Very small allowlist — extend as needed. Anything else is treated as
  // a market region (e.g. "Middle East", "Asia") and stored in notes.
  const COUNTRIES = new Set([
    "uae","united arab emirates","saudi arabia","ksa","qatar","oman","kuwait",
    "bahrain","uk","united kingdom","england","usa","united states","india",
    "egypt","jordan","lebanon","turkey","china","japan","germany","france",
  ]);
  return COUNTRIES.has(raw.trim().toLowerCase());
}

/* ──────────────────────────── Main loader ─────────────────────────── */

export async function loadMaterialPrices(
  args: LoadMaterialsArgs,
): Promise<LoadMaterialsResult> {
  const cache: DimCache = createDimCache();
  const sectionId = await findOrCreateSection(args.sectionCode, undefined, cache);
  await findOrCreateTab(args.sectionCode, args.tabLabel, cache);

  const skipped: Record<string, number> = {};

  const upload = await prisma.ratesUploadV2.create({
    data: {
      sectionId,
      tabId: await findOrCreateTab(args.sectionCode, args.tabLabel, cache),
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

  type FactRow = Prisma.RatesFactMaterialPriceCreateManyInput;
  const facts: FactRow[] = [];

  for (const raw of args.rows) {
    const label = nz(raw.material) ?? nz(raw.commodity);
    if (!label) {
      bump(skipped, "no_material");
      continue;
    }

    const price = toNumber(raw.rate);
    if (price === null) {
      bump(skipped, "no_price");
      continue;
    }

    const vintage = toVintage(raw.year) ?? new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));

    const family = nz(raw.category);
    const materialId = await findOrCreateMaterial(String(label), family ? String(family) : null, cache);

    // Region resolution: if it looks like a country, link it; otherwise stash
    // in notes so we never lose the signal.
    let countryId: string | null = null;
    let notes: string | null = nz(raw.notes);
    const region = nz(raw.region);
    if (region) {
      if (looksLikeCountry(String(region))) {
        try {
          countryId = await findOrCreateCountry(String(region), cache);
        } catch {
          bump(skipped, "country_error");
        }
      } else {
        notes = notes ? `${notes}\nRegion: ${region}` : `Region: ${region}`;
      }
    }
    if (raw.spec) {
      notes = notes ? `${notes}\nSpec: ${raw.spec}` : `Spec: ${raw.spec}`;
    }

    let currencyId: string | null = null;
    if (raw.currency) {
      try {
        currencyId = await findOrCreateCurrency(String(raw.currency), cache);
      } catch {
        bump(skipped, "currency_error");
      }
    }

    let unitId: string | null = null;
    if (raw.unit) {
      try {
        unitId = await findOrCreateUom(String(raw.unit), cache);
      } catch {
        bump(skipped, "unit_error");
      }
    }

    facts.push({
      uploadId:   upload.id,
      materialId,
      countryId,
      currencyId,
      unitId,
      price:       new Prisma.Decimal(price),
      vintageDate: vintage,
      source:      nz(raw.source),
      notes,
    });
  }

  let inserted = 0;
  const CHUNK = 500;
  for (let i = 0; i < facts.length; i += CHUNK) {
    const r = await prisma.ratesFactMaterialPrice.createMany({
      data: facts.slice(i, i + CHUNK),
    });
    inserted += r.count;
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
    skipped: Object.values(skipped).reduce((a, b) => a + b, 0),
    skippedReasons: skipped,
  };
}
