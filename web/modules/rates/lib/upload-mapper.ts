import type { Column, Schema } from "./schemas";
import type { UploadResult } from "@/modules/rates/components/upload-preview-dialog";

function normalize(h: string): string {
  return h.toLowerCase().replace(/[\s_\-./]+/g, " ").trim();
}

function slug(h: string): string {
  return (
    "extra_" +
    h
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
  );
}

function inferType(values: unknown[]): Column["type"] {
  let numeric = 0;
  let nonEmpty = 0;
  for (const v of values) {
    if (v == null || v === "") continue;
    nonEmpty++;
    if (typeof v === "number") numeric++;
    else if (!Number.isNaN(Number(String(v).replace(/[, ]/g, "")))) numeric++;
    if (nonEmpty >= 20) break;
  }
  if (nonEmpty > 0 && numeric / nonEmpty > 0.8) return "number";
  return "text";
}

function buildHeaderIndex(
  schema: Schema,
  uploadedHeaders: string[]
): { idx: Map<string, number>; matched: Set<number> } {
  const normalized = uploadedHeaders.map((h) => normalize(String(h ?? "")));
  const idx = new Map<string, number>();
  const matched = new Set<number>();
  for (const col of schema.columns) {
    const candidates = [
      ...(col.aliases ?? []).map(normalize),
      normalize(col.label),
      normalize(col.key),
    ];
    for (const c of candidates) {
      const i = normalized.indexOf(c);
      if (i >= 0 && !matched.has(i)) {
        idx.set(col.key, i);
        matched.add(i);
        break;
      }
    }
  }
  return { idx, matched };
}

function coerce(v: unknown, type: Column["type"]): unknown {
  if (v == null || v === "") return null;
  switch (type) {
    case "money":
    case "number":
    case "ratio": {
      if (typeof v === "number") return Number.isFinite(v) ? v : null;
      const n = Number(String(v).replace(/[, ]/g, ""));
      return Number.isFinite(n) ? n : null;
    }
    case "year": {
      if (typeof v === "number") return Math.round(v);
      const s = String(v).trim();
      const m = s.match(/\d{4}/);
      return m ? Number(m[0]) : s;
    }
    default: {
      const s = String(v).trim();
      return s === "" ? null : s;
    }
  }
}

export type MapResult = {
  rows: Record<string, unknown>[];
  extraColumns: Column[];
};

export function mapUploadToSchema(
  result: UploadResult,
  schema: Schema
): MapResult {
  const { idx, matched } = buildHeaderIndex(schema, result.headers);

  /* Synthetic columns for headers the schema doesn't know about.
   *  Skip blank headers. Place at the end so the user always sees
   *  every column from their file. */
  const extraColumns: Column[] = [];
  const extraKeys: { key: string; colIdx: number }[] = [];
  result.headers.forEach((h, i) => {
    const label = String(h ?? "").trim();
    if (!label || matched.has(i)) return;
    const key = slug(label);
    const sample = result.rows.slice(0, 25).map((r) => r[i]);
    const t = inferType(sample);
    extraColumns.push({
      key,
      label,
      width: t === "number" ? 110 : 150,
      type: t,
      align: t === "number" ? "right" : undefined,
    });
    extraKeys.push({ key, colIdx: i });
  });

  const rows = result.rows.map((row, i) => {
    const obj: Record<string, unknown> = { ref: i + 1 };
    for (const col of schema.columns) {
      if (col.key === "ref") continue;
      const at = idx.get(col.key);
      const raw = at != null ? row[at] : undefined;
      obj[col.key] = coerce(raw, col.type);
    }
    for (const { key, colIdx } of extraKeys) {
      obj[key] = row[colIdx] ?? null;
    }
    return obj;
  });

  return { rows, extraColumns };
}
