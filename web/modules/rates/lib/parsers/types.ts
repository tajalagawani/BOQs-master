import type * as XLSX from "xlsx";

export type ParsedRow = Record<string, unknown>;

/** A Parser is a deterministic function from a workbook to clean rows.
 *  It knows the exact sheet name, header row position, and column mapping
 *  for one (section, tab) combination. Return [] if the workbook doesn't
 *  match — callers will fall back to the generic alias-based mapper. */
export type Parser = (workbook: XLSX.WorkBook) => ParsedRow[];

/* ---------- shared coercers ---------- */

export function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

export function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = Number(String(v).replace(/[, ]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function year(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Math.round(v);
  const m = String(v).match(/\d{4}/);
  return m ? Number(m[0]) : null;
}
