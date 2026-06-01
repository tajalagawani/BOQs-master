/**
 * Rates v2 — loader for the "Rates" family of tabs:
 *
 *   Buildings::Rates
 *   Infrastructure::Rates & Benchmarks
 *   Utility Buildings::Rates
 *   Public Realm::Rates
 *   Marine::Rates
 *   Piling::Rates
 *   Piling::Framework Rates
 *   Ground Investigation::Rates
 *
 * Input: an array of parsed rows that match the schema columns defined in
 * `web/modules/rates/lib/schemas.ts` (camelCase keys: country, city, asset,
 * project, type, employer, contractor, status, baseDate, contractType,
 * pomiSection, pomiSubSection, cesmmReference, description, quantity,
 * unit, currency, rate, amount).
 *
 * Output: one `rates_upload_v2` row plus N `rates_fact_rate_item` rows,
 * committed in a single transaction.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  createDimCache,
  findOrCreateSection,
  findOrCreateTab,
  findOrCreateProject,
  findOrCreatePomiSection,
  findOrCreatePomiSubSection,
  findOrCreateCesmmRef,
  findOrCreateUom,
  findOrCreateCurrency,
  type DimCache,
} from "./dimensions";

/* ──────────────────────────── Types ─────────────────────────── */

/** Loose shape — parsers can hand us whatever; we resolve what we recognise. */
export interface RawRateRow {
  ref?: string | number | null;
  country?: string | null;
  city?: string | null;
  asset?: string | null;            // → asset class
  project?: string | null;
  type?: string | null;             // → asset type
  employer?: string | null;
  contractor?: string | null;
  status?: string | null;
  baseDate?: string | number | Date | null;
  contractType?: string | null;
  pomiSection?: string | null;     // "B" or "B — Concrete Work"
  pomiSubSection?: string | null;
  nrmL1?: string | null;            // "1 — Substructure" etc.
  cesmmReference?: string | null;
  description?: string | null;
  quantity?: number | string | null;
  unit?: string | null;
  currency?: string | null;
  rate?: number | string | null;
  amount?: number | string | null;
  inflationRate?: number | string | null;
}

export interface LoadRateItemsArgs {
  sectionCode: string;       // 'buildings', 'infrastructure', …
  tabLabel: string;          // 'Rates', 'Rates & Benchmarks', …
  rows: RawRateRow[];
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

export interface LoadRateItemsResult {
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

function toBaseDate(v: RawRateRow["baseDate"]): Date | null {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) return Number.isFinite(v.getTime()) ? v : null;

  // Pure year like 2024 or "2024" → Jan 1 of that year.
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isInteger(n) && n >= 1900 && n <= 2100) {
    return new Date(Date.UTC(n, 0, 1));
  }

  const s = String(v).trim();
  if (/^\d{4}$/.test(s)) return new Date(Date.UTC(Number(s), 0, 1));
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d : null;
}

/** Extract the leading code from a POMI string. "B — Concrete Work" → "B". */
function pomiCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = raw.trim().match(/^([A-R])(?:\b|[\s:—–-])/i);
  return m ? m[1].toUpperCase() : null;
}

/** "1 — Substructure" → { code: "1", label: "Substructure" }. */
function splitCodeLabel(raw: string | null | undefined): { code: string; label: string } | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;
  // accept "1.2" / "1.2.3" too
  const m = s.match(/^([0-9A-Za-z]+(?:\.[0-9A-Za-z]+)*)\s*[—–\-:.\s]+\s*(.*)$/);
  if (m) return { code: m[1], label: m[2] || m[1] };
  return { code: s, label: s };
}

function nz<T>(v: T | null | undefined): T | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string" && v.trim() === "") return null;
  return v;
}

function bump(map: Record<string, number>, key: string) {
  map[key] = (map[key] ?? 0) + 1;
}

/* ──────────────────────────── Main loader ─────────────────────────── */

export async function loadRateItems(args: LoadRateItemsArgs): Promise<LoadRateItemsResult> {
  const cache: DimCache = createDimCache();
  const sectionId = await findOrCreateSection(args.sectionCode, undefined, cache);
  const tabId     = await findOrCreateTab(args.sectionCode, args.tabLabel, cache);

  const skipped: Record<string, number> = {};

  // ── 1. Create the upload lineage row (status=parsed)
  const upload = await prisma.ratesUploadV2.create({
    data: {
      sectionId,
      tabId,
      fileName:       args.upload.fileName,
      sizeBytes:      BigInt(args.upload.sizeBytes),
      sheetName:      args.upload.sheetName ?? null,
      parserName:     args.upload.parserName,
      parserVersion:  args.upload.parserVersion ?? null,
      schemaVersion:  args.upload.schemaVersion ?? null,
      uploadedById:   args.upload.uploadedById ?? null,
      extraColumns:   (args.upload.extraColumns ?? []) as Prisma.InputJsonValue,
      rawSample:      (args.upload.rawSample ?? null) as Prisma.InputJsonValue,
      status:         "parsed",
      rowCount:       args.rows.length,
    },
    select: { id: true },
  });

  // ── 2. Resolve each row to FK ids
  type FactRow = Prisma.RatesFactRateItemCreateManyInput;
  const facts: FactRow[] = [];

  for (const raw of args.rows) {
    const description = nz(raw.description);
    const rate        = toNumber(raw.rate);
    const quantity    = toNumber(raw.quantity);

    if (!description && rate === null && quantity === null) {
      bump(skipped, "empty_row");
      continue;
    }
    if (!description) {
      bump(skipped, "no_description");
      continue;
    }

    const baseDate = toBaseDate(raw.baseDate);

    // Resolve project (and everything dangling off it).
    let projectId: string | null = null;
    if (raw.project) {
      try {
        projectId = await findOrCreateProject({
          name:         String(raw.project),
          baseDate,
          country:      nz(raw.country),
          city:         nz(raw.city),
          assetClass:   nz(raw.asset),
          assetType:    nz(raw.type),
          employer:     nz(raw.employer),
          contractor:   nz(raw.contractor),
          contractType: nz(raw.contractType),
          status:       nz(raw.status),
          currency:     nz(raw.currency),
        }, cache);
      } catch {
        bump(skipped, "project_resolve_error");
      }
    }

    // POMI section / sub-section
    let pomiSectionId: string | null = null;
    let pomiSubId: string | null = null;
    const ps = pomiCode(raw.pomiSection);
    if (ps) {
      pomiSectionId = await findOrCreatePomiSection(ps, raw.pomiSection ?? undefined, cache);
      if (raw.pomiSubSection) {
        pomiSubId = await findOrCreatePomiSubSection(
          String(raw.pomiSubSection),
          ps,
          cache,
        );
      }
    }

    // CESMM ref (infrastructure only — gracefully skip if absent)
    let cesmmRefId: string | null = null;
    if (raw.cesmmReference) {
      const split = splitCodeLabel(String(raw.cesmmReference));
      if (split) {
        cesmmRefId = await findOrCreateCesmmRef(split.code, split.label, cache);
      }
    }

    // Unit + currency
    let unitId: string | null = null;
    if (raw.unit) {
      try {
        unitId = await findOrCreateUom(String(raw.unit), cache);
      } catch {
        bump(skipped, "unit_error");
      }
    }
    let currencyId: string | null = null;
    if (raw.currency) {
      try {
        currencyId = await findOrCreateCurrency(String(raw.currency), cache);
      } catch {
        bump(skipped, "currency_error");
      }
    }

    // Derive amount if missing
    let amount = toNumber(raw.amount);
    if (amount === null && quantity !== null && rate !== null) {
      amount = quantity * rate;
    }

    facts.push({
      uploadId:           upload.id,
      sectionId,
      tabId,
      projectId,
      pomiSectionId,
      pomiSubId,
      cesmmRefId,
      description,
      quantity:           quantity === null ? null : new Prisma.Decimal(quantity),
      unitId,
      currencyId,
      rate:               rate === null ? null : new Prisma.Decimal(rate),
      amount:             amount === null ? null : new Prisma.Decimal(amount),
      baseDate,
      inflationRate:      toNumber(raw.inflationRate) === null
        ? null
        : new Prisma.Decimal(toNumber(raw.inflationRate)!),
    });
  }

  // ── 3. Bulk insert in chunks (Prisma createMany has a parameter limit)
  let inserted = 0;
  const CHUNK = 500;
  for (let i = 0; i < facts.length; i += CHUNK) {
    const chunk = facts.slice(i, i + CHUNK);
    const res = await prisma.ratesFactRateItem.createMany({ data: chunk });
    inserted += res.count;
  }

  // ── 4. Finalize the upload row
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
