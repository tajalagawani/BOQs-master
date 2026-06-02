// RatesX AI assistant — read-only query tools over the v2 warehouse.
//
// The agent (modules/rates/lib/ai/agent.ts) calls these to answer questions
// with REAL numbers. Every tool runs parameterised SQL and returns compact
// JSON (medians/quartiles, sample size, currency, basis). Nothing here
// fabricates; an empty result is returned as `{ rows: 0 }` so the model can
// honestly say "the library has no data for that".

import { prisma } from "@/lib/prisma";
import { INFLATION_BY_YEAR, inflateFactor } from "@/modules/rates/lib/inflation";

const BASIS_COL: Record<string, string> = {
  BUA: "cost_per_bua",
  GIA: "cost_per_gia",
  GFA: "cost_per_gfa",
};

const num = (v: unknown): number | null =>
  v === null || v === undefined ? null : Number(v);

/* ─────────────────────── tool schemas (Anthropic) ─────────────────────── */

export const TOOL_DEFS = [
  {
    name: "list_dimensions",
    description:
      "List what the rates library actually contains: NRM L1 elements, asset classes, asset types, countries, currencies and the year range. Call this FIRST when unsure whether a filter value exists, so you never invent one.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "benchmark_rate",
    description:
      "Benchmarked cost PER m² (BUA/GIA/GFA) from project elemental benchmarks. Filter by one or more NRM L1 elements and/or asset class, country, currency. Returns overall median/quartiles + a per-element breakdown + sample size. Use for 'benchmarked rate per m² for <element/asset> in <country>'.",
    input_schema: {
      type: "object",
      properties: {
        elements: {
          type: "array",
          items: { type: "string" },
          description:
            "NRM L1 element labels to include, e.g. ['Roads','Earthworks','External Works'] for infrastructure, ['Mechanical','Electrical'] for MEP, ['Building External Envelope'] for façade. Omit to include all elements.",
        },
        assetClass: { type: "string", description: "e.g. 'Infrastructure', 'Commercial', 'Residential'." },
        country: { type: "string", description: "e.g. 'UAE'. Use list_dimensions to see options." },
        currency: { type: "string", description: "ISO, default 'AED'." },
        basis: { type: "string", enum: ["BUA", "GIA", "GFA"], description: "Area basis, default GIA." },
      },
      additionalProperties: false,
    },
  },
  {
    name: "market_rate",
    description:
      "Current market UNIT rate for a material or work item, from priced rate-item lines (e.g. AAC blockwork, cementitious waterproofing, natural stone, reinforced concrete, asphalt, granular fill). Full-text matches the description; returns median/quartiles PER UNIT (rates only compare within a unit) plus sample lines. Use for 'market rate per m²/m³ for <material> in <country>'.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Keywords to match in the line description, e.g. 'AAC block', 'granular fill', 'reinforced concrete'." },
        unit: { type: "string", description: "Optional unit code filter, e.g. 'm2', 'm3'." },
        currency: { type: "string", description: "ISO, default 'AED'." },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "elemental_breakdown",
    description:
      "Per-NRM-element cost-per-m² composition for a cohort of projects (filter by asset class / country / currency). Use to 'break down the cost components' of a building/asset type.",
    input_schema: {
      type: "object",
      properties: {
        assetClass: { type: "string" },
        country: { type: "string" },
        currency: { type: "string", description: "ISO, default 'AED'." },
        basis: { type: "string", enum: ["BUA", "GIA", "GFA"], description: "default GIA." },
      },
      additionalProperties: false,
    },
  },
  {
    name: "escalation",
    description:
      "Construction cost escalation/inflation factor between two years, from the inflation index. Use for 'how have rates changed / escalation over the past N years'. (Note: this is an index factor, not a per-material time series.)",
    input_schema: {
      type: "object",
      properties: {
        fromYear: { type: "number" },
        toYear: { type: "number" },
      },
      required: ["fromYear", "toYear"],
      additionalProperties: false,
    },
  },
] as const;

/* ─────────────────────────── executors ─────────────────────────── */

export async function executeTool(name: string, input: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "list_dimensions":
      return listDimensions();
    case "benchmark_rate":
      return benchmarkRate(input);
    case "market_rate":
      return marketRate(input);
    case "elemental_breakdown":
      return elementalBreakdown(input);
    case "escalation":
      return escalation(input);
    default:
      return { error: `unknown tool: ${name}` };
  }
}

async function listDimensions() {
  const [elements, classes, types, countries, currencies, years] = await Promise.all([
    prisma.$queryRawUnsafe<{ label: string }[]>(
      `SELECT DISTINCT n.label FROM rates_fact_project_benchmark b JOIN rates_dim_nrm_l1 n ON n.id=b.nrm_l1_id ORDER BY 1`,
    ),
    prisma.$queryRawUnsafe<{ label: string }[]>(`SELECT DISTINCT ac.label FROM rates_dim_project p JOIN rates_dim_asset_class ac ON ac.id=p.asset_class_id WHERE p.asset_class_id IS NOT NULL ORDER BY 1`),
    prisma.$queryRawUnsafe<{ label: string }[]>(`SELECT DISTINCT at.label FROM rates_dim_project p JOIN rates_dim_asset_type at ON at.id=p.asset_type_id WHERE p.asset_type_id IS NOT NULL ORDER BY 1`),
    prisma.$queryRawUnsafe<{ name: string }[]>(`SELECT DISTINCT c.name FROM rates_dim_project p JOIN rates_dim_country c ON c.id=p.country_id WHERE p.country_id IS NOT NULL ORDER BY 1`),
    prisma.$queryRawUnsafe<{ iso: string; n: bigint }[]>(`SELECT cur.iso4217 iso, count(*)::int n FROM rates_fact_rate_item ri JOIN rates_dim_currency cur ON cur.id=ri.currency_id GROUP BY 1 ORDER BY 2 DESC`),
    prisma.$queryRawUnsafe<{ min: number; max: number }[]>(`SELECT EXTRACT(YEAR FROM min(base_date))::int min, EXTRACT(YEAR FROM max(base_date))::int max FROM rates_dim_project WHERE base_date IS NOT NULL`),
  ]);
  return {
    benchmarkElements: elements.map((e) => e.label),
    assetClasses: classes.map((c) => c.label),
    assetTypes: types.map((t) => t.label),
    countries: countries.map((c) => c.name),
    currencies: currencies.map((c) => ({ iso: c.iso, rateItems: Number(c.n) })),
    yearRange: years[0] ?? null,
    note: "Only these values exist. If a requested filter (e.g. a city, an ownership split, a construction method, a green-cert flag) is not listed, the library does not capture it — say so.",
  };
}

const BENCH_JOINS = `FROM rates_fact_project_benchmark b
    JOIN rates_dim_nrm_l1 n ON n.id=b.nrm_l1_id
    JOIN rates_dim_project p ON p.id=b.project_id
    LEFT JOIN rates_dim_country c ON c.id=p.country_id
    LEFT JOIN rates_dim_asset_class ac ON ac.id=p.asset_class_id
    LEFT JOIN rates_dim_currency cur ON cur.id=p.currency_id`;

async function benchmarkRate(input: Record<string, unknown>) {
  const basis = String(input.basis ?? "GIA").toUpperCase();
  const col = BASIS_COL[basis] ?? "cost_per_gia";
  const currency = String(input.currency ?? "AED");
  const elements = Array.isArray(input.elements) ? (input.elements as string[]) : null;

  // Filters EXCEPT currency (so we can report where data lives if AED is empty).
  const baseWhere: string[] = [`b.${col} IS NOT NULL`, `b.${col} > 0`];
  const baseParams: unknown[] = [];
  if (elements && elements.length) {
    baseParams.push(elements);
    baseWhere.push(`n.label = ANY($${baseParams.length}::text[])`);
  }
  if (input.assetClass) {
    baseParams.push(String(input.assetClass));
    baseWhere.push(`ac.label = $${baseParams.length}`);
  }
  if (input.country) {
    baseParams.push(String(input.country));
    baseWhere.push(`c.name = $${baseParams.length}`);
  }

  const curParams = [...baseParams, currency];
  const curWhere = [...baseWhere, `cur.iso4217 = $${curParams.length}`];
  const FROM = `${BENCH_JOINS} WHERE ${curWhere.join(" AND ")}`;

  const overall = (await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY b.${col})::float8 median,
            percentile_cont(0.25) WITHIN GROUP (ORDER BY b.${col})::float8 q1,
            percentile_cont(0.75) WITHIN GROUP (ORDER BY b.${col})::float8 q3,
            min(b.${col})::float8 min, max(b.${col})::float8 max,
            count(*)::int rows, count(DISTINCT b.project_id)::int projects ${FROM}`,
    ...curParams,
  ))[0];

  const rows = Number(overall?.rows ?? 0);

  // No data in the requested currency → report where it actually lives so the
  // agent can answer in one shot instead of retrying blindly.
  if (rows === 0) {
    const coverage = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT COALESCE(cur.iso4217,'(no currency assigned)') currency,
              count(*)::int rows, count(DISTINCT b.project_id)::int projects
       ${BENCH_JOINS} WHERE ${baseWhere.join(" AND ")} GROUP BY 1 ORDER BY rows DESC`,
      ...baseParams,
    );
    return {
      basis,
      currency,
      unit: `${currency}/m² (${basis})`,
      rows: 0,
      currencyAvailability: coverage.map((r) => ({
        currency: r.currency,
        rows: Number(r.rows),
        projects: Number(r.projects),
      })),
      note: coverage.length
        ? `No data in ${currency}. These elements DO have benchmark rows, but under the currencies in currencyAvailability — projects marked "(no currency assigned)" can't be priced in any currency. Explain this honestly; don't retry other area bases (it won't help). Offer the currency that actually has data, or state the missing-currency gap.`
        : "No benchmark data for these filters in any currency — tell the user the library has none, and don't retry.",
    };
  }

  const byElement = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT n.label element, percentile_cont(0.5) WITHIN GROUP (ORDER BY b.${col})::float8 median,
            count(DISTINCT b.project_id)::int projects ${FROM} GROUP BY n.label ORDER BY median DESC NULLS LAST`,
    ...curParams,
  );

  return {
    basis,
    currency,
    unit: `${currency}/m² (${basis})`,
    rows,
    projects: Number(overall?.projects ?? 0),
    median: num(overall?.median),
    q1: num(overall?.q1),
    q3: num(overall?.q3),
    min: num(overall?.min),
    max: num(overall?.max),
    byElement: byElement.map((e) => ({ element: e.element, median: num(e.median), projects: Number(e.projects) })),
  };
}

async function marketRate(input: Record<string, unknown>) {
  const currency = String(input.currency ?? "AED");
  const words = String(input.query ?? "").trim().split(/\s+/).filter(Boolean).slice(0, 6);
  if (!words.length) return { rows: 0, note: "empty query" };

  const where: string[] = [`ri.rate IS NOT NULL`, `ri.rate > 0`, `cur.iso4217 = $1`];
  const params: unknown[] = [currency];
  for (const w of words) {
    params.push(`%${w}%`);
    where.push(`ri.description ILIKE $${params.length}`);
  }
  if (input.unit) {
    params.push(String(input.unit));
    where.push(`u.code = $${params.length}`);
  }
  const FROM = `FROM rates_fact_rate_item ri
    LEFT JOIN rates_dim_uom u ON u.id=ri.unit_id
    LEFT JOIN rates_dim_currency cur ON cur.id=ri.currency_id
    WHERE ${where.join(" AND ")}`;

  const byUnit = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT COALESCE(u.code,'(none)') unit,
            percentile_cont(0.5) WITHIN GROUP (ORDER BY ri.rate)::float8 median,
            percentile_cont(0.25) WITHIN GROUP (ORDER BY ri.rate)::float8 q1,
            percentile_cont(0.75) WITHIN GROUP (ORDER BY ri.rate)::float8 q3,
            min(ri.rate)::float8 min, max(ri.rate)::float8 max, count(*)::int rows ${FROM}
     GROUP BY u.code ORDER BY rows DESC LIMIT 6`,
    ...params,
  );
  const samples = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT ri.description, ri.rate::float8 rate, COALESCE(u.code,'') unit ${FROM} ORDER BY ri.rate LIMIT 5`,
    ...params,
  );
  const totalRows = byUnit.reduce((s, u) => s + Number(u.rows), 0);
  return {
    query: words.join(" "),
    currency,
    totalRows,
    perUnit: byUnit.map((u) => ({
      unit: u.unit, median: num(u.median), q1: num(u.q1), q3: num(u.q3), min: num(u.min), max: num(u.max), rows: Number(u.rows),
    })),
    samples: samples.map((s) => ({ description: s.description, rate: num(s.rate), unit: s.unit })),
    ...(totalRows === 0 ? { note: "No matching priced lines — tell the user the library has no market rate for this." } : {}),
  };
}

async function elementalBreakdown(input: Record<string, unknown>) {
  const basis = String(input.basis ?? "GIA").toUpperCase();
  const col = BASIS_COL[basis] ?? "cost_per_gia";
  const currency = String(input.currency ?? "AED");
  const where: string[] = [`b.${col} IS NOT NULL`, `b.${col} > 0`, `cur.iso4217 = $1`];
  const params: unknown[] = [currency];
  if (input.assetClass) { params.push(String(input.assetClass)); where.push(`ac.label = $${params.length}`); }
  if (input.country) { params.push(String(input.country)); where.push(`c.name = $${params.length}`); }

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT n.label element, percentile_cont(0.5) WITHIN GROUP (ORDER BY b.${col})::float8 median,
            count(DISTINCT b.project_id)::int projects
     FROM rates_fact_project_benchmark b
     JOIN rates_dim_nrm_l1 n ON n.id=b.nrm_l1_id
     JOIN rates_dim_project p ON p.id=b.project_id
     LEFT JOIN rates_dim_country c ON c.id=p.country_id
     LEFT JOIN rates_dim_asset_class ac ON ac.id=p.asset_class_id
     LEFT JOIN rates_dim_currency cur ON cur.id=p.currency_id
     WHERE ${where.join(" AND ")} GROUP BY n.label ORDER BY median DESC NULLS LAST`,
    ...params,
  );
  const elements = rows.map((e) => ({ element: e.element, median: num(e.median), projects: Number(e.projects) }));
  const total = elements.reduce((s, e) => s + (e.median ?? 0), 0);
  return {
    basis, currency,
    assetClass: input.assetClass ?? "all",
    country: input.country ?? "all",
    elements,
    totalPerM2: Math.round(total),
    ...(elements.length === 0 ? { note: "No matching projects — say so." } : {}),
  };
}

function escalation(input: Record<string, unknown>) {
  const fromYear = Number(input.fromYear);
  const toYear = Number(input.toYear);
  if (!fromYear || !toYear) return { note: "fromYear and toYear required" };
  const factor = inflateFactor(fromYear, toYear);
  return {
    fromYear, toYear,
    factor: Math.round(factor * 1000) / 1000,
    pct: Math.round((factor - 1) * 1000) / 10,
    indexedYears: Object.keys(INFLATION_BY_YEAR).map(Number).sort((a, b) => a - b),
    note: "This is a construction-cost inflation index factor, not a per-material price series.",
  };
}
