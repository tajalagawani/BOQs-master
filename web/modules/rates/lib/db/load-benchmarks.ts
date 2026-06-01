/**
 * Rates v2 — loader for the "Benchmarks" family of tabs:
 *
 *   Buildings::Benchmarks
 *   Infrastructure::Benchmarks
 *   Industrial::Benchmarks
 *   Public Realm::Benchmarks
 *   Stadium::Benchmarks
 *   Buildings::MEP Benchmarks
 *
 * Output: one `rates_upload_v2` row + N `rates_fact_project_benchmark` rows.
 *
 * Each parsed row represents one project × NRM-L1 (or MEP system) cost
 * roll-up, with BUA/GIA/GFA/keys + Cost/BUA + Cost/GIA + Cost/GFA + Total
 * cost. We resolve the project + its identity dims first, then write the
 * cost figures into the fact table.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  createDimCache,
  findOrCreateSection,
  findOrCreateTab,
  findOrCreateProject,
  findOrCreateNrmL1,
  findOrCreateMepSystem,
  findOrCreateMepSubsystem,
  findOrCreateCurrency,
  type DimCache,
} from "./dimensions";

export interface RawBenchmarkRow {
  // identity
  ref?: string | number | null;
  asset?: string | null;            // → asset class
  country?: string | null;
  city?: string | null;
  area?: string | null;
  aliasLvl1?: string | null;
  projectLvl1?: string | null;
  project?: string | null;
  baseDate?: string | number | Date | null;
  year?: string | number | Date | null;     // some sheets use 'year' not 'baseDate'
  employer?: string | null;
  contractor?: string | null;
  status?: string | null;
  procurement?: string | null;
  contract?: string | null;          // infra uses 'contract' instead of 'contractType'
  contractType?: string | null;

  // measurements
  bua?: number | string | null;
  gia?: number | string | null;
  gfa?: number | string | null;
  rowArea?: number | string | null;  // infra
  gla?: number | string | null;      // infra
  parkArea?: number | string | null; // public realm
  capacity?: number | string | null; // stadium
  keys?: number | string | null;

  // costs
  totalCost?: number | string | null;
  cost?: number | string | null;     // stadium uses 'cost'
  costPerSeat?: number | string | null; // stadium
  rate?: number | string | null;     // public realm uses 'rate'
  rowRate?: number | string | null;  // infra
  glaRate?: number | string | null;  // infra
  gfaRate?: number | string | null;  // infra
  costBua?: number | string | null;
  costGia?: number | string | null;
  costGfa?: number | string | null;
  costPerGia?: number | string | null; // mep
  currency?: string | null;

  // classifications
  nrm?: string | null;               // "1 — Substructure" or similar
  element?: string | null;           // infra / public realm / MEP
  mepSystem?: string | null;
  mepSubsystem?: string | null;
}

export interface LoadBenchmarksArgs {
  sectionCode: string;
  tabLabel: string;
  rows: RawBenchmarkRow[];
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

export interface LoadBenchmarksResult {
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

function toBaseDate(v: RawBenchmarkRow["baseDate"]): Date | null {
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

function splitCodeLabel(raw: string | null | undefined): { code: string; label: string } | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;
  // Split only on an EXPLICIT delimiter (— – - : .) — never on bare whitespace,
  // otherwise multi-word element names ("Internal Walls and Doors") get their
  // first word stolen as a "code". e.g. "1.2 — Substructure", "A: Foo".
  let m = s.match(/^([0-9A-Za-z]+(?:\.[0-9A-Za-z]+)*)\s*[—–\-:]\s*(.+)$/);
  if (m) return { code: m[1], label: m[2].trim() };
  // A purely numeric leading token followed by whitespace is also a code
  // ("03 00 00 CONCRETE", "1 Substructure"). Word-led strings are plain labels.
  m = s.match(/^(\d[\d.\s]*\d|\d)\s+(.+)$/);
  if (m) return { code: m[1].trim(), label: m[2].trim() };
  return { code: s, label: s };
}

function bump(map: Record<string, number>, key: string) {
  map[key] = (map[key] ?? 0) + 1;
}

/* ──────────────────────────── Main loader ─────────────────────────── */

export async function loadProjectBenchmarks(
  args: LoadBenchmarksArgs,
): Promise<LoadBenchmarksResult> {
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

  type FactRow = Prisma.RatesFactProjectBenchmarkCreateManyInput;
  const facts: FactRow[] = [];

  for (const raw of args.rows) {
    // Some sheets (e.g. Industrial::Benchmarks) only carry a `ref` plus
    // employer/city/asset — no project name. Synthesise a stable label so
    // we still capture the benchmark.
    let projectName: string | null =
      nz(raw.project) as string | null ??
      nz(raw.projectLvl1) as string | null ??
      nz(raw.aliasLvl1) as string | null ??
      null;
    if (!projectName) {
      const parts = [
        nz(raw.employer),
        nz(raw.asset),
        nz(raw.city),
        raw.ref ? `#${raw.ref}` : null,
      ].filter(Boolean);
      if (parts.length >= 2) {
        projectName = parts.join(" · ");
      }
    }
    if (!projectName) {
      bump(skipped, "no_project");
      continue;
    }

    const baseDate = toBaseDate(raw.baseDate ?? raw.year);

    const bua  = toNumber(raw.bua ?? raw.rowArea ?? raw.parkArea ?? raw.capacity);
    const gia  = toNumber(raw.gia ?? raw.gla);
    const gfa  = toNumber(raw.gfa);
    const keys = toNumber(raw.keys);

    const totalCost = toNumber(raw.totalCost ?? raw.cost);
    const costBua   = toNumber(raw.costBua  ?? raw.rowRate ?? raw.rate);
    const costGia   = toNumber(raw.costGia  ?? raw.glaRate ?? raw.costPerGia ?? raw.costPerSeat);
    const costGfa   = toNumber(raw.costGfa  ?? raw.gfaRate);

    if (totalCost === null && costBua === null && costGia === null && costGfa === null) {
      bump(skipped, "no_costs");
      continue;
    }

    let projectId: string;
    try {
      projectId = await findOrCreateProject({
        name:         String(projectName),
        baseDate,
        country:      nz(raw.country),
        city:         nz(raw.city),
        assetClass:   nz(raw.asset),
        assetType:    nz(raw.area),
        employer:     nz(raw.employer),
        contractor:   nz(raw.contractor),
        contractType: nz(raw.contractType ?? raw.contract),
        status:       nz(raw.status),
        currency:     nz(raw.currency),
        bua,
        gia,
        gfa,
        keys: keys === null ? null : Math.round(keys),
        procurement: nz(raw.procurement),
        aliasL1: nz(raw.aliasLvl1),
      }, cache);
    } catch {
      bump(skipped, "project_resolve_error");
      continue;
    }

    // NRM L1 (or "element" string)
    let nrmL1Id: string | null = null;
    const nrmRaw = nz(raw.nrm) ?? nz(raw.element);
    if (nrmRaw) {
      const split = splitCodeLabel(String(nrmRaw));
      if (split) {
        nrmL1Id = await findOrCreateNrmL1(split.code, split.label, cache);
      }
    }

    // MEP system (only set on MEP Benchmarks rows)
    let mepSystemId: string | null = null;
    let mepSubsystemId: string | null = null;
    if (raw.mepSystem) {
      mepSystemId = await findOrCreateMepSystem(String(raw.mepSystem), cache);
      if (raw.mepSubsystem) {
        mepSubsystemId = await findOrCreateMepSubsystem(
          String(raw.mepSubsystem),
          String(raw.mepSystem),
          cache,
        );
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

    facts.push({
      uploadId:      upload.id,
      projectId,
      nrmL1Id,
      mepSystemId,
      mepSubsystemId,
      buaM2: bua === null ? null : new Prisma.Decimal(bua),
      giaM2: gia === null ? null : new Prisma.Decimal(gia),
      gfaM2: gfa === null ? null : new Prisma.Decimal(gfa),
      keys:  keys === null ? null : Math.round(keys),
      totalCost: totalCost === null ? null : new Prisma.Decimal(totalCost),
      currencyId,
      costPerBua: costBua === null ? null : new Prisma.Decimal(costBua),
      costPerGia: costGia === null ? null : new Prisma.Decimal(costGia),
      costPerGfa: costGfa === null ? null : new Prisma.Decimal(costGfa),
    });
  }

  let inserted = 0;
  const CHUNK = 500;
  for (let i = 0; i < facts.length; i += CHUNK) {
    const res = await prisma.ratesFactProjectBenchmark.createMany({
      data: facts.slice(i, i + CHUNK),
    });
    inserted += res.count;
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
