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
  pomiCode: string;     // the 7-char POMI code, e.g. "A020000"
  pomiSection: string;  // "A — General Requirements"
  pomiSubSection: string; // the L1 sub-section name, e.g. "Specification"
  measurement: string;  // POMI measurement, e.g. "Volume (m³), Weight (t)"
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
  // Accept a leading POMI section code that is a single letter (A–R), a
  // letter+number (Q4), or a number (01) — followed by an optional dash and
  // the section name. \d{0,3} (not {1,3}) is what lets bare letters like "A"
  // split into code "A" + name, instead of falling through to "(whole thing)".
  const m = t.match(/^([A-Z]{1,3}\d{0,3}|[0-9]{1,3})\b\s*[—–-]?\s*(.*)$/i);
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
    pomiCode:  want("POMI Code"),
    section:   want("POMI Section"),
    sub:       want("POMI Sub Section"),
    measure:   want("Measurement"),
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

  // Safe column read — `want()` returns 0 when a header is missing, but
  // exceljs's `getCell(0)` throws "0 is out of bounds". Coerce 0 → null
  // and return null for any missing column so downstream s()/n() default
  // to empty string / 0 instead of crashing the whole load.
  const at = (row: ExcelJS.Row, col: number) =>
    col >= 1 ? cellValue(row.getCell(col)) : null;

  for (let r = hdrRow + 1; r <= last; r++) {
    const row = ws.getRow(r);
    const desc = s(at(row, C.desc));
    if (!desc) continue;

    const ref = s(at(row, C.ref));
    const subRaw = s(at(row, C.sub)); // POMI Sub Section (L1 name)
    const secRaw = s(at(row, C.section));
    // Group by POMI Section (A–R) — the sub-section is now a real named
    // sub-section (e.g. "Conditions of contract"), not the nav level.
    const grouping = secRaw || subRaw || "Uncategorised";
    const { code: secCode, name: secName } = splitSection(grouping);
    const key = secCode || secName;

    counter[key] = (counter[key] ?? 0) + 1;
    const seq = counter[key];
    const code = `${key}.${String(seq).padStart(3, "0")}`;

    const sheetName = s(at(row, C.batch)) || "";

    items.push({
      code,
      ref,
      description: desc,
      unit: s(at(row, C.unit)),
      quantity: n(at(row, C.qty)),
      rate: n(at(row, C.rate)),
      amount: n(at(row, C.amount)),
      pomiCode: s(at(row, C.pomiCode)),
      pomiSection: secRaw,
      pomiSubSection: subRaw,
      measurement: s(at(row, C.measure)),
      nrm: s(at(row, C.nrm)),
      nrmDescription: s(at(row, C.nrmDesc)),
      stage: s(at(row, C.stage)),
      confidence: n(at(row, C.conf)),
      flag: s(at(row, C.flag)),
      sheetName,
    });
  }

  // Group items by POMI Section (A–R).
  const itemsBySection: Record<string, ProjectItem[]> = {};
  for (const it of items) {
    const g = splitSection(it.pomiSection || it.pomiSubSection || "Uncategorised");
    const key = g.code || g.name;
    if (!itemsBySection[key]) itemsBySection[key] = [];
    itemsBySection[key].push(it);
  }

  // Build sections list sorted by code
  const sections: ProjectSection[] = Object.entries(itemsBySection)
    .map(([key, list]) => {
      const sample = list[0];
      const { code, name } = splitSection(sample.pomiSection || sample.pomiSubSection || "Uncategorised");
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
