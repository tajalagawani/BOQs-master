"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  Check,
  AlertTriangle,
  Loader2,
  Play,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { SheetInspection, ColumnKind } from "@/lib/inspectXlsx";

const KIND_LABELS: Record<ColumnKind, string> = {
  item_ref: "Item",
  description: "Description",
  qty: "Quantity",
  unit: "Unit",
  rate: "Rate",
  amount: "Amount",
  ignore: "—",
};

const KIND_OPTIONS: ColumnKind[] = [
  "item_ref",
  "description",
  "qty",
  "unit",
  "rate",
  "amount",
  "ignore",
];

const KIND_COLOR: Record<ColumnKind, string> = {
  item_ref: "bg-blue-50 text-blue-800 border-blue-200",
  description: "bg-zinc-100 text-zinc-800 border-zinc-200",
  qty: "bg-emerald-50 text-emerald-800 border-emerald-200",
  unit: "bg-amber-50 text-amber-800 border-amber-200",
  rate: "bg-violet-50 text-violet-800 border-violet-200",
  amount: "bg-rose-50 text-rose-800 border-rose-200",
  ignore: "bg-zinc-50 text-zinc-400 border-zinc-200",
};

// Stronger header tint + a lighter body tint, per column kind — so the sample
// rows are colour-coded to match the column pills above.
const KIND_HEAD: Record<ColumnKind, string> = {
  item_ref: "bg-blue-100 text-blue-900",
  description: "bg-zinc-100 text-zinc-800",
  qty: "bg-emerald-100 text-emerald-900",
  unit: "bg-amber-100 text-amber-900",
  rate: "bg-violet-100 text-violet-900",
  amount: "bg-rose-100 text-rose-900",
  ignore: "bg-zinc-50 text-zinc-400",
};
const KIND_CELL: Record<ColumnKind, string> = {
  item_ref: "bg-blue-50/60",
  description: "bg-zinc-50",
  qty: "bg-emerald-50/60",
  unit: "bg-amber-50/50",
  rate: "bg-violet-50/50",
  amount: "bg-rose-50/50",
  ignore: "",
};

interface Props {
  runId: string;
  initialSheets: SheetInspection[];
  originalName: string;
}

export function SheetReview({ runId, initialSheets, originalName }: Props) {
  const router = useRouter();
  const [sheets, setSheets] = useState(initialSheets);
  const [openSheet, setOpenSheet] = useState<string | null>(
    initialSheets.find((s) => s.columns.some((c) => c.kind !== "ignore"))?.name ??
      initialSheets[0]?.name ??
      null,
  );
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState("claude-sonnet-4-6");

  const totalRows = useMemo(
    () => sheets.reduce((sum, s) => sum + s.rowCount, 0),
    [sheets],
  );
  const sheetsWithMapping = sheets.filter(
    (s) =>
      s.columns.some((c) => c.kind === "description") &&
      s.columns.some((c) => c.kind === "qty" || c.kind === "amount"),
  ).length;

  const updateColumn = (
    sheetName: string,
    colIndex: number,
    newKind: ColumnKind,
  ) => {
    setSheets((prev) =>
      prev.map((s) =>
        s.name !== sheetName
          ? s
          : {
              ...s,
              columns: s.columns.map((c) =>
                c.index === colIndex ? { ...c, kind: newKind } : c,
              ),
            },
      ),
    );
  };

  const startRun = () => {
    if (starting) return;
    setStarting(true);
    setError(null);
    // The live mapping page kicks off the POMI pipeline (parse → classify) and
    // streams the result table as each batch lands.
    router.push(`/boqs/import/${runId}?model=${encodeURIComponent(model)}`);
  };

  return (
    <div className="h-full flex flex-col gap-4 min-h-0">
      {/* Summary bar */}
      <div className="flex items-center justify-between bg-white border border-zinc-200 rounded-xl px-5 py-3">
        <div className="flex gap-6 items-center text-sm">
          <div>
            <span className="text-zinc-500">File:</span>{" "}
            <span className="font-medium text-zinc-900">{originalName}</span>
          </div>
          <div>
            <span className="text-zinc-500">Sheets:</span>{" "}
            <span className="font-medium text-zinc-900">{sheets.length}</span>
          </div>
          <div>
            <span className="text-zinc-500">Rows:</span>{" "}
            <span className="font-medium text-zinc-900">{totalRows}</span>
          </div>
          <div>
            <span className="text-zinc-500">Mapped:</span>{" "}
            <span className="font-medium text-zinc-900">
              {sheetsWithMapping} / {sheets.length}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            disabled={starting}
            className="h-10 px-3 bg-white border border-zinc-200 rounded-xl text-sm text-zinc-700 outline-none focus:border-zinc-400"
          >
            <option value="claude-haiku-4-5-20251001">Haiku — fastest</option>
            <option value="claude-sonnet-4-6">Sonnet — balanced</option>
            <option value="claude-opus-4-8">Opus — most accurate</option>
          </select>
          <button
            type="button"
            onClick={startRun}
            disabled={starting}
            className={cn(
              "h-10 px-5 rounded-xl text-sm font-medium inline-flex items-center gap-2 transition-colors",
              starting
                ? "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                : "bg-zinc-900 text-white hover:bg-zinc-800",
            )}
          >
            {starting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Starting…
              </>
            ) : (
              <>
                <Play className="size-4" strokeWidth={2} />
                Confirm mapping & process
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {/* Sheet list */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
        {sheets.map((sheet) => {
          const open = openSheet === sheet.name;
          const hasDescription = sheet.columns.some((c) => c.kind === "description");
          const hasQty = sheet.columns.some((c) => c.kind === "qty");
          const ok = hasDescription && hasQty;

          return (
            <div
              key={sheet.name}
              className={cn(
                "bg-white border rounded-xl overflow-hidden",
                ok ? "border-zinc-200" : "border-amber-200",
              )}
            >
              <button
                type="button"
                onClick={() => setOpenSheet(open ? null : sheet.name)}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-zinc-50"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "size-7 rounded-md inline-flex items-center justify-center",
                      ok ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700",
                    )}
                  >
                    {ok ? (
                      <Check className="size-4" strokeWidth={2.5} />
                    ) : (
                      <AlertTriangle className="size-4" strokeWidth={2} />
                    )}
                  </div>
                  <span className="font-semibold text-zinc-900 text-sm">
                    {sheet.name}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {sheet.rowCount} rows · header row {sheet.headerRow}
                  </span>
                </div>
                {open ? (
                  <ChevronUp className="size-4 text-zinc-500" />
                ) : (
                  <ChevronDown className="size-4 text-zinc-500" />
                )}
              </button>

              {open && (
                <div className="px-5 pb-5 border-t border-zinc-100">
                  {/* Column mapping pills */}
                  <div className="my-4">
                    <div className="text-xs font-semibold text-zinc-700 mb-2">
                      Columns
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {sheet.columns.map((c) => (
                        <div
                          key={c.index}
                          className={cn(
                            "border rounded-lg px-2.5 py-1.5 flex items-center gap-2",
                            KIND_COLOR[c.kind],
                          )}
                        >
                          <div className="leading-tight">
                            <div className="text-[10px] uppercase tracking-wide opacity-75">
                              col {c.index}
                              {c.isQtyTotal ? " · TOTAL" : ""}
                            </div>
                            <div className="text-xs font-medium max-w-[160px] truncate">
                              {c.header || "(blank)"}
                            </div>
                            {c.subHeader && (
                              <div className="text-[10px] opacity-75 truncate max-w-[160px]">
                                ↳ {c.subHeader}
                              </div>
                            )}
                          </div>
                          <select
                            value={c.kind}
                            onChange={(e) =>
                              updateColumn(
                                sheet.name,
                                c.index,
                                e.target.value as ColumnKind,
                              )
                            }
                            className="bg-white border border-zinc-200 rounded text-[11px] px-1 py-0.5"
                          >
                            {KIND_OPTIONS.map((k) => (
                              <option key={k} value={k}>
                                {KIND_LABELS[k]}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sample rows */}
                  {sheet.sampleRows.length > 0 && (
                    <>
                      <div className="text-xs font-semibold text-zinc-700 mb-2">
                        Sample rows (first {sheet.sampleRows.length})
                      </div>
                      <div className="overflow-x-auto border border-zinc-200 rounded-lg">
                        <table className="w-full text-xs">
                          <thead className="border-b border-zinc-200">
                            <tr>
                              {sheet.columns.slice(0, 12).map((c) => (
                                <th
                                  key={c.index}
                                  className={cn(
                                    "px-2 py-1.5 text-left font-medium whitespace-nowrap border-r border-white/60 last:border-r-0",
                                    KIND_HEAD[c.kind],
                                  )}
                                >
                                  <span className="opacity-50 mr-1">{c.index}</span>
                                  {c.header || "—"}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {sheet.sampleRows.map((row, i) => (
                              <tr key={i} className="border-t border-zinc-100">
                                {row.map((v, j) => {
                                  const kind = sheet.columns[j]?.kind ?? "ignore";
                                  return (
                                    <td
                                      key={j}
                                      className={cn(
                                        "px-2 py-1.5 text-zinc-700 whitespace-nowrap max-w-[280px] truncate border-r border-zinc-100 last:border-r-0",
                                        KIND_CELL[kind],
                                      )}
                                    >
                                      {v === null
                                        ? ""
                                        : typeof v === "number"
                                        ? v.toLocaleString()
                                        : String(v)}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
