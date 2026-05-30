/**
 * Read a sheet from the POMI-coded result workbook into JSON rows.
 * Matches the column layout pomi_coder_app.py writes for MASTER BOQs
 * (35 cols) and per-sheet output (15 cols).
 *
 * Header row is found dynamically by scanning for the cell containing
 * 'Description'. Columns are returned by header name → no positional
 * assumptions baked in.
 */
import ExcelJS from "exceljs";
import fs from "node:fs/promises";

export interface SheetData {
  name: string;
  headers: string[];
  rows: Array<Record<string, string | number | null>>;
  rowCount: number;
}

function cellValue(c: ExcelJS.Cell): string | number | null {
  const v = c.value;
  if (v === null || v === undefined) return null;
  if (typeof v === "string" || typeof v === "number") return v;
  if (typeof v === "object" && "result" in (v as object)) {
    const r = (v as { result?: unknown }).result;
    if (typeof r === "string" || typeof r === "number") return r;
  }
  if (typeof v === "object" && "richText" in (v as object)) {
    const rt = (v as { richText: Array<{ text: string }> }).richText;
    return rt.map((p) => p.text).join("");
  }
  return String(v);
}

function findHeaderRow(ws: ExcelJS.Worksheet): { row: number; cols: string[] } {
  const last = Math.min(15, ws.actualRowCount || 15);
  for (let r = 1; r <= last; r++) {
    const row = ws.getRow(r);
    const headers: string[] = [];
    const maxCol = ws.actualColumnCount || row.cellCount;
    for (let c = 1; c <= maxCol; c++) {
      const v = String(cellValue(row.getCell(c)) ?? "").trim();
      headers.push(v);
    }
    if (headers.some((h) => /^description$/i.test(h))) {
      return { row: r, cols: headers };
    }
  }
  // Fallback: use row 1
  const row1 = ws.getRow(1);
  const headers: string[] = [];
  const maxCol = ws.actualColumnCount || row1.cellCount;
  for (let c = 1; c <= maxCol; c++) {
    headers.push(String(cellValue(row1.getCell(c)) ?? "").trim() || `col${c}`);
  }
  return { row: 1, cols: headers };
}

export async function readSheet(filePath: string, sheetName: string): Promise<SheetData> {
  const buf = await fs.readFile(filePath);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ArrayBuffer);
  const ws = wb.getWorksheet(sheetName);
  if (!ws) throw new Error(`sheet "${sheetName}" not found`);

  const { row: hdrRow, cols: headers } = findHeaderRow(ws);
  // De-duplicate / fall-back header names so AG-Grid field keys don't collide.
  const safeHeaders = headers.map((h, i) => h || `col${i + 1}`);
  const seen: Record<string, number> = {};
  const finalHeaders = safeHeaders.map((h) => {
    seen[h] = (seen[h] ?? 0) + 1;
    return seen[h] > 1 ? `${h} (${seen[h]})` : h;
  });

  const rows: Array<Record<string, string | number | null>> = [];
  const lastRow = ws.actualRowCount || 0;
  for (let r = hdrRow + 1; r <= lastRow; r++) {
    const row = ws.getRow(r);
    const obj: Record<string, string | number | null> = {};
    let any = false;
    for (let c = 1; c <= finalHeaders.length; c++) {
      const v = cellValue(row.getCell(c));
      obj[finalHeaders[c - 1]] = v;
      if (v !== null && v !== "") any = true;
    }
    if (any) rows.push(obj);
  }

  return {
    name: sheetName,
    headers: finalHeaders,
    rows,
    rowCount: rows.length,
  };
}

export async function listSheets(filePath: string): Promise<string[]> {
  const buf = await fs.readFile(filePath);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ArrayBuffer);
  return wb.worksheets
    .filter((w) => w.state !== "hidden" && w.state !== "veryHidden")
    .map((w) => w.name);
}
