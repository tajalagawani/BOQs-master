// Build a styled .xlsx that REBUILDS the original BOQ structure (one worksheet
// per original sheet, items under their original headings) with POMI columns
// added — not a single flattened table.

import ExcelJS from "exceljs";

import { nrmInfo } from "@/lib/nrm/nrm-map";

export type ExportRow = {
  index: number;
  sheet: string;
  ref: string;
  description: string;
  unit: string;
  quantity: number | null;
  rate: number | null;
  amount: number | null;
  code: string;
  section: string;
  code1?: string;
  code2?: string;
  code3?: string;
  code4?: string;
  p1name?: string;
  p2name?: string;
  p3name?: string;
  p4name?: string;
  sub_section?: string;
  pomi_desc?: string;
  nrm_code: string;
  nrm_desc?: string;
  method: string;
  confidence?: number | null;
  needs_review: boolean;
  section_context?: string;
};

const SECTION_TINT: Record<string, string> = {
  A: "FFE2E8F0", B: "FFFEF3C7", C: "FFE7E5E4", D: "FFFEE2E2", E: "FFE0E7FF",
  F: "FFFEF9C3", G: "FFD1FAE5", H: "FFDBEAFE", J: "FFF3E8FF", K: "FFFCE7F3",
  L: "FFCCFBF1", M: "FFFFE4E6", N: "FFE5E7EB", P: "FFEDE9FE", Q: "FFCFFAFE", R: "FFFFEDD5",
};
const SECTION_TITLES: Record<string, string> = {
  A: "General Requirements", B: "Site Work", C: "Concrete", D: "Masonry", E: "Metalwork",
  F: "Woodwork", G: "Thermal & Moisture", H: "Doors & Windows", J: "Finishes", K: "Accessories",
  L: "Equipment", M: "Furnishings", N: "Special Construction", P: "Conveying", Q: "Mechanical", R: "Electrical",
};

const HEADER_FILL = "FF1F2937";
const HEADING_FILL = "FFD1D5DB";
const RED = "FFB91C1C";

function solid(argb: string): ExcelJS.Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb } };
}

// Column registry keyed by the UI column key the client sends. `field` is the
// ExcelJS column key; `get` derives the cell value from an ExportRow. Stage /
// Flag mirror lib/boq/writeResult.ts exactly so the exported workbook matches
// the on-screen table cell-for-cell, in whatever order the user arranged.
type ColSpec = {
  ui: string;
  field: string;
  header: string;
  width: number;
  numFmt?: string;
  kind?: "code" | "desc";
  get: (r: ExportRow) => string | number | null;
};

const COL_SPECS: ColSpec[] = [
  { ui: "rowNum", field: "rowNum", header: "Row", width: 7, numFmt: "0", get: (r) => r.index + 1 },
  { ui: "ref", field: "ref", header: "Ref", width: 7, get: (r) => r.ref || "" },
  { ui: "description", field: "description", header: "Description", width: 58, kind: "desc", get: (r) => r.description || "" },
  { ui: "quantity", field: "quantity", header: "Qty", width: 12, numFmt: "#,##0.##", get: (r) => r.quantity ?? null },
  { ui: "unit", field: "unit", header: "Unit", width: 8, get: (r) => r.unit || "" },
  { ui: "rate", field: "rate", header: "Rate", width: 13, numFmt: "#,##0.00", get: (r) => r.rate ?? null },
  { ui: "amount", field: "amount", header: "Amount", width: 15, numFmt: "#,##0.00", get: (r) => r.amount ?? null },
  { ui: "pomiCode", field: "code", header: "POMI Code", width: 12, kind: "code", get: (r) => r.code || "" },
  { ui: "pomiSection", field: "pomi_section", header: "POMI Section", width: 22, get: (r) => (r.section ? `${r.section} — ${SECTION_TITLES[r.section] || ""}`.trim() : "") },
  { ui: "code1", field: "code1", header: "Code 1", width: 8, get: (r) => r.code1 || "" },
  { ui: "code2", field: "code2", header: "Code 2", width: 9, get: (r) => r.code2 || "" },
  { ui: "code3", field: "code3", header: "Code 3", width: 10, get: (r) => r.code3 || "" },
  { ui: "code4", field: "code4", header: "Code 4", width: 9, get: (r) => r.code4 || "" },
  { ui: "p1name", field: "p1name", header: "P1 Name", width: 24, get: (r) => r.p1name || "" },
  { ui: "p2name", field: "p2name", header: "P2 Name", width: 26, get: (r) => r.p2name || "" },
  { ui: "p3name", field: "p3name", header: "P3 Name", width: 30, get: (r) => r.p3name || "" },
  { ui: "p4name", field: "p4name", header: "P4 Name", width: 36, get: (r) => r.p4name || "" },
  { ui: "subName", field: "sub_section", header: "POMI Sub Section", width: 26, get: (r) => r.sub_section || "" },
  { ui: "nrmGroup", field: "nrm_group", header: "NRM Group", width: 24, get: (r) => nrmInfo(r.nrm_code)?.group || "" },
  { ui: "nrm", field: "nrm_code", header: "NRM", width: 8, get: (r) => r.nrm_code || "" },
  { ui: "nrmDescription", field: "nrm_desc", header: "NRM Description", width: 34, get: (r) => r.nrm_desc || "" },
  { ui: "nrmClauses", field: "nrm_clauses", header: "POMI Clauses", width: 70, get: (r) => nrmInfo(r.nrm_code)?.clauses || "" },
  { ui: "measurement", field: "method", header: "Measurement", width: 22, get: (r) => r.method || "" },
  { ui: "nrmMethod", field: "nrm_method", header: "Measurement Method", width: 32, get: (r) => nrmInfo(r.nrm_code)?.method || "" },
  { ui: "confidence", field: "confidence", header: "Conf%", width: 8, numFmt: "0", get: (r) => r.confidence ?? null },
  { ui: "stage", field: "stage", header: "Stage", width: 10, get: (r) => (r.code ? "AI" : "") },
  { ui: "flag", field: "flag", header: "Flag", width: 7, get: (r) => (r.needs_review ? "⚠" : r.code ? "✓" : "") },
  { ui: "sheet", field: "batch", header: "BATCH", width: 16, get: (r) => r.sheet || "" },
];

const SPEC_BY_UI: Record<string, ColSpec> = Object.fromEntries(COL_SPECS.map((c) => [c.ui, c]));

// The classic 15-column layout — used when the request carries no column order,
// so older/direct export links keep producing the exact same workbook.
const DEFAULT_UI_KEYS = [
  "ref", "description", "unit", "quantity", "rate", "amount",
  "pomiCode", "pomiSection", "code1", "code2", "code3", "code4",
  "p1name", "p2name", "p3name", "p4name",
  "subName", "nrmGroup", "nrm", "nrmDescription", "nrmClauses", "measurement", "nrmMethod",
];

function resolveCols(uiKeys: string[]): ColSpec[] {
  const specs = uiKeys.map((k) => SPEC_BY_UI[k]).filter(Boolean) as ColSpec[];
  // Never emit an empty sheet (e.g. every column hidden) — fall back to default.
  return specs.length ? specs : (DEFAULT_UI_KEYS.map((k) => SPEC_BY_UI[k]) as ColSpec[]);
}

// Excel sheet-name rules: ≤31 chars, none of []:*?/\, must be unique.
function safeSheetName(name: string, used: Set<string>): string {
  let base = (name || "Sheet").replace(/[[\]:*?/\\]/g, " ").trim().slice(0, 31) || "Sheet";
  let n = base, i = 2;
  while (used.has(n.toLowerCase())) {
    const suffix = ` (${i++})`;
    n = base.slice(0, 31 - suffix.length) + suffix;
  }
  used.add(n.toLowerCase());
  return n;
}

function styleHeader(row: ExcelJS.Row) {
  row.height = 18;
  row.eachCell((cell) => {
    cell.fill = solid(HEADER_FILL);
    cell.font = { color: { argb: "FFFFFFFF" }, bold: true, size: 11 };
    cell.alignment = { vertical: "middle" };
  });
}

function buildDataSheet(ws: ExcelJS.Worksheet, rows: ExportRow[], cols: ColSpec[]) {
  ws.columns = cols.map((c) => ({ header: c.header, key: c.field, width: c.width }));
  ws.views = [{ state: "frozen", ySplit: 1 }];
  styleHeader(ws.getRow(1));

  const descSpec = cols.find((c) => c.kind === "desc");
  const codeSpec = cols.find((c) => c.kind === "code");

  let lastCtx: string | null = null;
  for (const r of rows) {
    // heading / Part separator row, mirroring the original BOQ grouping
    if (r.section_context && r.section_context !== lastCtx) {
      lastCtx = r.section_context;
      const hr = ws.addRow([r.section_context]);
      ws.mergeCells(hr.number, 1, hr.number, cols.length);
      const c = hr.getCell(1);
      c.fill = solid(HEADING_FILL);
      c.font = { bold: true, color: { argb: "FF111827" } };
      c.alignment = { vertical: "middle" };
    }

    const values: Record<string, string | number | null> = {};
    for (const c of cols) values[c.field] = c.get(r);
    const row = ws.addRow(values);

    for (const c of cols) if (c.numFmt) row.getCell(c.field).numFmt = c.numFmt;

    if (descSpec) {
      row.getCell(descSpec.field).alignment = { wrapText: true, vertical: "top" };
      // ExcelJS does not auto-fit row height for wrapped text, so estimate it
      // from the description length — otherwise long multi-line descriptions
      // render clipped to a single visible line.
      const descLen = (r.description || "").length;
      const lines = Math.max(1, Math.ceil(descLen / 50));
      row.height = Math.min(170, lines * 14);
    }

    if (codeSpec) {
      const codeCell = row.getCell(codeSpec.field);
      codeCell.font = { name: "Consolas", bold: true, color: { argb: r.needs_review ? RED : "FF111827" } };
      if (r.section && SECTION_TINT[r.section]) codeCell.fill = solid(SECTION_TINT[r.section]);
    }
  }
}

export async function buildWorkbook(
  fileName: string,
  rows: ExportRow[],
  colKeys?: string[] | null,
): Promise<ArrayBuffer> {
  const cols = resolveCols(colKeys && colKeys.length ? colKeys : DEFAULT_UI_KEYS);
  const wb = new ExcelJS.Workbook();
  wb.creator = "BOQ → POMI";
  wb.created = new Date(0);

  // group rows by original sheet, preserving first-seen order
  const order: string[] = [];
  const groups = new Map<string, ExportRow[]>();
  for (const r of rows) {
    if (!groups.has(r.sheet)) { groups.set(r.sheet, []); order.push(r.sheet); }
    groups.get(r.sheet)!.push(r);
  }

  // ---- Contents sheet ----
  const contents = wb.addWorksheet("Contents");
  contents.columns = [
    { header: "Sheet", key: "sheet", width: 28 },
    { header: "Items", key: "items", width: 10 },
    { header: "Amount", key: "amount", width: 18 },
    { header: "Need review", key: "review", width: 14 },
  ];
  contents.spliceRows(1, 0, [`BOQ → POMI — ${fileName}`], [`${rows.length} items · ${rows.filter((r) => r.needs_review).length} need review`], []);
  contents.mergeCells("A1:D1");
  contents.getCell("A1").font = { bold: true, size: 14 };
  contents.getCell("A2").font = { italic: true, color: { argb: "FF6B7280" } };
  styleHeader(contents.getRow(4));
  // re-key header row 4 cells (spliceRows pushed the column headers down)
  ["Sheet", "Items", "Amount", "Need review"].forEach((h, i) => (contents.getRow(4).getCell(i + 1).value = h));

  const used = new Set<string>();
  used.add("contents");

  for (const sheetName of order) {
    const sheetRows = groups.get(sheetName)!;
    const amount = sheetRows.reduce((s, r) => s + (r.amount || 0), 0);
    const review = sheetRows.filter((r) => r.needs_review).length;
    const cr = contents.addRow({ sheet: sheetName, items: sheetRows.length, amount, review });
    cr.getCell("amount").numFmt = "#,##0.00";

    const ws = wb.addWorksheet(safeSheetName(sheetName, used));
    buildDataSheet(ws, sheetRows, cols);
  }

  const buf = await wb.xlsx.writeBuffer();
  return buf as ArrayBuffer;
}
