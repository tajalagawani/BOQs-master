import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { resultJsonPath, resultPath } from "@/lib/paths";
import { readMeta } from "@/lib/runMeta";
import { readSheet } from "@/lib/readResult";
import { buildWorkbook, type ExportRow } from "@/lib/export/xlsx";
import type { BOQResult } from "@/lib/pomi/schema";

export const runtime = "nodejs";

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const numOf = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  if (typeof v === "number") return v;
  const n = parseFloat(String(v).replace(/[, ]/g, ""));
  return Number.isNaN(n) ? null : n;
};

/**
 * GET /api/run/[runId]/export — ALWAYS the standalone-POMI workbook
 * (Contents sheet + one worksheet per original sheet, POMI columns, section
 * tints, red codes for review), built by the same buildWorkbook the standalone
 * POMI app uses. Prefers the full result.json; for older runs it reconstructs
 * the rows from the MASTER BOQs result sheet. Never streams the flat sheet.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;
  // Column order + visibility mirror the on-screen table (sent by the Columns
  // menu as UI column keys). Absent → the classic full-fidelity layout.
  const colsParam = new URL(req.url).searchParams.get("cols");
  const cols = colsParam ? colsParam.split(",").map((s) => s.trim()).filter(Boolean) : null;
  const meta = await readMeta(runId);
  const base = (meta?.originalName || "BOQ").replace(/\.[^.]+$/, "");
  const outName = `${base}_POMI_Coded.xlsx`;

  let rows: ExportRow[] | null = null;

  // 1) Full fidelity — rebuild from the persisted POMI result.
  try {
    const raw = await readFile(resultJsonPath(runId), "utf-8");
    const result = JSON.parse(raw) as BOQResult;
    rows = (result.items || []).map((it, i) => ({
      index: i,
      sheet: it.sheet,
      ref: it.ref || "",
      description: it.full_description || it.description || "",
      unit: it.unit || "",
      quantity: it.quantity ?? null,
      rate: it.rate ?? null,
      amount: it.amount ?? null,
      code: it.pomi?.code || "",
      section: it.pomi?.section || "",
      code1: (it.pomi?.code || "").slice(0, 1),
      code2: (it.pomi?.code || "").slice(0, 3),
      code3: (it.pomi?.code || "").slice(0, 5),
      sub_section: it.pomi?.l1_name || it.pomi?.sub_section || "",
      nrm_desc: it.pomi?.nrm_desc || "",
      pomi_desc: it.pomi?.pomi_desc || "",
      nrm_code: it.pomi?.nrm_code || "",
      method: it.pomi?.method || "",
      confidence: it.pomi?.confidence ?? null,
      needs_review: !!it.pomi?.needs_review,
      section_context: it.section_context || "",
    }));
  } catch {
    // 2) Fallback — reconstruct from the MASTER BOQs result sheet (older runs).
    try {
      const sheet = await readSheet(resultPath(runId), "MASTER BOQs");
      rows = sheet.rows.map((r, i) => {
        const secLabel = String(r["POMI Section"] ?? "");
        const section = secLabel.match(/^([A-Z])/)?.[1] || "";
        return {
          index: i,
          sheet: String(r["BATCH"] ?? "") || "BOQ",
          ref: String(r["REF"] ?? ""),
          description: String(r["Description"] ?? ""),
          unit: String(r["Unit"] ?? ""),
          quantity: numOf(r["Qty"]),
          rate: numOf(r["Rate"]),
          amount: numOf(r["Amount"]),
          code: String(r["POMI Code"] ?? ""),
          section,
          code1: String(r["Code 1"] ?? "") || String(r["POMI Code"] ?? "").slice(0, 1),
          code2: String(r["Code 2"] ?? "") || String(r["POMI Code"] ?? "").slice(0, 3),
          code3: String(r["Code 3"] ?? "") || String(r["POMI Code"] ?? "").slice(0, 5),
          sub_section: String(r["POMI Sub Section"] ?? ""),
          nrm_desc: String(r["NRM Description"] ?? ""),
          pomi_desc: String(r["POMI Sub Section"] ?? ""),
          nrm_code: String(r["NRM"] ?? ""),
          method: String(r["Measurement"] ?? ""),
          confidence: numOf(r["Conf%"]),
          needs_review: String(r["Flag"] ?? "") === "⚠",
          section_context: "",
        };
      });
    } catch {
      rows = null;
    }
  }

  if (!rows) {
    return NextResponse.json({ error: "result not ready" }, { status: 404 });
  }

  const buf = await buildWorkbook(base, rows, cols);
  return new Response(buf, {
    headers: {
      "Content-Type": XLSX_MIME,
      "Content-Disposition": `attachment; filename="${outName}"`,
    },
  });
}
