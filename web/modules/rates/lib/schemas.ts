/**
 * Schemas describe the columns for each (Section, Tab) pair.
 * Every column has a `type` that drives rendering and value coercion,
 * and `aliases` that drive matching when an Excel/CSV file is uploaded.
 *
 * Headers were inferred from the real .xlsx files in /Data.
 */

export type ColumnType =
  | "text"
  | "number"
  | "money"
  | "year"
  | "status"
  | "ratio"
  | "section"
  | "description"
  | "currency"
  | "unit";

export type Column = {
  key: string;
  label: string;
  width: number;
  align?: "left" | "right";
  type: ColumnType;
  aliases?: string[];
};

export type Schema = {
  section: string;
  tab: string;
  columns: Column[];
};

/* ---------- shared column packs ---------- */

const refCol: Column = {
  key: "ref",
  label: "Ref",
  width: 80,
  type: "text",
  aliases: ["ref", "reference", "id"],
};

const identityCols: Column[] = [
  { key: "country", label: "Country", width: 110, type: "text", aliases: ["country"] },
  { key: "city", label: "City", width: 100, type: "text", aliases: ["city"] },
  { key: "asset", label: "Asset", width: 120, type: "text", aliases: ["asset", "asset lvl 1"] },
  { key: "project", label: "Project", width: 200, type: "text", aliases: ["project", "project lvl 1"] },
  { key: "type", label: "Type", width: 130, type: "text", aliases: ["type"] },
  { key: "employer", label: "Employer", width: 120, type: "text", aliases: ["employer", "client", "developer"] },
  { key: "contractor", label: "Contractor", width: 140, type: "text", aliases: ["contractor", "main contractor"] },
  { key: "status", label: "Status", width: 90, type: "status", aliases: ["status"] },
];

const benchmarkIdentityCols: Column[] = [
  { key: "asset", label: "Asset", width: 130, type: "text", aliases: ["asset", "asset lvl 1"] },
  { key: "country", label: "Country", width: 110, type: "text", aliases: ["country"] },
  { key: "city", label: "City", width: 100, type: "text", aliases: ["city"] },
  { key: "area", label: "Area", width: 130, type: "text", aliases: ["area"] },
  { key: "project", label: "Project", width: 200, type: "text", aliases: ["project", "project lvl 1", "alias"] },
  { key: "employer", label: "Employer", width: 120, type: "text", aliases: ["employer", "client", "developer"] },
  { key: "contractor", label: "Contractor", width: 130, type: "text", aliases: ["contractor"] },
  { key: "status", label: "Status", width: 90, type: "status", aliases: ["status"] },
];

const contractCols: Column[] = [
  { key: "baseDate", label: "Base Date", width: 90, type: "year", align: "right", aliases: ["base date", "basedate", "year"] },
  { key: "contractType", label: "Contract", width: 130, type: "text", aliases: ["contract type", "contract", "procurement"] },
];

const priceCols: Column[] = [
  { key: "description", label: "Description", width: 360, type: "description", aliases: ["description", "item description"] },
  { key: "quantity", label: "Quantity", width: 100, type: "number", align: "right", aliases: ["quantity", "qty"] },
  { key: "unit", label: "Unit", width: 70, type: "unit", aliases: ["unit", "uom"] },
  { key: "currency", label: "Currency", width: 80, type: "currency", aliases: ["currency", "ccy"] },
  { key: "rate", label: "Rate", width: 110, type: "money", align: "right", aliases: ["rate", "unit rate", "price"] },
];

/* ---------- helpers ---------- */

function compose(...packs: (Column | Column[])[]): Column[] {
  return packs.flatMap((p) => (Array.isArray(p) ? p : [p]));
}

/* ---------- POMI variants (Buildings, Public Realm, Ground Investigation, Piling) ---------- */

const pomiCols: Column[] = [
  { key: "pomiSection", label: "POMI Section", width: 170, type: "section", aliases: ["pomi section", "pomi", "section"] },
  { key: "pomiSubSection", label: "POMI Sub Section", width: 160, type: "text", aliases: ["pomi sub section", "pomi subsection", "sub section", "subsection"] },
];

/* ---------- CESMM variants (Infrastructure, Marine) ---------- */

const cesmmCols: Column[] = [
  { key: "element", label: "Element", width: 150, type: "section", aliases: ["element"] },
  { key: "cesmmReference", label: "CESMM Ref", width: 110, type: "text", aliases: ["cesmm reference", "cesmm ref", "cesmm"] },
];

/* ---------- Benchmark column packs ---------- */

const buildingBenchmarkCols: Column[] = [
  { key: "bua", label: "BUA (m²)", width: 110, type: "number", align: "right", aliases: ["bua", "built up area"] },
  { key: "gia", label: "GIA (m²)", width: 110, type: "number", align: "right", aliases: ["gia"] },
  { key: "gfa", label: "GFA (m²)", width: 110, type: "number", align: "right", aliases: ["gfa"] },
  { key: "keys", label: "Keys", width: 80, type: "number", align: "right", aliases: ["keys"] },
  { key: "nrm", label: "NRM Lvl 1", width: 130, type: "section", aliases: ["nrm lvl 1", "nrm", "nrm level 1"] },
  // Aggregate benchmark fields (present in "Data" sheet of Building Benchmarks)
  { key: "currency", label: "Currency", width: 80, type: "currency", aliases: ["currency"] },
  { key: "totalCost", label: "Total Cost", width: 130, type: "money", align: "right", aliases: ["total cost"] },
  { key: "costBua", label: "Cost / BUA", width: 110, type: "money", align: "right", aliases: ["cost/bua", "cost per bua"] },
  { key: "costGia", label: "Cost / GIA", width: 110, type: "money", align: "right", aliases: ["cost/gia", "cost per gia"] },
  // Line-level benchmark fields (present in "Rates" sheet of Building Benchmarks)
  { key: "description", label: "Description", width: 280, type: "description", aliases: ["description"] },
  { key: "quantity", label: "Quantity", width: 90, type: "number", align: "right", aliases: ["quantity"] },
  { key: "unit", label: "Unit", width: 60, type: "unit", aliases: ["unit"] },
  { key: "contractRate", label: "Contract Rate", width: 110, type: "money", align: "right", aliases: ["contract rate"] },
  { key: "avgTenderRate", label: "Avg Tender Rate", width: 120, type: "money", align: "right", aliases: ["average tender rate", "avg tender rate"] },
];

const infraBenchmarkCols: Column[] = [
  { key: "contract", label: "Contract", width: 120, type: "text", aliases: ["contract"] },
  { key: "rowArea", label: "ROW Area (m²)", width: 120, type: "number", align: "right", aliases: ["right of way area", "row area"] },
  { key: "gla", label: "GLA (m²)", width: 100, type: "number", align: "right", aliases: ["gla"] },
  { key: "gfa", label: "GFA (m²)", width: 100, type: "number", align: "right", aliases: ["gfa"] },
  { key: "element", label: "Element", width: 140, type: "section", aliases: ["element"] },
  { key: "totalCost", label: "Total Cost", width: 130, type: "money", align: "right", aliases: ["total cost"] },
  { key: "rowRate", label: "ROW Rate", width: 100, type: "money", align: "right", aliases: ["row rate"] },
  { key: "glaRate", label: "GLA Rate", width: 100, type: "money", align: "right", aliases: ["gla rate"] },
  { key: "gfaRate", label: "GFA Rate", width: 100, type: "money", align: "right", aliases: ["gfa rate"] },
  { key: "far", label: "FAR", width: 70, type: "ratio", align: "right", aliases: ["far", "far (gfa/gla)", "floor area ratio"] },
  { key: "rowGla", label: "ROW/GLA", width: 80, type: "ratio", align: "right", aliases: ["row/gla", "row gla"] },
  { key: "year", label: "Year", width: 70, type: "year", align: "right", aliases: ["year"] },
];

const publicRealmBenchmarkCols: Column[] = [
  { key: "contract", label: "Contract", width: 120, type: "text", aliases: ["contract"] },
  { key: "parkArea", label: "Park Area (m²)", width: 130, type: "number", align: "right", aliases: ["parks", "park area", "area"] },
  { key: "element", label: "Element", width: 140, type: "section", aliases: ["element"] },
  { key: "totalCost", label: "Total Cost", width: 130, type: "money", align: "right", aliases: ["total cost"] },
  { key: "rate", label: "Rate", width: 100, type: "money", align: "right", aliases: ["rate", "park rate"] },
  { key: "year", label: "Year", width: 70, type: "year", align: "right", aliases: ["year"] },
];

const stadiumBenchmarkCols: Column[] = [
  { key: "capacity", label: "Capacity (seats)", width: 130, type: "number", align: "right", aliases: ["capacity"] },
  { key: "currency", label: "Currency", width: 80, type: "currency", aliases: ["currency"] },
  { key: "cost", label: "Cost", width: 140, type: "money", align: "right", aliases: ["cost", "total cost"] },
  { key: "costPerSeat", label: "Cost / Seat", width: 110, type: "money", align: "right", aliases: ["cost/seat", "cost per seat"] },
  { key: "year", label: "Year", width: 70, type: "year", align: "right", aliases: ["base date", "year"] },
];

const mepBenchmarkCols: Column[] = [
  { key: "element", label: "MEP Element", width: 170, type: "section", aliases: ["element", "elemental breakdown"] },
  { key: "totalCost", label: "Total Cost", width: 130, type: "money", align: "right", aliases: ["total cost", "aed"] },
  { key: "costPerGia", label: "Cost / m² (GIA)", width: 130, type: "money", align: "right", aliases: ["aed / m2 (gia)", "cost per gia"] },
  { key: "gia", label: "GIA (m²)", width: 100, type: "number", align: "right", aliases: ["gia"] },
  { key: "year", label: "Year", width: 70, type: "year", align: "right", aliases: ["base date", "year"] },
];

const materialsCols: Column[] = [
  { key: "category", label: "Category", width: 140, type: "section", aliases: ["category"] },
  { key: "material", label: "Material", width: 220, type: "text", aliases: ["material", "description", "item"] },
  { key: "spec", label: "Specification", width: 200, type: "text", aliases: ["specification", "spec"] },
  { key: "unit", label: "Unit", width: 80, type: "unit", aliases: ["unit", "uom"] },
  { key: "currency", label: "Currency", width: 80, type: "currency", aliases: ["currency"] },
  { key: "rate", label: "Rate", width: 110, type: "money", align: "right", aliases: ["rate", "price", "average price"] },
  { key: "year", label: "Year", width: 70, type: "year", align: "right", aliases: ["year"] },
];

const commoditiesCols: Column[] = [
  { key: "commodity", label: "Commodity", width: 220, type: "text", aliases: ["commodity", "material", "description"] },
  { key: "region", label: "Region", width: 120, type: "text", aliases: ["region", "market"] },
  { key: "unit", label: "Unit", width: 80, type: "unit", aliases: ["unit"] },
  { key: "currency", label: "Currency", width: 80, type: "currency", aliases: ["currency"] },
  { key: "rate", label: "Rate", width: 110, type: "money", align: "right", aliases: ["rate", "price"] },
  { key: "year", label: "Year", width: 70, type: "year", align: "right", aliases: ["year"] },
];

const pilingExtraCols: Column[] = [
  { key: "pileType", label: "Pile Type", width: 130, type: "text", aliases: ["pile type", "type"] },
  { key: "diameter", label: "Diameter", width: 90, type: "text", aliases: ["diameter", "dia"] },
  { key: "depth", label: "Depth", width: 80, type: "text", aliases: ["depth"] },
];

/* ---------- Section → Tab → Schema ---------- */

export const SECTIONS: { label: string; tabs: string[] }[] = [
  { label: "Buildings", tabs: ["Rates", "Benchmarks", "Design Ratios", "MEP Benchmarks"] },
  { label: "Infrastructure", tabs: ["Rates & Benchmarks", "Benchmarks"] },
  { label: "Industrial", tabs: ["Benchmarks"] },
  { label: "Utility Buildings", tabs: ["Rates"] },
  { label: "Public Realm", tabs: ["Rates", "Benchmarks"] },
  { label: "Marine", tabs: ["Rates"] },
  { label: "Piling", tabs: ["Rates", "Framework Rates"] },
  { label: "Ground Investigation", tabs: ["Rates"] },
  { label: "Stadium", tabs: ["Benchmarks"] },
  { label: "Materials", tabs: ["Materials", "Commodities"] },
  { label: "Market Testing Log", tabs: [] },
];

export const SCHEMAS: Record<string, Schema> = {
  // ---------------- Buildings ----------------
  "Buildings :: Rates": {
    section: "Buildings",
    tab: "Rates",
    columns: compose(refCol, identityCols, contractCols, pomiCols, priceCols),
  },
  "Buildings :: Benchmarks": {
    section: "Buildings",
    tab: "Benchmarks",
    columns: [
      { key: "asset", label: "Asset", width: 130, type: "text", aliases: ["asset", "asset lvl 1", "asset lvl 2", "asset lvl 3"] },
      { key: "country", label: "Country", width: 110, type: "text", aliases: ["country"] },
      { key: "city", label: "City", width: 110, type: "text", aliases: ["city"] },
      { key: "aliasLvl1", label: "Project Alias Lvl 1", width: 160, type: "text", aliases: ["project alias lvl 1", "alias lvl 1", "alias"] },
      { key: "projectLvl1", label: "Project Lvl 1", width: 170, type: "text", aliases: ["project lvl 1"] },
      { key: "project", label: "Project", width: 200, type: "text", aliases: ["project", "project lvl 2"] },
      { key: "baseDate", label: "Base Date", width: 90, type: "year", align: "right", aliases: ["base date", "year"] },
      { key: "contractor", label: "Contractor", width: 140, type: "text", aliases: ["contractor"] },
      { key: "status", label: "Status", width: 90, type: "status", aliases: ["status"] },
      { key: "procurement", label: "Procurement", width: 130, type: "text", aliases: ["procurement"] },
      { key: "contractType", label: "Contract Type", width: 140, type: "text", aliases: ["contract type", "contract"] },
      { key: "bua", label: "BUA (m²)", width: 110, type: "number", align: "right", aliases: ["bua", "bua (m2)", "built up area"] },
      { key: "gia", label: "GIA (m²)", width: 110, type: "number", align: "right", aliases: ["gia", "gia (m2)"] },
      { key: "gfa", label: "GFA (m²)", width: 110, type: "number", align: "right", aliases: ["gfa", "gfa (m2)"] },
      { key: "keys", label: "Keys", width: 80, type: "number", align: "right", aliases: ["keys"] },
      { key: "nrm", label: "NRM Lvl 1", width: 150, type: "section", aliases: ["nrm lvl 1", "nrm", "nrm level 1"] },
      { key: "currency", label: "Currency", width: 80, type: "currency", aliases: ["currency"] },
      { key: "totalCost", label: "Total Cost", width: 140, type: "money", align: "right", aliases: ["total cost"] },
      { key: "costBua", label: "Cost / BUA", width: 130, type: "money", align: "right", aliases: ["cost/bua", "cost/bua (aed/m2)", "cost per bua"] },
      { key: "costGia", label: "Cost / GIA", width: 130, type: "money", align: "right", aliases: ["cost/gia", "cost/gia (aed/m2)", "cost per gia"] },
      { key: "costGfa", label: "Cost / GFA", width: 130, type: "money", align: "right", aliases: ["cost/gfa", "cost/gfa (aed/m2)", "cost per gfa"] },
    ],
  },
  "Buildings :: Design Ratios": {
    section: "Buildings",
    tab: "Design Ratios",
    columns: compose(
      refCol,
      { key: "l1Code", label: "L1 Code", width: 90, type: "text", aliases: ["l1 code"] },
      { key: "l1Name", label: "L1 Name", width: 170, type: "section", aliases: ["l1 name"] },
      { key: "l2Code", label: "L2 Code", width: 90, type: "text", aliases: ["l2 code"] },
      { key: "l2Name", label: "L2 Name", width: 220, type: "text", aliases: ["l2 name"] },
      { key: "l2l3Code", label: "L2/L3 Code", width: 90, type: "text", aliases: ["l2/l3 code", "l2 l3 code"] },
      { key: "csi", label: "CSI Coding", width: 230, type: "description", aliases: ["construction specification institute (csi) coding", "csi coding", "csi"] },
      { key: "units", label: "Units", width: 70, type: "unit", aliases: ["units", "unit"] },
      // Asset-type columns (quantity ratio per m² BUA)
      { key: "resHighSteel", label: "Res · High · Steel", width: 130, type: "ratio", align: "right", aliases: ["residential - high  - steel", "residential - high - steel"] },
      { key: "resHighConc", label: "Res · High · Concrete", width: 140, type: "ratio", align: "right", aliases: ["residential - high  - concrete", "residential - high - concrete"] },
      { key: "resMedConc", label: "Res · Med · Concrete", width: 140, type: "ratio", align: "right", aliases: ["residential - medium - concrete"] },
      { key: "hospHighConc", label: "Hosp · High · Concrete", width: 150, type: "ratio", align: "right", aliases: ["hospitality - high  - concrete", "hospitality - high - concrete"] },
      { key: "offHighSteel", label: "Office · High · Steel", width: 140, type: "ratio", align: "right", aliases: ["office - high  - steel", "office - high - steel"] },
      { key: "offMedConc", label: "Office · Med · Concrete", width: 150, type: "ratio", align: "right", aliases: ["office - medium - concrete"] },
      { key: "offLowConc", label: "Office · Low · Concrete", width: 150, type: "ratio", align: "right", aliases: ["office - low - concrete"] },
      { key: "mixHighConc", label: "Mixed · High · Concrete", width: 150, type: "ratio", align: "right", aliases: ["mixed - high  - concrete", "mixed - high - concrete"] },
      { key: "mixMedConc", label: "Mixed · Med · Concrete", width: 150, type: "ratio", align: "right", aliases: ["mixed - medium - concrete"] },
      { key: "eduLowConc", label: "Edu · Low · Concrete", width: 140, type: "ratio", align: "right", aliases: ["education - low - concrete"] },
      { key: "retailLowConc", label: "Retail · Low · Concrete", width: 150, type: "ratio", align: "right", aliases: ["retail - low - concrete"] }
    ),
  },
  "Buildings :: MEP Benchmarks": {
    section: "Buildings",
    tab: "MEP Benchmarks",
    columns: compose(refCol, benchmarkIdentityCols, mepBenchmarkCols),
  },

  // ---------------- Infrastructure ----------------
  "Infrastructure :: Rates & Benchmarks": {
    section: "Infrastructure",
    tab: "Rates & Benchmarks",
    columns: compose(refCol, identityCols, contractCols, cesmmCols, priceCols),
  },
  "Infrastructure :: Benchmarks": {
    section: "Infrastructure",
    tab: "Benchmarks",
    columns: compose(refCol, benchmarkIdentityCols, infraBenchmarkCols),
  },

  // ---------------- Industrial ----------------
  "Industrial :: Benchmarks": {
    section: "Industrial",
    tab: "Benchmarks",
    columns: compose(refCol, benchmarkIdentityCols, contractCols, buildingBenchmarkCols, {
      key: "year",
      label: "Year",
      width: 70,
      type: "year",
      align: "right",
      aliases: ["year", "base date"],
    }),
  },

  // ---------------- Utility Buildings ----------------
  "Utility Buildings :: Rates": {
    section: "Utility Buildings",
    tab: "Rates",
    columns: compose(
      refCol,
      identityCols,
      contractCols,
      { key: "element", label: "Element", width: 150, type: "section", aliases: ["element", "utility type"] },
      priceCols
    ),
  },

  // ---------------- Public Realm ----------------
  "Public Realm :: Rates": {
    section: "Public Realm",
    tab: "Rates",
    columns: compose(refCol, identityCols, contractCols, pomiCols, priceCols),
  },
  "Public Realm :: Benchmarks": {
    section: "Public Realm",
    tab: "Benchmarks",
    columns: compose(refCol, benchmarkIdentityCols, publicRealmBenchmarkCols),
  },

  // ---------------- Marine ----------------
  "Marine :: Rates": {
    section: "Marine",
    tab: "Rates",
    columns: compose(refCol, identityCols, contractCols, cesmmCols, priceCols),
  },

  // ---------------- Piling ----------------
  "Piling :: Rates": {
    section: "Piling",
    tab: "Rates",
    columns: compose(refCol, identityCols, contractCols, pomiCols, pilingExtraCols, priceCols),
  },
  "Piling :: Framework Rates": {
    section: "Piling",
    tab: "Framework Rates",
    columns: compose(
      refCol,
      identityCols,
      contractCols,
      pomiCols,
      { key: "description", label: "Description", width: 320, type: "description", aliases: ["description"] },
      { key: "unit", label: "Unit", width: 70, type: "unit", aliases: ["unit"] },
      { key: "currency", label: "Currency", width: 80, type: "currency", aliases: ["currency"] },
      { key: "rate1", label: "Rate 1", width: 90, type: "money", align: "right", aliases: ["rate 1"] },
      { key: "rate2", label: "Rate 2", width: 90, type: "money", align: "right", aliases: ["rate 2"] },
      { key: "rate3", label: "Rate 3", width: 90, type: "money", align: "right", aliases: ["rate 3"] },
      { key: "rate4", label: "Rate 4", width: 90, type: "money", align: "right", aliases: ["rate 4"] },
      { key: "rate5", label: "Rate 5", width: 90, type: "money", align: "right", aliases: ["rate 5"] },
      { key: "rate6", label: "Rate 6", width: 90, type: "money", align: "right", aliases: ["rate 6"] },
      { key: "meanRate", label: "Mean Rate", width: 100, type: "money", align: "right", aliases: ["mean rate"] },
      { key: "inflationRate", label: "Inflation", width: 90, type: "ratio", align: "right", aliases: ["inflation rate", "inflation"] }
    ),
  },

  // ---------------- Ground Investigation ----------------
  "Ground Investigation :: Rates": {
    section: "Ground Investigation",
    tab: "Rates",
    columns: compose(refCol, identityCols, contractCols, pomiCols, priceCols),
  },

  // ---------------- Stadium ----------------
  "Stadium :: Benchmarks": {
    section: "Stadium",
    tab: "Benchmarks",
    columns: compose(refCol, benchmarkIdentityCols, stadiumBenchmarkCols),
  },

  // ---------------- Materials ----------------
  "Materials :: Materials": {
    section: "Materials",
    tab: "Materials",
    columns: compose(refCol, materialsCols),
  },
  "Materials :: Commodities": {
    section: "Materials",
    tab: "Commodities",
    columns: compose(refCol, commoditiesCols),
  },
};

export function schemaKey(section: string, tab: string): string {
  return `${section} :: ${tab}`;
}

export function getSchema(section: string, tab: string): Schema | null {
  return SCHEMAS[schemaKey(section, tab)] ?? null;
}

export function getTabs(section: string): string[] {
  return SECTIONS.find((s) => s.label === section)?.tabs ?? [];
}
