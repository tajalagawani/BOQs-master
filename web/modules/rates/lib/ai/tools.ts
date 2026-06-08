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
  {
    name: "design_ratios",
    description:
      "Design/quantity ratios per unit of area for an element and asset type, e.g. how many m² of concrete formwork per m² of floor for a high-rise residential tower. Returns the median ratio_value + sample size. Use for 'typical quantity of <element> per m²', 'wall-to-floor ratio', 'how much rebar/formwork/blockwork per m²'.",
    input_schema: {
      type: "object",
      properties: {
        element: { type: "string", description: "Element/trade keyword, e.g. 'concrete', 'formwork', 'blockwork', 'rebar', 'masonry'. Matches NRM L1/L2 labels." },
        assetClass: { type: "string", description: "e.g. 'Residential', 'Commercial', 'Hospitality'." },
        assetType: { type: "string", description: "e.g. 'High Rise', 'Mid Rise', 'Office High Rise'." },
        unit: { type: "string", description: "Optional unit filter, e.g. 'm2', 'm3'." },
      },
      additionalProperties: false,
    },
  },
  {
    name: "cost_per_key",
    description:
      "Project cost PER KEY/UNIT (e.g. per hotel key, per residential unit, per villa, per stadium seat) = total project cost ÷ number of keys, from project benchmarks. Filter by asset class / country / currency. Use for 'cost per key', 'cost per villa', 'per unit'.",
    input_schema: {
      type: "object",
      properties: {
        assetClass: { type: "string" },
        country: { type: "string" },
        currency: { type: "string", description: "ISO, default 'AED'." },
      },
      additionalProperties: false,
    },
  },
  {
    name: "project_lookup",
    description:
      "Look up specific project(s) by name and return their profile (country, city, asset class/type, contractor, employer, contract type, status, areas, keys, base year) plus their benchmarked cost per m² (GIA). Pass `names` with two names to COMPARE two projects side by side.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Name/keyword to match a project, e.g. 'Al Furjan', 'Dubai Hills'." },
        names: { type: "array", items: { type: "string" }, description: "Two project name keywords to compare side by side." },
      },
      additionalProperties: false,
    },
  },
  {
    name: "rate_trend",
    description:
      "Year-by-year median unit rate for a material/work item over time (real history from priced lines' base dates), e.g. 'how has reinforced concrete / blockwork / asphalt rate changed year on year'. Returns a yearly series with sample sizes. Use this for time trends of an actual material (use `escalation` only for the overall index).",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Keywords to match in the line description, e.g. 'reinforced concrete', 'AAC block'." },
        unit: { type: "string", description: "Optional unit code filter, e.g. 'm2', 'm3'." },
        currency: { type: "string", description: "ISO, default 'AED'." },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "party_benchmark",
    description:
      "Median unit rate for a material/work item GROUPED BY contractor or employer — to compare who is cheaper/dearer for a given item. Use for 'cheapest contractor for blockwork', 'rates by employer'.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Item keywords, e.g. 'blockwork', 'reinforced concrete'." },
        by: { type: "string", enum: ["contractor", "employer"], description: "Group by, default contractor." },
        unit: { type: "string", description: "Optional unit code, e.g. 'm2','m3'." },
        country: { type: "string" },
        currency: { type: "string", description: "ISO, default 'AED'." },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "area_efficiency",
    description:
      "Building area-efficiency ratios from project areas: GIA/GFA and BUA/GFA efficiency, and GFA per key/unit. Filter by asset class / country. Use for 'GIA to GFA efficiency', 'area per unit', 'net-to-gross'.",
    input_schema: {
      type: "object",
      properties: {
        assetClass: { type: "string" },
        country: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "rate_distribution",
    description:
      "Full statistical spread of a material/work unit rate (min, q1, median, q3, max, count, IQR) plus a value histogram, for ONE unit — to show how tight or wide the pricing is. Use for 'distribution / spread / range of <material> rates'.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Item keywords, e.g. 'AAC block'." },
        unit: { type: "string", description: "Unit code to pin (e.g. 'm2','m3') — recommended so the spread is meaningful." },
        currency: { type: "string", description: "ISO, default 'AED'." },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "evidence",
    description:
      "Show the ACTUAL source lines behind a number — real project rows (project, description, rate, unit, year) for a material/element. Use when the user asks 'show the data / examples / which projects' or to back up a figure with citations.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Item keywords to match the line description." },
        country: { type: "string" },
        currency: { type: "string", description: "ISO, default 'AED'." },
      },
      required: ["query"],
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
    case "design_ratios":
      return designRatios(input);
    case "cost_per_key":
      return costPerKey(input);
    case "project_lookup":
      return projectLookup(input);
    case "rate_trend":
      return rateTrend(input);
    case "party_benchmark":
      return partyBenchmark(input);
    case "area_efficiency":
      return areaEfficiency(input);
    case "rate_distribution":
      return rateDistribution(input);
    case "evidence":
      return evidence(input);
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

// "UAE" and "United Arab Emirates" (plus KSA variants) exist as SEPARATE
// country labels in the warehouse, so an exact match on one spelling misses
// data stored under another. Expand a country filter to all known aliases,
// lower-cased for case-insensitive ANY() matching.
function countryAliases(input: string): string[] {
  const s = input.trim().toLowerCase();
  const groups = [
    ["uae", "united arab emirates", "u.a.e.", "emirates"],
    ["ksa", "kingdom of saudi arabia", "saudi arabia", "saudi"],
    ["qatar", "state of qatar"],
  ];
  for (const g of groups) {
    if (g.some((a) => a === s || a.includes(s) || s.includes(a))) return g;
  }
  return [s];
}

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
    baseWhere.push(`lower(ac.label) = lower($${baseParams.length})`);
  }
  if (input.country) {
    baseParams.push(countryAliases(String(input.country)));
    baseWhere.push(`lower(c.name) = ANY($${baseParams.length}::text[])`);
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
  if (input.assetClass) { params.push(String(input.assetClass)); where.push(`lower(ac.label) = lower($${params.length})`); }
  if (input.country) { params.push(countryAliases(String(input.country))); where.push(`lower(c.name) = ANY($${params.length}::text[])`); }

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

  // Nothing for that asset class / country / currency → don't dead-end. Report
  // every (assetClass, country, currency) combo that DOES have breakdown data
  // so the agent can pick the closest match instead of claiming the lib is empty.
  if (elements.length === 0) {
    const avail = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT ac.label "assetClass", c.name country, cur.iso4217 currency,
              count(DISTINCT b.project_id)::int projects
       FROM rates_fact_project_benchmark b
       JOIN rates_dim_project p ON p.id=b.project_id
       LEFT JOIN rates_dim_country c ON c.id=p.country_id
       LEFT JOIN rates_dim_asset_class ac ON ac.id=p.asset_class_id
       LEFT JOIN rates_dim_currency cur ON cur.id=p.currency_id
       WHERE b.${col} > 0 AND ac.label IS NOT NULL
       GROUP BY 1,2,3 ORDER BY projects DESC LIMIT 60`,
    );
    return {
      basis, currency,
      assetClass: input.assetClass ?? "all",
      country: input.country ?? "all",
      elements: [],
      totalPerM2: 0,
      note: "No benchmark breakdown for that asset class / country / currency. 'availableBreakdowns' lists every combination that DOES have data — pick the closest match, tell the user which one you used, and never claim the library is empty.",
      availableBreakdowns: avail.map((a) => ({
        assetClass: a.assetClass, country: a.country, currency: a.currency, projects: Number(a.projects),
      })),
    };
  }

  const total = elements.reduce((s, e) => s + (e.median ?? 0), 0);
  return {
    basis, currency,
    assetClass: input.assetClass ?? "all",
    country: input.country ?? "all",
    elements,
    totalPerM2: Math.round(total),
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

/* ───────────────── new tools (design ratios, cost/key, projects, trend) ──────────────── */

async function designRatios(input: Record<string, unknown>) {
  const where: string[] = ["dat.ratio_value IS NOT NULL", "dat.ratio_value > 0"];
  const params: unknown[] = [];
  if (input.element) {
    params.push(`%${String(input.element)}%`);
    where.push(`(n.label ILIKE $${params.length} OR n2.label ILIKE $${params.length})`);
  }
  if (input.assetClass) { params.push(String(input.assetClass)); where.push(`lower(ac.label) = lower($${params.length})`); }
  if (input.assetType) { params.push(`%${String(input.assetType)}%`); where.push(`at.label ILIKE $${params.length}`); }
  if (input.unit) { params.push(String(input.unit)); where.push(`u.code = $${params.length}`); }

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT n.label element, COALESCE(n2.label,'') sub_element, u.code unit,
            ac.label asset_class, at.label asset_type,
            percentile_cont(0.5) WITHIN GROUP (ORDER BY dat.ratio_value)::float8 median_ratio,
            count(*)::int samples
     FROM rates_fact_design_ratio_asset_type dat
     JOIN rates_fact_design_ratio dr ON dr.id = dat.ratio_id
     LEFT JOIN rates_dim_nrm_l1 n ON n.id = dr.nrm_l1_id
     LEFT JOIN rates_dim_nrm_l2 n2 ON n2.id = dr.nrm_l2_id
     LEFT JOIN rates_dim_uom u ON u.id = dr.unit_id
     LEFT JOIN rates_dim_asset_class ac ON ac.id = dat.asset_class_id
     LEFT JOIN rates_dim_asset_type at ON at.id = dat.asset_type_id
     WHERE ${where.join(" AND ")}
     GROUP BY 1,2,3,4,5 ORDER BY samples DESC LIMIT 40`,
    ...params,
  );
  if (rows.length === 0) {
    const avail = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT DISTINCT n.label element, ac.label asset_class
       FROM rates_fact_design_ratio_asset_type dat
       JOIN rates_fact_design_ratio dr ON dr.id = dat.ratio_id
       LEFT JOIN rates_dim_nrm_l1 n ON n.id = dr.nrm_l1_id
       LEFT JOIN rates_dim_asset_class ac ON ac.id = dat.asset_class_id
       WHERE dat.ratio_value > 0 ORDER BY 1 LIMIT 40`,
    );
    return { rows: 0, note: "No design ratio for that filter. 'available' lists element/asset combos that exist.", available: avail };
  }
  return {
    unit: "ratio (quantity per unit area, e.g. m²/m² of floor)",
    ratios: rows.map((r) => ({
      element: r.element, subElement: r.sub_element || undefined, unit: r.unit,
      assetClass: r.asset_class, assetType: r.asset_type,
      median: num(r.median_ratio), samples: Number(r.samples),
    })),
  };
}

async function costPerKey(input: Record<string, unknown>) {
  const currency = String(input.currency ?? "AED");
  const where: string[] = ["b.keys > 0", "b.total_cost > 0", "cur.iso4217 = $1"];
  const params: unknown[] = [currency];
  if (input.assetClass) { params.push(String(input.assetClass)); where.push(`lower(ac.label) = lower($${params.length})`); }
  if (input.country) { params.push(countryAliases(String(input.country))); where.push(`lower(c.name) = ANY($${params.length}::text[])`); }

  // Aggregate to project level first (cost per key = total project cost ÷ keys).
  const [row] = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `WITH proj AS (
       SELECT b.project_id, max(b.keys) keys, sum(b.total_cost) total
       FROM rates_fact_project_benchmark b
       JOIN rates_dim_project p ON p.id = b.project_id
       LEFT JOIN rates_dim_country c ON c.id = p.country_id
       LEFT JOIN rates_dim_asset_class ac ON ac.id = p.asset_class_id
       LEFT JOIN rates_dim_currency cur ON cur.id = p.currency_id
       WHERE ${where.join(" AND ")}
       GROUP BY b.project_id
     )
     SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY total/keys)::float8 median,
            percentile_cont(0.25) WITHIN GROUP (ORDER BY total/keys)::float8 q1,
            percentile_cont(0.75) WITHIN GROUP (ORDER BY total/keys)::float8 q3,
            min(total/keys)::float8 min, max(total/keys)::float8 max,
            count(*)::int projects
     FROM proj`,
    ...params,
  );
  const projects = Number(row?.projects ?? 0);
  if (!projects) {
    return { projects: 0, currency, note: "No keyed projects for that filter — the library has no cost-per-key data for this. Don't invent one." };
  }
  return {
    currency,
    unit: `${currency} per key/unit`,
    assetClass: input.assetClass ?? "all",
    country: input.country ?? "all",
    median: Math.round(num(row?.median) ?? 0),
    q1: Math.round(num(row?.q1) ?? 0),
    q3: Math.round(num(row?.q3) ?? 0),
    min: Math.round(num(row?.min) ?? 0),
    max: Math.round(num(row?.max) ?? 0),
    projects,
  };
}

const PROJECT_SELECT = `p.name,
    c.name country, ci.name city, ac.label asset_class, at.label asset_type,
    ct.name contractor, e.name employer, cont.label contract_type, st.label status,
    p.bua_m2, p.gia_m2, p.gfa_m2, p.keys,
    to_char(p.base_date,'YYYY') base_year, p.procurement,
    (SELECT round(percentile_cont(0.5) WITHIN GROUP (ORDER BY b.cost_per_gia))
       FROM rates_fact_project_benchmark b WHERE b.project_id = p.id AND b.cost_per_gia > 0) cost_per_gia
  FROM rates_dim_project p
  LEFT JOIN rates_dim_country c ON c.id = p.country_id
  LEFT JOIN rates_dim_city ci ON ci.id = p.city_id
  LEFT JOIN rates_dim_asset_class ac ON ac.id = p.asset_class_id
  LEFT JOIN rates_dim_asset_type at ON at.id = p.asset_type_id
  LEFT JOIN rates_dim_contractor ct ON ct.id = p.contractor_id
  LEFT JOIN rates_dim_employer e ON e.id = p.employer_id
  LEFT JOIN rates_dim_contract_type cont ON cont.id = p.contract_type_id
  LEFT JOIN rates_dim_status st ON st.id = p.status_id`;

function mapProject(r: Record<string, unknown>) {
  return {
    name: r.name, country: r.country, city: r.city,
    assetClass: r.asset_class, assetType: r.asset_type,
    contractor: r.contractor, employer: r.employer,
    contractType: r.contract_type, status: r.status,
    buaM2: num(r.bua_m2), giaM2: num(r.gia_m2), gfaM2: num(r.gfa_m2), keys: num(r.keys),
    baseYear: r.base_year, procurement: r.procurement,
    costPerGiaAed: num(r.cost_per_gia),
  };
}

async function projectLookup(input: Record<string, unknown>) {
  const names = Array.isArray(input.names) ? (input.names as string[]).slice(0, 2) : null;
  if (names && names.length === 2) {
    const out = [];
    for (const name of names) {
      const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
        `SELECT ${PROJECT_SELECT} WHERE p.name ILIKE $1 ORDER BY p.gia_m2 DESC NULLS LAST LIMIT 1`,
        `%${name}%`,
      );
      out.push(rows[0] ? mapProject(rows[0]) : { query: name, note: "no match" });
    }
    return { compare: out };
  }
  const q = String(input.query ?? "").trim();
  if (!q) return { rows: 0, note: "provide a project name to look up" };
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT ${PROJECT_SELECT} WHERE p.name ILIKE $1 ORDER BY p.gia_m2 DESC NULLS LAST LIMIT 8`,
    `%${q}%`,
  );
  if (rows.length === 0) return { rows: 0, note: `No project matching "${q}". Don't invent one.` };
  return { matches: rows.length, projects: rows.map(mapProject) };
}

async function rateTrend(input: Record<string, unknown>) {
  const currency = String(input.currency ?? "AED");
  const words = String(input.query ?? "").trim().split(/\s+/).filter(Boolean).slice(0, 6);
  if (!words.length) return { rows: 0, note: "empty query" };

  const where: string[] = ["ri.rate > 0", "ri.base_date IS NOT NULL", "cur.iso4217 = $1"];
  const params: unknown[] = [currency];
  for (const w of words) {
    params.push(`%${w}%`);
    where.push(`ri.description ILIKE $${params.length}`);
  }
  if (input.unit) { params.push(String(input.unit)); where.push(`u.code = $${params.length}`); }

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT EXTRACT(YEAR FROM ri.base_date)::int AS "year",
            percentile_cont(0.5) WITHIN GROUP (ORDER BY ri.rate)::float8 median,
            count(*)::int rows
     FROM rates_fact_rate_item ri
     LEFT JOIN rates_dim_uom u ON u.id = ri.unit_id
     LEFT JOIN rates_dim_currency cur ON cur.id = ri.currency_id
     WHERE ${where.join(" AND ")}
     GROUP BY 1 ORDER BY 1`,
    ...params,
  );
  const series = rows.map((r) => ({ year: Number(r.year), median: num(r.median), rows: Number(r.rows) }));
  const total = series.reduce((s, p) => s + p.rows, 0);
  if (total === 0) {
    return { rows: 0, query: words.join(" "), currency, note: "No dated priced lines for this — the library has no time series for it." };
  }
  const first = series[0], last = series[series.length - 1];
  const changePct =
    first?.median && last?.median ? Math.round(((last.median - first.median) / first.median) * 1000) / 10 : null;
  return {
    query: words.join(" "),
    currency,
    series,
    totalRows: total,
    changePct,
    note: changePct != null ? `Median moved ${changePct}% from ${first.year} to ${last.year} (chart with rate_trend series).` : undefined,
  };
}

/** Keyword ILIKE clauses on the rate-item description, into the given arrays. */
function descWhere(query: unknown, where: string[], params: unknown[]) {
  const words = String(query ?? "").trim().split(/\s+/).filter(Boolean).slice(0, 6);
  for (const w of words) {
    params.push(`%${w}%`);
    where.push(`ri.description ILIKE $${params.length}`);
  }
  return words;
}

async function partyBenchmark(input: Record<string, unknown>) {
  const currency = String(input.currency ?? "AED");
  const by = input.by === "employer" ? "employer" : "contractor";
  const partyTable = by === "employer" ? "rates_dim_employer" : "rates_dim_contractor";
  const partyCol = by === "employer" ? "employer_id" : "contractor_id";

  const where: string[] = ["ri.rate > 0", "cur.iso4217 = $1", "party.name IS NOT NULL"];
  const params: unknown[] = [currency];
  const words = descWhere(input.query, where, params);
  if (!words.length) return { rows: 0, note: "empty query" };
  if (input.unit) { params.push(String(input.unit)); where.push(`u.code = $${params.length}`); }
  if (input.country) { params.push(countryAliases(String(input.country))); where.push(`lower(c.name) = ANY($${params.length}::text[])`); }

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT party.name party, COALESCE(u.code,'') unit,
            percentile_cont(0.5) WITHIN GROUP (ORDER BY ri.rate)::float8 median,
            count(*)::int rows
     FROM rates_fact_rate_item ri
     JOIN rates_dim_project p ON p.id = ri.project_id
     JOIN ${partyTable} party ON party.id = p.${partyCol}
     LEFT JOIN rates_dim_uom u ON u.id = ri.unit_id
     LEFT JOIN rates_dim_currency cur ON cur.id = ri.currency_id
     LEFT JOIN rates_dim_country c ON c.id = p.country_id
     WHERE ${where.join(" AND ")}
     GROUP BY party.name, u.code HAVING count(*) >= 3
     ORDER BY median ASC LIMIT 20`,
    ...params,
  );
  if (!rows.length) return { rows: 0, query: words.join(" "), by, note: `No priced lines for that item by ${by}.` };
  return {
    query: words.join(" "), by, currency,
    note: "Compare WITHIN a unit; medians across different units are not comparable.",
    parties: rows.map((r) => ({ party: r.party, unit: r.unit, median: num(r.median), rows: Number(r.rows) })),
  };
}

async function areaEfficiency(input: Record<string, unknown>) {
  const where: string[] = ["p.gfa_m2 > 0"];
  const params: unknown[] = [];
  if (input.assetClass) { params.push(String(input.assetClass)); where.push(`lower(ac.label) = lower($${params.length})`); }
  if (input.country) { params.push(countryAliases(String(input.country))); where.push(`lower(c.name) = ANY($${params.length}::text[])`); }

  const [r] = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY p.gia_m2/NULLIF(p.gfa_m2,0))::float8 gia_gfa,
            percentile_cont(0.5) WITHIN GROUP (ORDER BY p.bua_m2/NULLIF(p.gfa_m2,0))::float8 bua_gfa,
            percentile_cont(0.5) WITHIN GROUP (ORDER BY p.gfa_m2/NULLIF(p.keys,0)) FILTER (WHERE p.keys > 0)::float8 gfa_per_key,
            count(*)::int projects
     FROM rates_dim_project p
     LEFT JOIN rates_dim_asset_class ac ON ac.id = p.asset_class_id
     LEFT JOIN rates_dim_country c ON c.id = p.country_id
     WHERE ${where.join(" AND ")}`,
    ...params,
  );
  const projects = Number(r?.projects ?? 0);
  if (!projects) return { projects: 0, note: "No projects with area data for that filter." };
  const r2 = (v: unknown) => (num(v) == null ? null : Math.round((num(v) as number) * 100) / 100);
  return {
    projects,
    assetClass: input.assetClass ?? "all",
    country: input.country ?? "all",
    giaToGfa: r2(r?.gia_gfa),
    buaToGfa: r2(r?.bua_gfa),
    gfaPerKey: num(r?.gfa_per_key) == null ? null : Math.round(num(r?.gfa_per_key) as number),
    note: "Medians of project areas: GIA/GFA & BUA/GFA net-to-gross efficiency, and GFA per key/unit.",
  };
}

async function rateDistribution(input: Record<string, unknown>) {
  const currency = String(input.currency ?? "AED");
  const baseWhere: string[] = ["ri.rate > 0", "cur.iso4217 = $1"];
  const baseParams: unknown[] = [currency];
  const words = descWhere(input.query, baseWhere, baseParams);
  if (!words.length) return { rows: 0, note: "empty query" };

  const FROM = `FROM rates_fact_rate_item ri
    LEFT JOIN rates_dim_uom u ON u.id = ri.unit_id
    LEFT JOIN rates_dim_currency cur ON cur.id = ri.currency_id`;

  // Pin a unit (given, else the most common one) so the spread is meaningful.
  let unit = input.unit ? String(input.unit) : null;
  if (!unit) {
    const [top] = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT u.code, count(*)::int n ${FROM} WHERE ${baseWhere.join(" AND ")} GROUP BY 1 ORDER BY 2 DESC LIMIT 1`,
      ...baseParams,
    );
    unit = (top?.code as string) ?? null;
  }
  const where = [...baseWhere];
  const params = [...baseParams];
  if (unit) { params.push(unit); where.push(`u.code = $${params.length}`); }

  const [s] = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT min(ri.rate)::float8 min,
            percentile_cont(0.25) WITHIN GROUP (ORDER BY ri.rate)::float8 q1,
            percentile_cont(0.5) WITHIN GROUP (ORDER BY ri.rate)::float8 median,
            percentile_cont(0.75) WITHIN GROUP (ORDER BY ri.rate)::float8 q3,
            max(ri.rate)::float8 max, avg(ri.rate)::float8 mean, count(*)::int rows
     ${FROM} WHERE ${where.join(" AND ")}`,
    ...params,
  );
  const rows = Number(s?.rows ?? 0);
  if (!rows) return { rows: 0, query: words.join(" "), note: "No priced lines for that item." };

  const mn = num(s?.min) as number, mx = num(s?.max) as number;
  let histogram: { from: number; to: number; count: number }[] = [];
  if (mx > mn) {
    const hp = [...params, mn, mx];
    const buckets = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT width_bucket(ri.rate, $${params.length + 1}, $${params.length + 2}, 8) b, count(*)::int n
       ${FROM} WHERE ${where.join(" AND ")} GROUP BY 1 ORDER BY 1`,
      ...hp,
    );
    const step = (mx - mn) / 8;
    histogram = buckets
      .filter((r) => Number(r.b) >= 1 && Number(r.b) <= 8)
      .map((r) => {
        const b = Number(r.b);
        return { from: Math.round(mn + (b - 1) * step), to: Math.round(mn + b * step), count: Number(r.n) };
      });
  }
  return {
    query: words.join(" "), currency, unit: unit ?? "(mixed)", rows,
    min: Math.round(mn), q1: Math.round(num(s?.q1) ?? 0), median: Math.round(num(s?.median) ?? 0),
    q3: Math.round(num(s?.q3) ?? 0), max: Math.round(mx), mean: Math.round(num(s?.mean) ?? 0),
    iqr: Math.round((num(s?.q3) ?? 0) - (num(s?.q1) ?? 0)),
    histogram,
  };
}

async function evidence(input: Record<string, unknown>) {
  const currency = String(input.currency ?? "AED");
  const where: string[] = ["ri.rate > 0", "cur.iso4217 = $1"];
  const params: unknown[] = [currency];
  const words = descWhere(input.query, where, params);
  if (!words.length) return { rows: 0, note: "empty query" };
  if (input.country) { params.push(countryAliases(String(input.country))); where.push(`lower(c.name) = ANY($${params.length}::text[])`); }

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT p.name project, c.name country, ri.description, ri.rate::float8 rate,
            COALESCE(u.code,'') unit, to_char(ri.base_date,'YYYY') AS "year"
     FROM rates_fact_rate_item ri
     JOIN rates_dim_project p ON p.id = ri.project_id
     LEFT JOIN rates_dim_uom u ON u.id = ri.unit_id
     LEFT JOIN rates_dim_currency cur ON cur.id = ri.currency_id
     LEFT JOIN rates_dim_country c ON c.id = p.country_id
     WHERE ${where.join(" AND ")}
     ORDER BY ri.rate LIMIT 10`,
    ...params,
  );
  if (!rows.length) return { rows: 0, query: words.join(" "), note: "No source lines for that." };
  return {
    query: words.join(" "), currency, count: rows.length,
    samples: rows.map((r) => ({
      project: r.project, country: r.country, description: r.description,
      rate: num(r.rate), unit: r.unit, year: r.year,
    })),
  };
}
