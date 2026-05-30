/**
 * Read an uploaded BoQ xlsx and return a structural inspection:
 * which sheets exist, what their detected column mapping looks like,
 * a sample of rows from each sheet. Mirrors detect_columns() in
 * pomi_coder_app.py so the user sees in the browser exactly what
 * the Python coder will see.
 *
 * Pure structural — no project-specific tables, no sheet-name lists.
 */
import ExcelJS from "exceljs";

export type ColumnKind =
  | "item_ref"
  | "description"
  | "qty"
  | "unit"
  | "rate"
  | "amount"
  | "ignore";

export interface DetectedColumn {
  index: number;          // 1-based
  header: string;         // value from the header row
  subHeader?: string;     // value from the row below header (cluster sub-label, "TOTAL", …)
  kind: ColumnKind;
  isQtyTotal?: boolean;   // for cluster-style sheets — set on the chosen Qty column
}

export interface SheetInspection {
  name: string;
  rowCount: number;
  headerRow: number;
  columns: DetectedColumn[];
  sampleRows: Array<Array<string | number | null>>;
  /** suggested Qty column index when a 'TOTAL' sub-header is found */
  detectedQtyCol: number | null;
}

const PATTERNS: Array<[ColumnKind, RegExp]> = [
  ["item_ref",    /item|ref|no\.?$|^#$/i],
  ["description", /descri|particular|item detail/i],
  ["qty",         /^qty$|^quantity$|^q$/i],
  ["unit",        /^unit$|^u$|^uom$/i],
  ["rate",        /^rate$|^unit.?rate$|^price$/i],
  ["amount",      /^amount|^total$|^value$|^aed$|^sum$/i],
];

function classifyHeader(text: string): ColumnKind {
  const t = (text || "").trim();
  if (!t) return "ignore";
  for (const [kind, pat] of PATTERNS) {
    if (pat.test(t)) return kind;
  }
  return "ignore";
}

function findHeaderRow(
  ws: ExcelJS.Worksheet,
  maxScan = 10,
): number {
  const last = Math.min(maxScan, ws.actualRowCount || 10);
  for (let r = 1; r <= last; r++) {
    const row = ws.getRow(r);
    const vals = (row.values as Array<unknown>) || [];
    const txts = vals.map((v) => String(v ?? "").trim().toLowerCase());
    const hasDescription = txts.some((v) => /descri/i.test(v));
    const hasItem        = txts.some((v) => /^item$|^ref$/i.test(v));
    const hasUnit        = txts.some((v) => /^unit$/i.test(v));
    if (hasDescription && (hasItem || hasUnit)) {
      return r;
    }
  }
  return 1;
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

export async function inspectXlsx(buf: Buffer): Promise<SheetInspection[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ArrayBuffer);

  const result: SheetInspection[] = [];

  wb.worksheets.forEach((ws) => {
    if (!ws || ws.state === "hidden" || ws.state === "veryHidden") return;
    const headerRow = findHeaderRow(ws);
    const hdrCells = ws.getRow(headerRow);
    const subCells = ws.getRow(headerRow + 1);
    const maxCol = ws.actualColumnCount || hdrCells.cellCount;

    const cols: DetectedColumn[] = [];
    for (let c = 1; c <= maxCol; c++) {
      const headerTxt = String(cellValue(hdrCells.getCell(c)) ?? "").trim();
      const subTxt    = String(cellValue(subCells.getCell(c)) ?? "").trim();
      cols.push({
        index: c,
        header: headerTxt,
        subHeader: subTxt || undefined,
        kind: classifyHeader(headerTxt),
      });
    }

    // ── Cluster-breakdown re-target for Qty (mirrors pomi_coder_app) ──
    // If 'qty' is detected at column Q and 'unit' at column U with U > Q+1
    // (extra columns between them), look in the sub-header row for any
    // cell saying 'TOTAL' / 'Total' — that's the project-wide total.
    const qtyCol = cols.find((c) => c.kind === "qty")?.index ?? null;
    const unitCol = cols.find((c) => c.kind === "unit")?.index ?? null;
    let detectedQtyCol: number | null = qtyCol;
    if (qtyCol && unitCol && unitCol > qtyCol + 1) {
      // Walk right-to-left so the right-most 'Total'/'TOTAL' wins
      for (let c = unitCol - 1; c > qtyCol; c--) {
        const sub = (cols[c - 1].subHeader || "").trim();
        if (/^total$/i.test(sub)) {
          detectedQtyCol = c;
          cols[c - 1].isQtyTotal = true;
          break;
        }
      }
    } else if (qtyCol) {
      const qcol = cols.find((c) => c.index === qtyCol);
      if (qcol) qcol.isQtyTotal = true;
    }

    // ── Sample rows (next 6 data rows after header) ──
    const sampleRows: Array<Array<string | number | null>> = [];
    const lastRow = Math.min(ws.actualRowCount || 0, headerRow + 12);
    let collected = 0;
    for (let r = headerRow + 1; r <= lastRow && collected < 6; r++) {
      const row = ws.getRow(r);
      const arr: Array<string | number | null> = [];
      for (let c = 1; c <= Math.min(maxCol, 12); c++) {
        arr.push(cellValue(row.getCell(c)));
      }
      // Skip rows that look completely empty
      if (arr.every((v) => v === null || v === "")) continue;
      sampleRows.push(arr);
      collected++;
    }

    result.push({
      name: ws.name,
      rowCount: ws.actualRowCount || 0,
      headerRow,
      columns: cols,
      sampleRows,
      detectedQtyCol,
    });
  });

  return result;
}
