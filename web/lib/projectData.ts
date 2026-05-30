/**
 * Server-side reader for a project's source xlsx.
 * Reads MASTER BOQs, groups rows by POMI Sub Section, returns
 * { sections, items } ready for the workspace UI.
 *
 * Section grouping rule (pattern-driven, no per-project tables):
 *   • Use the row's "POMI Sub Section" column when set
 *     (e.g. "Q4 Equipment" → code="Q4", name="Equipment").
 *   • Fall back to "POMI Section" when sub-section is empty.
 *   • Fall back to "Uncategorised" when both are empty.
 */
import "server-only";
import path from "node:path";
import ExcelJS from "exceljs";
import { REPO_ROOT } from "@/lib/paths";

export interface ProjectSection {
  code: string;        // "Q4", "01", "A"
  name: string;        // "Equipment"
  itemCount: number;
  totalAmount: number;
}

export interface ProjectItem {
  code: string;
  ref: string;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
  pomiSection: string;
  pomiSubSection: string;
  nrm: string;
  nrmDescription: string;
  stage: string;        // Rule | Fuzzy | AI | ""
  confidence: number;
  flag: string;         // ⚠ | ✓
  sheetName: string;
}

export interface ProjectData {
  sections: ProjectSection[];
  items: ProjectItem[];          // all priced items, pre-grouped
  itemsBySection: Record<string, ProjectItem[]>;
  totalAmount: number;
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
      headers.push(String(cellValue(row.getCell(c)) ?? "").trim());
    }
    if (headers.some((h) => /^description$/i.test(h))) {
      return { row: r, cols: headers };
    }
  }
  return { row: 1, cols: [] };
}

function n(v: string | number | null): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  const s = String(v).replace(/[, ]/g, "");
  const f = parseFloat(s);
  return isNaN(f) ? 0 : f;
}

function s(v: string | number | null): string {
  return v == null ? "" : String(v).trim();
}

/**
 * Split a 'POMI Sub Section' string like "Q4 Equipment" into
 * (code, name). Pure pattern — if the value doesn't start with an
 * alphanumeric code, treat the whole thing as the name.
 */
function splitSection(label: string): { code: string; name: string } {
  const t = label.trim();
  if (!t) return { code: "", name: "" };
  const m = t.match(/^([A-Z]{1,3}\d{1,3}|[0-9]{1,3})\b\s*[—–-]?\s*(.*)$/i);
  if (m) return { code: m[1].toUpperCase(), name: (m[2] || t).trim() };
  return { code: "", name: t };
}

export async function loadProjectData(sourceRel: string): Promise<ProjectData> {
  const file = path.isAbsolute(sourceRel)
    ? sourceRel
    : path.join(REPO_ROOT, sourceRel);

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const ws = wb.getWorksheet("MASTER BOQs");
  if (!ws) {
    throw new Error(`MASTER BOQs sheet not found in ${file}`);
  }

  const { row: hdrRow, cols: headers } = findHeaderRow(ws);
  const idx: Record<string, number> = {};
  headers.forEach((h, i) => {
    if (h && !(h in idx)) idx[h] = i + 1;
  });

  const want = (...candidates: string[]): number => {
    for (const c of candidates) {
      if (c in idx) return idx[c];
    }
    return 0;
  };

  const C = {
    ref:       want("REF", "Item Ref"),
    desc:      want("Description"),
    qty:       want("Qty", "Quantity"),
    unit:      want("Unit"),
    rate:      want("Rate"),
    amount:    want("Amount"),
    section:   want("POMI Section"),
    sub:       want("POMI Sub Section"),
    nrm:       want("NRM"),
    nrmDesc:   want("NRM Description"),
    stage:     want("Stage"),
    conf:      want("Conf%"),
    flag:      want("Flag"),
    batch:     want("BATCH"),
  };

  const items: ProjectItem[] = [];
  const last = ws.actualRowCount || 0;
  const counter: Record<string, number> = {};

  for (let r = hdrRow + 1; r <= last; r++) {
    const row = ws.getRow(r);
    const desc = s(cellValue(row.getCell(C.desc)));
    if (!desc) continue;

    const ref = s(cellValue(row.getCell(C.ref)));
    const subRaw = s(cellValue(row.getCell(C.sub)));
    const secRaw = s(cellValue(row.getCell(C.section)));
    const grouping = subRaw || secRaw || "Uncategorised";
    const { code: secCode, name: secName } = splitSection(grouping);
    const key = secCode || secName;

    counter[key] = (counter[key] ?? 0) + 1;
    const seq = counter[key];
    const code = `${key}.${String(seq).padStart(3, "0")}`;

    const sheetName = s(cellValue(row.getCell(C.batch))) || "";

    items.push({
      code,
      ref,
      description: desc,
      unit: s(cellValue(row.getCell(C.unit))),
      quantity: n(cellValue(row.getCell(C.qty))),
      rate: n(cellValue(row.getCell(C.rate))),
      amount: n(cellValue(row.getCell(C.amount))),
      pomiSection: secRaw,
      pomiSubSection: subRaw,
      nrm: s(cellValue(row.getCell(C.nrm))),
      nrmDescription: s(cellValue(row.getCell(C.nrmDesc))),
      stage: s(cellValue(row.getCell(C.stage))),
      confidence: n(cellValue(row.getCell(C.conf))),
      flag: s(cellValue(row.getCell(C.flag))),
      sheetName,
    });
  }

  // Group items by section
  const itemsBySection: Record<string, ProjectItem[]> = {};
  for (const it of items) {
    const key = splitSection(it.pomiSubSection || it.pomiSection || "Uncategorised")
      .code || splitSection(it.pomiSubSection || it.pomiSection || "Uncategorised").name;
    if (!itemsBySection[key]) itemsBySection[key] = [];
    itemsBySection[key].push(it);
  }

  // Build sections list sorted by code
  const sections: ProjectSection[] = Object.entries(itemsBySection)
    .map(([key, list]) => {
      const sample = list[0];
      const { code, name } = splitSection(sample.pomiSubSection || sample.pomiSection || "Uncategorised");
      return {
        code: code || key,
        name: name || key,
        itemCount: list.length,
        totalAmount: list.reduce((acc, it) => acc + (it.amount || 0), 0),
      };
    })
    .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));

  const totalAmount = items.reduce((acc, it) => acc + (it.amount || 0), 0);

  return { sections, items, itemsBySection, totalAmount };
}
