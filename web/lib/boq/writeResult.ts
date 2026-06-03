/**
 * Write a POMI-pipeline result into the xlsx shape the existing BOQs UI reads:
 *   • a "MASTER BOQs" sheet with the columns projectData.ts expects
 *     (REF, Description, Unit, Qty, Rate, Amount, POMI Section,
 *      POMI Sub Section, NRM, NRM Description, Stage, Conf%, Flag, BATCH)
 *   • one sheet per original BOQ sheet (so the master/ResultViewer tabs work)
 *
 * This replaces the old Python coder's output writer — same on-disk contract,
 * POMI pipeline underneath. The workspace sidebar groups by POMI Sub Section,
 * so we write "<Section> <Title>" there (e.g. "C Concrete").
 */
import ExcelJS from "exceljs";
import type { BOQResult, BOQItemRow } from "@/lib/pomi/schema";

const SECTION_TITLES: Record<string, string> = {
  A: "General Requirements", B: "Site Work", C: "Concrete", D: "Masonry",
  E: "Metalwork", F: "Woodwork", G: "Thermal & Moisture", H: "Doors & Windows",
  J: "Finishes", K: "Accessories", L: "Equipment", M: "Furnishings",
  N: "Special Construction", P: "Conveying", Q: "Mechanical", R: "Electrical",
};

const MASTER_COLS = [
  "REF", "Description", "Unit", "Qty", "Rate", "Amount",
  "POMI Code", "POMI Section", "Code 1", "Code 2", "Code 3", "POMI Sub Section",
  "NRM", "NRM Description", "Measurement", "Stage", "Conf%", "Flag", "BATCH",
];

const SHEET_COLS = [
  "REF", "Description", "Unit", "Qty", "Rate", "Amount",
  "POMI Code", "POMI Section", "Code 1", "Code 2", "Code 3", "POMI Sub Section",
  "NRM", "NRM Description", "Measurement", "Stage", "Conf%", "Flag",
];

const HEADER_FILL = "FF1F2937";

function sectionLabel(letter: string): string {
  if (!letter) return "";
  const t = SECTION_TITLES[letter];
  return t ? `${letter} — ${t}` : letter;
}

function styleHeader(row: ExcelJS.Row) {
  row.height = 18;
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    cell.font = { color: { argb: "FFFFFFFF" }, bold: true, size: 11 };
    cell.alignment = { vertical: "middle" };
  });
}

function rowValues(it: BOQItemRow, cols: string[]): Array<string | number | null> {
  const sec = it.pomi?.section || "";
  const code = it.pomi?.code || "";
  const stage = code ? "AI" : "";
  const map: Record<string, string | number | null> = {
    REF: it.ref || "",
    Description: it.full_description || it.description || "",
    Unit: it.unit || "",
    Qty: it.quantity ?? null,
    Rate: it.rate ?? null,
    Amount: it.amount ?? null,
    "POMI Code": code,
    "POMI Section": sectionLabel(sec),
    // Hierarchical code prefixes: A → A02 → A0200
    "Code 1": code.slice(0, 1),
    "Code 2": code.slice(0, 3),
    "Code 3": code.slice(0, 5),
    "POMI Sub Section": it.pomi?.l1_name || it.pomi?.sub_section || "",
    NRM: it.pomi?.nrm_code || "",
    "NRM Description": it.pomi?.nrm_desc || "",
    Measurement: it.pomi?.method || "",
    Stage: stage,
    "Conf%": it.pomi?.confidence ?? null,
    Flag: it.pomi?.needs_review ? "⚠" : code ? "✓" : "",
    BATCH: it.sheet || "",
  };
  return cols.map((c) => map[c] ?? null);
}

function buildSheet(ws: ExcelJS.Worksheet, cols: string[], items: BOQItemRow[]) {
  ws.addRow(cols);
  styleHeader(ws.getRow(1));
  ws.views = [{ state: "frozen", ySplit: 1 }];
  for (const it of items) {
    const r = ws.addRow(rowValues(it, cols));
    const qi = cols.indexOf("Qty");
    const ri = cols.indexOf("Rate");
    const ai = cols.indexOf("Amount");
    if (qi >= 0) r.getCell(qi + 1).numFmt = "#,##0.##";
    if (ri >= 0) r.getCell(ri + 1).numFmt = "#,##0.00";
    if (ai >= 0) r.getCell(ai + 1).numFmt = "#,##0.00";
    const di = cols.indexOf("Description");
    if (di >= 0) r.getCell(di + 1).alignment = { wrapText: true, vertical: "top" };
  }
  // widths
  cols.forEach((c, i) => {
    const col = ws.getColumn(i + 1);
    col.width =
      c === "Description" ? 56 :
      c === "NRM Description" || c === "Measurement" ? 34 :
      c === "POMI Sub Section" ? 26 :
      c === "POMI Section" ? 22 :
      c === "Code 2" || c === "Code 3" ? 10 : 12;
  });
}

/** Safe, unique Excel sheet name. */
function safeName(name: string, used: Set<string>): string {
  const base = (name || "Sheet").replace(/[[\]:*?/\\]/g, " ").trim().slice(0, 28) || "Sheet";
  let n = base;
  let i = 2;
  while (used.has(n.toLowerCase())) n = `${base.slice(0, 24)} (${i++})`;
  used.add(n.toLowerCase());
  return n;
}

export async function writeResultWorkbook(filePath: string, result: BOQResult): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "POMI";
  wb.created = new Date(0);

  const items = result.items || [];

  // MASTER BOQs — every item, fully coded.
  const master = wb.addWorksheet("MASTER BOQs");
  buildSheet(master, MASTER_COLS, items);

  // One sheet per original BOQ sheet, first-seen order.
  const order: string[] = [];
  const bySheet = new Map<string, BOQItemRow[]>();
  for (const it of items) {
    const s = it.sheet || "(unnamed)";
    if (!bySheet.has(s)) {
      bySheet.set(s, []);
      order.push(s);
    }
    bySheet.get(s)!.push(it);
  }
  const used = new Set<string>(["master boqs"]);
  for (const s of order) {
    const ws = wb.addWorksheet(safeName(s, used));
    buildSheet(ws, SHEET_COLS, bySheet.get(s)!);
  }

  await wb.xlsx.writeFile(filePath);
}
