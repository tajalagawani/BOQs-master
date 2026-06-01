/**
 * Rates v2 — read queries that power the home screen and chart pages.
 *
 * Each helper returns plain data (no Prisma decorations) so it crosses the
 * server-component → client-component boundary cleanly.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/* ───────────────────── Home-screen metrics ───────────────────── */

export interface RatesHomeMetrics {
  sections: number;
  tabs: number;
  projects: number;
  rateItems: number;
  benchmarks: number;
  materialPrices: number;
  designRatios: number;
  uploads: number;
  latestUploadAt: string | null;
}

export async function fetchHomeMetrics(): Promise<RatesHomeMetrics> {
  // Defensive in case the dev server is running a stale Prisma client
  // (the rates v2 models won't exist on the delegate). Falls back to zeros
  // so the home page renders instead of 500-ing.
  const p = prisma as unknown as Record<string, { count: () => Promise<number>; findFirst?: (args: unknown) => Promise<{ uploadedAt: Date } | null> } | undefined>;
  const safeCount = (key: string) => p[key]?.count() ?? Promise.resolve(0);

  const [
    sections,
    tabs,
    projects,
    rateItems,
    benchmarks,
    materialPrices,
    designRatios,
    uploads,
    latestUpload,
  ] = await Promise.all([
    safeCount("ratesDimSection"),
    safeCount("ratesDimTab"),
    safeCount("ratesDimProject"),
    safeCount("ratesFactRateItem"),
    safeCount("ratesFactProjectBenchmark"),
    safeCount("ratesFactMaterialPrice"),
    safeCount("ratesFactDesignRatio"),
    safeCount("ratesUploadV2"),
    p["ratesUploadV2"]?.findFirst?.({
      orderBy: { uploadedAt: "desc" },
      select: { uploadedAt: true },
    }) ?? Promise.resolve(null),
  ]);

  return {
    sections,
    tabs,
    projects,
    rateItems,
    benchmarks,
    materialPrices,
    designRatios,
    uploads,
    latestUploadAt:
      latestUpload && latestUpload.uploadedAt
        ? latestUpload.uploadedAt.toISOString()
        : null,
  };
}

/* ───────────────────── Chart #4: POMI × Country heat-map ─────── */

export interface PomiCountryCell {
  country: string;
  pomi: string;          // 'A'..'R' (or '—' for unknown)
  pomiLabel: string;
  medianRate: number;
  n: number;
}

export type ClassificationMode = "pomi" | "cesmm" | "nrm";

export async function fetchPomiCountryHeatmap(opts?: {
  currencyIso?: string;
  baseDateFrom?: Date;
  baseDateTo?: Date;
  /** Which taxonomy to pivot the heatmap on. Default 'pomi'. */
  mode?: ClassificationMode;
}): Promise<PomiCountryCell[]> {
  // Guard against stale dev-server Prisma client.
  if (!(prisma as unknown as Record<string, unknown>).ratesFactRateItem) return [];

  const mode: ClassificationMode = opts?.mode ?? "pomi";

  // Resolve the row axis (code + label) per chosen taxonomy.
  // Falls back to '—' when the rate has no tag in that taxonomy.
  const axis = {
    pomi: {
      join:  Prisma.sql`LEFT JOIN rates_dim_pomi_section ps ON ps.id = fri.pomi_section_id`,
      code:  Prisma.sql`COALESCE(ps.code,  '—')`,
      label: Prisma.sql`ps.label`,
    },
    cesmm: {
      join:  Prisma.sql`LEFT JOIN rates_dim_cesmm_ref cr ON cr.id = fri.cesmm_ref_id`,
      code:  Prisma.sql`COALESCE(cr.code,  '—')`,
      label: Prisma.sql`cr.label`,
    },
    nrm: {
      join:  Prisma.sql`LEFT JOIN rates_dim_nrm_l1 nl1 ON nl1.id = fri.nrm_l1_id`,
      code:  Prisma.sql`COALESCE(nl1.code, '—')`,
      label: Prisma.sql`nl1.label`,
    },
  }[mode];

  const filters: Prisma.Sql[] = [Prisma.sql`fri.rate IS NOT NULL`];
  if (opts?.currencyIso) {
    filters.push(Prisma.sql`cur.iso4217 = ${opts.currencyIso}`);
  }
  if (opts?.baseDateFrom) {
    filters.push(Prisma.sql`fri.base_date >= ${opts.baseDateFrom}`);
  }
  if (opts?.baseDateTo) {
    filters.push(Prisma.sql`fri.base_date <= ${opts.baseDateTo}`);
  }
  const whereSql = Prisma.sql`WHERE ${Prisma.join(filters, " AND ")}`;

  const rows = await prisma.$queryRaw<
    Array<{
      country: string;
      pomi: string;
      pomi_label: string | null;
      median_rate: string;
      n: bigint;
    }>
  >(Prisma.sql`
    SELECT
      COALESCE(c.name, '—')        AS country,
      ${axis.code}                 AS pomi,
      ${axis.label}                AS pomi_label,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY fri.rate) AS median_rate,
      COUNT(*)                     AS n
    FROM rates_fact_rate_item fri
    LEFT JOIN rates_dim_project        proj ON proj.id = fri.project_id
    LEFT JOIN rates_dim_country        c    ON c.id    = proj.country_id
    ${axis.join}
    LEFT JOIN rates_dim_currency       cur  ON cur.id  = fri.currency_id
    ${whereSql}
    GROUP BY c.name, ${axis.code}, ${axis.label}
    HAVING COUNT(*) > 0
    ORDER BY c.name, ${axis.code}
  `);

  return rows.map((r) => ({
    country: r.country,
    pomi: r.pomi,
    pomiLabel: r.pomi_label ?? r.pomi,
    medianRate: Number(r.median_rate),
    n: Number(r.n),
  }));
}

/* ───────────────────── Chart #16 + #17: NRM L1 cost share ────── */

export interface NrmSliceRow {
  nrmCode: string;
  nrmLabel: string;
  totalCost: number;
}

export interface ProjectNrmBar {
  projectId: string;
  project: string;
  baseDate: string | null;
  costPerBua: number | null;
  costPerGia: number | null;
  costPerGfa: number | null;
  stack: NrmSliceRow[];
}

export async function fetchNrmCostShareOverall(opts?: {
  assetClass?: string;
}): Promise<NrmSliceRow[]> {
  if (!(prisma as unknown as Record<string, unknown>).ratesFactProjectBenchmark) return [];

  // Build the asset-class JOIN as a SQL fragment via Prisma.sql so the
  // parameterization travels with the template literal. Prisma's $queryRaw
  // tagged template treats `${…}` as a parameter, so nesting another
  // $queryRaw call inside doesn't compose — Prisma.sql is the right knob.
  const assetClassJoin = opts?.assetClass
    ? Prisma.sql`
        JOIN rates_dim_project p
          ON p.id = b.project_id
        JOIN rates_dim_asset_class ac
          ON ac.id = p.asset_class_id
         AND ac.label = ${opts.assetClass}
      `
    : Prisma.empty;

  const rows = await prisma.$queryRaw<
    Array<{ nrm_code: string; nrm_label: string; total_cost: string }>
  >(Prisma.sql`
    SELECT
      n1.code  AS nrm_code,
      n1.label AS nrm_label,
      COALESCE(SUM(b.total_cost), 0) AS total_cost
    FROM rates_fact_project_benchmark b
    JOIN rates_dim_nrm_l1 n1 ON n1.id = b.nrm_l1_id
    ${assetClassJoin}
    GROUP BY n1.code, n1.label
    ORDER BY total_cost DESC
  `);
  return rows.map((r) => ({
    nrmCode: r.nrm_code,
    nrmLabel: r.nrm_label,
    totalCost: Number(r.total_cost),
  }));
}

export async function fetchNrmStackByProject(opts?: {
  assetClass?: string;
  limit?: number;
}): Promise<ProjectNrmBar[]> {
  const limit = opts?.limit ?? 24;

  // Guard: dev-server may be holding a stale Prisma client without the v2
  // models — return an empty result instead of crashing.
  const delegate = (prisma as unknown as Record<string, { findMany?: typeof prisma.ratesFactProjectBenchmark.findMany }>).ratesFactProjectBenchmark;
  if (!delegate?.findMany) return [];

  // Pull (project × NRM L1) rows with absolute + per-area costs, then nest
  // into one record per project in JS.
  const rows = await prisma.ratesFactProjectBenchmark.findMany({
    where: {
      ...(opts?.assetClass
        ? { project: { assetClass: { label: opts.assetClass } } }
        : {}),
    },
    select: {
      projectId: true,
      project: {
        select: { name: true, baseDate: true },
      },
      nrmL1: { select: { code: true, label: true } },
      totalCost: true,
      costPerBua: true,
      costPerGia: true,
      costPerGfa: true,
    },
  });

  const byProject = new Map<string, ProjectNrmBar>();
  for (const r of rows) {
    if (!r.nrmL1) continue;
    const existing = byProject.get(r.projectId);
    const slice: NrmSliceRow = {
      nrmCode: r.nrmL1.code,
      nrmLabel: r.nrmL1.label,
      totalCost: r.totalCost ? Number(r.totalCost) : 0,
    };
    if (existing) {
      existing.stack.push(slice);
      // Project-level per-area numbers come from any non-null benchmark row.
      existing.costPerBua ??= r.costPerBua ? Number(r.costPerBua) : null;
      existing.costPerGia ??= r.costPerGia ? Number(r.costPerGia) : null;
      existing.costPerGfa ??= r.costPerGfa ? Number(r.costPerGfa) : null;
    } else {
      byProject.set(r.projectId, {
        projectId: r.projectId,
        project: r.project.name,
        baseDate: r.project.baseDate ? r.project.baseDate.toISOString().slice(0, 10) : null,
        costPerBua: r.costPerBua ? Number(r.costPerBua) : null,
        costPerGia: r.costPerGia ? Number(r.costPerGia) : null,
        costPerGfa: r.costPerGfa ? Number(r.costPerGfa) : null,
        stack: [slice],
      });
    }
  }

  // Sort projects by total cost desc, truncate, sort stack by NRM code asc.
  const out = Array.from(byProject.values())
    .map((p) => ({
      ...p,
      stack: p.stack.sort((a, b) => a.nrmCode.localeCompare(b.nrmCode)),
    }))
    .sort((a, b) => {
      const sumA = a.stack.reduce((s, n) => s + n.totalCost, 0);
      const sumB = b.stack.reduce((s, n) => s + n.totalCost, 0);
      return sumB - sumA;
    })
    .slice(0, limit);

  return out;
}

/* ───────────────────── Chart #33: material price timeline ────── */

export interface MaterialTimelineRow {
  material: string;
  country: string | null;
  currency: string | null;
  unit: string | null;
  month: string;          // ISO date (first of month)
  price: number;
}

export async function fetchMaterialPriceTimeline(opts?: {
  materialIds?: string[];
}): Promise<MaterialTimelineRow[]> {
  if (!(prisma as unknown as Record<string, unknown>).ratesFactMaterialPrice) return [];

  const materialFilter =
    opts?.materialIds && opts.materialIds.length > 0
      ? Prisma.sql`WHERE mp.material_id IN (${Prisma.join(opts.materialIds.map((id) => Prisma.sql`${id}::uuid`))})`
      : Prisma.empty;

  const rows = await prisma.$queryRaw<
    Array<{
      material: string;
      country: string | null;
      currency: string | null;
      unit: string | null;
      month: Date;
      price: string;
    }>
  >(Prisma.sql`
    SELECT
      mat.label                                    AS material,
      cnt.name                                     AS country,
      cur.iso4217                                  AS currency,
      uom.code                                     AS unit,
      DATE_TRUNC('month', mp.vintage_date)::date   AS month,
      AVG(mp.price)                                AS price
    FROM rates_fact_material_price mp
    JOIN rates_dim_material mat ON mat.id = mp.material_id
    LEFT JOIN rates_dim_country  cnt ON cnt.id  = mp.country_id
    LEFT JOIN rates_dim_currency cur ON cur.id  = mp.currency_id
    LEFT JOIN rates_dim_uom      uom ON uom.id  = mp.unit_id
    ${materialFilter}
    GROUP BY mat.label, cnt.name, cur.iso4217, uom.code, month
    ORDER BY month, mat.label
  `);

  return rows.map((r) => ({
    material: r.material,
    country: r.country,
    currency: r.currency,
    unit: r.unit,
    month: r.month.toISOString().slice(0, 10),
    price: Number(r.price),
  }));
}

/* ───────────────────── Elemental by Project (GIA/GFA/BUA) ────── */

export interface ElementalSlice {
  nrmCode: string;
  nrmLabel: string;
  costPerBua: number | null;
  costPerGia: number | null;
  costPerGfa: number | null;
  totalCost: number;
}

export interface ElementalProject {
  projectId: string;
  project: string;
  country: string | null;
  assetClass: string | null;
  assetType: string | null;
  baseDate: string | null;   // ISO YYYY-MM-DD, used for inflation lookup
  baseYear: number | null;
  currency: string | null;
  bua: number | null;
  gia: number | null;
  gfa: number | null;
  stack: ElementalSlice[];
}

export async function fetchElementalByProject(opts?: {
  assetClass?: string;
  assetType?: string;
  country?: string;
  currencyIso?: string;
}): Promise<ElementalProject[]> {
  const delegate = (prisma as unknown as Record<string, { findMany?: typeof prisma.ratesFactProjectBenchmark.findMany }>).ratesFactProjectBenchmark;
  if (!delegate?.findMany) return [];

  const rows = await prisma.ratesFactProjectBenchmark.findMany({
    where: {
      project: {
        ...(opts?.assetClass ? { assetClass: { label: opts.assetClass } } : {}),
        ...(opts?.assetType  ? { assetType:  { label: opts.assetType  } } : {}),
        ...(opts?.country    ? { country:    { name:  opts.country    } } : {}),
      },
      ...(opts?.currencyIso ? { currency: { iso4217: opts.currencyIso } } : {}),
    },
    select: {
      projectId: true,
      totalCost: true,
      costPerBua: true,
      costPerGia: true,
      costPerGfa: true,
      project: {
        select: {
          name: true, baseDate: true,
          country: { select: { name: true } },
          assetClass: { select: { label: true } },
          assetType:  { select: { label: true } },
          currency:   { select: { iso4217: true } },
          buaM2: true, giaM2: true, gfaM2: true,
        },
      },
      nrmL1: { select: { code: true, label: true } },
    },
  });

  const byProject = new Map<string, ElementalProject>();
  for (const r of rows) {
    if (!r.nrmL1) continue;
    const baseDate = r.project.baseDate
      ? r.project.baseDate.toISOString().slice(0, 10)
      : null;
    const baseYear = r.project.baseDate ? r.project.baseDate.getUTCFullYear() : null;
    const slice: ElementalSlice = {
      nrmCode: r.nrmL1.code,
      nrmLabel: r.nrmL1.label,
      costPerBua: r.costPerBua ? Number(r.costPerBua) : null,
      costPerGia: r.costPerGia ? Number(r.costPerGia) : null,
      costPerGfa: r.costPerGfa ? Number(r.costPerGfa) : null,
      totalCost:  r.totalCost  ? Number(r.totalCost)  : 0,
    };
    const existing = byProject.get(r.projectId);
    if (existing) {
      existing.stack.push(slice);
    } else {
      byProject.set(r.projectId, {
        projectId: r.projectId,
        project: r.project.name,
        country: r.project.country?.name ?? null,
        assetClass: r.project.assetClass?.label ?? null,
        assetType:  r.project.assetType?.label  ?? null,
        baseDate,
        baseYear,
        currency: r.project.currency?.iso4217 ?? null,
        bua: r.project.buaM2 ? Number(r.project.buaM2) : null,
        gia: r.project.giaM2 ? Number(r.project.giaM2) : null,
        gfa: r.project.gfaM2 ? Number(r.project.gfaM2) : null,
        stack: [slice],
      });
    }
  }

  return Array.from(byProject.values()).map((p) => ({
    ...p,
    stack: p.stack.sort((a, b) => a.nrmCode.localeCompare(b.nrmCode, undefined, { numeric: true })),
  }));
}

/** Distinct values for the filter dropdowns. */
export async function fetchElementalFilters(): Promise<{
  assetClasses: string[];
  assetTypes: Array<{ class: string; type: string }>;
  countries: string[];
}> {
  const delegate = (prisma as unknown as Record<string, { findMany?: typeof prisma.ratesDimProject.findMany }>).ratesDimProject;
  if (!delegate?.findMany) return { assetClasses: [], assetTypes: [], countries: [] };

  const rows = await prisma.ratesDimProject.findMany({
    where: {
      projectBenchmarks: { some: {} },
    },
    select: {
      country: { select: { name: true } },
      assetClass: { select: { label: true } },
      assetType:  { select: { label: true } },
    },
  });

  const assetClasses = new Set<string>();
  const assetTypes = new Set<string>();
  const typesByClass = new Map<string, string>();
  const countries = new Set<string>();
  for (const r of rows) {
    if (r.assetClass?.label) assetClasses.add(r.assetClass.label);
    if (r.assetType?.label && r.assetClass?.label) {
      assetTypes.add(`${r.assetClass.label}::${r.assetType.label}`);
      typesByClass.set(r.assetType.label, r.assetClass.label);
    }
    if (r.country?.name) countries.add(r.country.name);
  }
  return {
    assetClasses: Array.from(assetClasses).sort(),
    assetTypes: Array.from(assetTypes).map((s) => {
      const [c, t] = s.split("::");
      return { class: c, type: t };
    }).sort((a, b) => a.type.localeCompare(b.type)),
    countries: Array.from(countries).sort(),
  };
}

/* ───────────────────── Rate distribution per POMI/CESMM/NRM ──── */

export interface RateDistributionRow {
  code: string;
  label: string;
  country: string | null;
  n: number;
  min: number;
  p25: number;
  median: number;
  p75: number;
  max: number;
  currency: string | null;
}

export async function fetchRateDistribution(opts?: {
  mode?: ClassificationMode;
  currencyIso?: string;
  /** Optional: bucket rows by country in addition to the main axis. */
  perCountry?: boolean;
}): Promise<RateDistributionRow[]> {
  if (!(prisma as unknown as Record<string, unknown>).ratesFactRateItem) return [];

  const mode = opts?.mode ?? "pomi";
  const axis = {
    pomi: {
      join:  Prisma.sql`LEFT JOIN rates_dim_pomi_section ps ON ps.id = fri.pomi_section_id`,
      code:  Prisma.sql`COALESCE(ps.code,  '—')`,
      label: Prisma.sql`COALESCE(ps.label, 'Unclassified')`,
    },
    cesmm: {
      join:  Prisma.sql`LEFT JOIN rates_dim_cesmm_ref cr ON cr.id = fri.cesmm_ref_id`,
      code:  Prisma.sql`COALESCE(cr.code,  '—')`,
      label: Prisma.sql`COALESCE(cr.label, 'Unclassified')`,
    },
    nrm: {
      join:  Prisma.sql`LEFT JOIN rates_dim_nrm_l1 nl1 ON nl1.id = fri.nrm_l1_id`,
      code:  Prisma.sql`COALESCE(nl1.code, '—')`,
      label: Prisma.sql`COALESCE(nl1.label, 'Unclassified')`,
    },
  }[mode];

  const filters: Prisma.Sql[] = [Prisma.sql`fri.rate IS NOT NULL`];
  if (opts?.currencyIso) {
    filters.push(Prisma.sql`cur.iso4217 = ${opts.currencyIso}`);
  }
  const whereSql = Prisma.sql`WHERE ${Prisma.join(filters, " AND ")}`;

  const countryGroup = opts?.perCountry
    ? Prisma.sql`, c.name`
    : Prisma.empty;
  const countryExpr = opts?.perCountry
    ? Prisma.sql`c.name`
    : Prisma.sql`NULL`;

  const rows = await prisma.$queryRaw<
    Array<{
      code: string;
      label: string;
      country: string | null;
      n: bigint;
      min: string;
      p25: string;
      median: string;
      p75: string;
      max: string;
      currency: string | null;
    }>
  >(Prisma.sql`
    SELECT
      ${axis.code}                                                        AS code,
      ${axis.label}                                                       AS label,
      ${countryExpr}                                                      AS country,
      COUNT(*)                                                            AS n,
      MIN(fri.rate)                                                       AS min,
      PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY fri.rate)              AS p25,
      PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY fri.rate)              AS median,
      PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY fri.rate)              AS p75,
      MAX(fri.rate)                                                       AS max,
      MAX(cur.iso4217)                                                    AS currency
    FROM rates_fact_rate_item fri
    LEFT JOIN rates_dim_project  proj ON proj.id = fri.project_id
    LEFT JOIN rates_dim_country  c    ON c.id    = proj.country_id
    ${axis.join}
    LEFT JOIN rates_dim_currency cur  ON cur.id  = fri.currency_id
    ${whereSql}
    GROUP BY ${axis.code}, ${axis.label}${countryGroup}
    HAVING COUNT(*) > 0
    ORDER BY COUNT(*) DESC
  `);

  return rows.map((r) => ({
    code: r.code,
    label: r.label,
    country: r.country,
    n: Number(r.n),
    min: Number(r.min),
    p25: Number(r.p25),
    median: Number(r.median),
    p75: Number(r.p75),
    max: Number(r.max),
    currency: r.currency,
  }));
}

/** Discovery query for the materials page filter — return every unique
 *  material with its most recent price + currency + country count. */
export async function fetchMaterialCatalogue(): Promise<
  Array<{ id: string; label: string; family: string | null; series: number }>
> {
  const delegate = (prisma as unknown as Record<string, { findMany?: typeof prisma.ratesDimMaterial.findMany }>).ratesDimMaterial;
  if (!delegate?.findMany) return [];

  const rows = await prisma.ratesDimMaterial.findMany({
    include: { _count: { select: { prices: true } } },
    orderBy: { label: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    family: r.family ?? null,
    series: r._count.prices,
  }));
}
