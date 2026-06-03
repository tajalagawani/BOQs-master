// Build a styled .xlsx that REBUILDS the original BOQ structure (one worksheet
// per original sheet, items under their original headings) with POMI columns
// added — not a single flattened table.

import ExcelJS from "exceljs";

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

const DATA_COLS = [
  { header: "Ref", key: "ref", width: 7 },
  { header: "Description", key: "description", width: 58 },
  { header: "Unit", key: "unit", width: 8 },
  { header: "Qty", key: "quantity", width: 12 },
  { header: "Rate", key: "rate", width: 13 },
  { header: "Amount", key: "amount", width: 15 },
  { header: "POMI Code", key: "code", width: 12 },
  { header: "POMI Section", key: "pomi_section", width: 22 },
  { header: "Code 1", key: "code1", width: 8 },
  { header: "Code 2", key: "code2", width: 9 },
  { header: "Code 3", key: "code3", width: 10 },
  { header: "POMI Sub Section", key: "sub_section", width: 26 },
  { header: "NRM", key: "nrm_code", width: 8 },
  { header: "NRM Description", key: "nrm_desc", width: 34 },
  { header: "Measurement", key: "method", width: 22 },
];

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

function buildDataSheet(ws: ExcelJS.Worksheet, rows: ExportRow[]) {
  ws.columns = DATA_COLS;
  ws.views = [{ state: "frozen", ySplit: 1 }];
  styleHeader(ws.getRow(1));

  let lastCtx: string | null = null;
  for (const r of rows) {
    // heading / Part separator row, mirroring the original BOQ grouping
    if (r.section_context && r.section_context !== lastCtx) {
      lastCtx = r.section_context;
      const hr = ws.addRow([r.section_context]);
      ws.mergeCells(hr.number, 1, hr.number, DATA_COLS.length);
      const c = hr.getCell(1);
      c.fill = solid(HEADING_FILL);
      c.font = { bold: true, color: { argb: "FF111827" } };
      c.alignment = { vertical: "middle" };
    }

    const row = ws.addRow({
      ref: r.ref, description: r.description, unit: r.unit,
      quantity: r.quantity ?? null, rate: r.rate ?? null, amount: r.amount ?? null,
      code: r.code, pomi_section: r.section ? `${r.section} — ${SECTION_TITLES[r.section] || ""}`.trim() : "",
      code1: r.code1 || "", code2: r.code2 || "", code3: r.code3 || "",
      sub_section: r.sub_section || "", nrm_desc: r.nrm_desc || "",
      nrm_code: r.nrm_code, method: r.method,
    });
    row.getCell("quantity").numFmt = "#,##0.##";
    row.getCell("rate").numFmt = "#,##0.00";
    row.getCell("amount").numFmt = "#,##0.00";
    row.getCell("description").alignment = { wrapText: true, vertical: "top" };
    // ExcelJS does not auto-fit row height for wrapped text, so estimate it from
    // the description length + the Description column width — otherwise long
    // multi-line descriptions render clipped to a single visible line.
    const descLen = (r.description || "").length;
    const lines = Math.max(1, Math.ceil(descLen / 50));
    row.height = Math.min(170, lines * 14);

    const codeCell = row.getCell("code");
    codeCell.font = { name: "Consolas", bold: true, color: { argb: r.needs_review ? RED : "FF111827" } };
    if (r.section && SECTION_TINT[r.section]) codeCell.fill = solid(SECTION_TINT[r.section]);
  }
}

export async function buildWorkbook(fileName: string, rows: ExportRow[]): Promise<ArrayBuffer> {
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
    buildDataSheet(ws, sheetRows);
  }

  const buf = await wb.xlsx.writeBuffer();
  return buf as ArrayBuffer;
}
