"use client";

import * as React from "react";
import * as XLSX from "xlsx";
import { getParser } from "@/modules/rates/lib/parsers";
import { getSchema } from "@/modules/rates/lib/schemas";
import {
  FileSpreadsheet,
  FileJson,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Hash,
  Layers,
  Rows,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/modules/rates/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/modules/rates/components/ui/select";
import { Button } from "@/modules/rates/components/ui/button";
import { cn, formatNumber } from "@/modules/rates/lib/utils";

type ParsedSheet = {
  name: string;
  headers: string[];
  rows: any[][];
  totalRows: number;
};

type Parsed = {
  kind: "xlsx" | "csv" | "json";
  sheets: ParsedSheet[];
  workbook: XLSX.WorkBook | null;
};

export type UploadResult = {
  name: string;
  size: number;
  rowCount: number;
  sheetName?: string;
  headers: string[];
  rows: any[][];
  targetTab: string;
  /** Set when a registered parser produced clean rows for this (section, tab).
   *  When present the receiver should use these rows directly and skip the
   *  generic alias-based mapper. */
  parsedRows?: Record<string, unknown>[];
};

type Props = {
  file: File | null;
  onCancel: () => void;
  onConfirm: (result: UploadResult) => void;
  targetTabs: string[];
  defaultTargetTab: string;
  /* Used to rank workbook sheets and auto-pick the most relevant one. */
  sectionName?: string;
};

const PREVIEW_ROWS = 50;

export function UploadPreviewDialog({
  file,
  onCancel,
  onConfirm,
  targetTabs,
  defaultTargetTab,
  sectionName,
}: Props) {
  const [parsed, setParsed] = React.useState<Parsed | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [activeSheet, setActiveSheet] = React.useState<string>("");
  const [targetTab, setTargetTab] = React.useState<string>(defaultTargetTab);
  const needsTabPick = targetTabs.length > 1;

  /* Explicit parser for the current target — when present, this drives
   *  the preview and the imported rows instead of the raw sheet view. */
  const parser = React.useMemo(
    () => (sectionName ? getParser(sectionName, targetTab) : null),
    [sectionName, targetTab]
  );
  const schema = React.useMemo(
    () => (sectionName ? getSchema(sectionName, targetTab) : null),
    [sectionName, targetTab]
  );
  const parsedRows = React.useMemo(() => {
    if (!parser || !parsed?.workbook) return null;
    try {
      const rows = parser(parsed.workbook);
      return rows.length > 0 ? rows : null;
    } catch {
      return null;
    }
  }, [parser, parsed]);

  React.useEffect(() => {
    setTargetTab(defaultTargetTab);
  }, [defaultTargetTab, file]);

  React.useEffect(() => {
    if (!file) {
      setParsed(null);
      setError(null);
      setActiveSheet("");
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await parseFile(file);
        if (cancelled) return;
        setParsed(result);
        // Pick the best sheet by relevance score.
        const best = pickBestSheet(
          result.sheets,
          sectionName,
          defaultTargetTab
        );
        setActiveSheet(best?.name ?? "");
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to parse file");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file]);

  const sheet =
    parsed?.sheets.find((s) => s.name === activeSheet) ?? parsed?.sheets[0];

  const FileIcon =
    parsed?.kind === "json"
      ? FileJson
      : parsed?.kind === "csv"
      ? FileText
      : FileSpreadsheet;

  return (
    <Dialog
      open={!!file}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent className="max-w-5xl p-0">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "h-10 w-10 rounded-lg grid place-items-center shrink-0",
                error
                  ? "bg-rose-500/10 text-rose-600"
                  : "bg-emerald-500/10 text-emerald-600"
              )}
            >
              {error ? (
                <AlertCircle className="h-5 w-5" />
              ) : (
                <FileIcon className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate">
                {file?.name ?? "Upload preview"}
              </DialogTitle>
              <DialogDescription className="mt-0.5">
                {file
                  ? `${formatNumber(file.size / 1024, {
                      maximumFractionDigits: 1,
                    })} KB · review the data below before importing`
                  : "Choose a file to preview"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="px-5 py-4 max-h-[68vh] overflow-hidden flex flex-col gap-3">
          {loading && (
            <div className="h-40 grid place-items-center text-muted-foreground text-sm">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Parsing file…
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-md border border-rose-500/30 bg-rose-500/5 text-rose-700 dark:text-rose-300 text-sm p-3">
              {error}
            </div>
          )}

          {!loading && !error && sheet && parsed && (
            <>
              {/* Target tab — required when section has multiple tabs */}
              {needsTabPick && (
                <div className="rounded-md border bg-amber-500/5 border-amber-500/30 p-3 flex items-center gap-3 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <div className="text-[11px] uppercase tracking-wider font-semibold text-amber-700 dark:text-amber-300">
                      Import into
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      This section has several tabs — pick the one this file
                      replaces.
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1 rounded-md bg-card border p-0.5">
                    {targetTabs.map((t) => {
                      const active = t === targetTab;
                      return (
                        <button
                          key={t}
                          onClick={() => setTargetTab(t)}
                          className={cn(
                            "h-7 px-2.5 text-xs rounded-[5px] transition-colors",
                            active
                              ? "bg-primary text-primary-foreground font-medium"
                              : "text-muted-foreground hover:text-foreground hover:bg-accent"
                          )}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Parser banner */}
              {parser && parsedRows && schema && (
                <div className="rounded-md border bg-emerald-500/5 border-emerald-500/30 px-3 py-2 flex items-center gap-2 text-xs">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-emerald-700 dark:text-emerald-300">
                      Using explicit parser for {sectionName} → {targetTab}
                    </div>
                    <div className="text-muted-foreground">
                      Mapped {formatNumber(parsedRows.length)} clean rows into
                      the {schema.columns.length} schema columns.
                    </div>
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <SummaryStat
                  icon={Layers}
                  label="Sheets"
                  value={String(parsed.sheets.length)}
                />
                <SummaryStat
                  icon={Hash}
                  label={parsedRows ? "Mapped Columns" : "Columns"}
                  value={String(
                    parsedRows && schema
                      ? schema.columns.length
                      : sheet.headers.length
                  )}
                />
                <SummaryStat
                  icon={Rows}
                  label="Rows"
                  value={formatNumber(
                    parsedRows ? parsedRows.length : sheet.totalRows,
                    { maximumFractionDigits: 0 }
                  )}
                />
                <SummaryStat
                  icon={CheckCircle2}
                  label="Format"
                  value={parsed.kind.toUpperCase()}
                />
              </div>

              {/* Sheet selector if multi-sheet xlsx */}
              {parsed.sheets.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Sheet</span>
                  <Select
                    value={activeSheet}
                    onValueChange={setActiveSheet}
                  >
                    <SelectTrigger className="h-7 text-xs w-auto min-w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {parsed.sheets.map((s) => (
                        <SelectItem key={s.name} value={s.name}>
                          {s.name}{" "}
                          <span className="text-muted-foreground">
                            ({formatNumber(s.totalRows, {
                              maximumFractionDigits: 0,
                            })}{" "}
                            rows)
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Column chips (only show columns that actually have a name) */}
              <div className="flex flex-wrap gap-1">
                {sheet.headers
                  .filter((h) => h && h.trim())
                  .slice(0, 30)
                  .map((h, i) => (
                    <span
                      key={i}
                      className="text-[10px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700"
                    >
                      {h}
                    </span>
                  ))}
                {sheet.headers.filter((h) => h && h.trim()).length > 30 && (
                  <span className="text-[10px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded text-muted-foreground">
                    +{sheet.headers.filter((h) => h && h.trim()).length - 30}{" "}
                    more
                  </span>
                )}
              </div>

              {/* Preview table — parser-driven view when a parser is active */}
              {parsedRows && schema ? (
                <>
                  <div className="flex-1 min-h-0 overflow-auto scrollbar-thin rounded-md border">
                    <table className="w-full text-[12px] border-collapse">
                      <thead className="sticky top-0 bg-zinc-50/95 backdrop-blur z-10">
                        <tr>
                          <th className="px-2 py-1.5 text-left text-[10px] uppercase tracking-wider font-semibold text-zinc-700 border-b w-12">
                            #
                          </th>
                          {schema.columns.map((c) => (
                            <th
                              key={c.key}
                              className="px-2 py-1.5 text-left text-[10px] uppercase tracking-wider font-semibold text-zinc-700 border-b whitespace-nowrap"
                            >
                              {c.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {parsedRows.slice(0, PREVIEW_ROWS).map((row, ri) => (
                          <tr
                            key={ri}
                            className={cn(
                              "hover:bg-accent/40",
                              ri % 2 === 1 && "bg-muted/20"
                            )}
                          >
                            <td className="px-2 py-1 text-[10px] tabular-nums text-muted-foreground border-b">
                              {ri + 1}
                            </td>
                            {schema.columns.map((c) => {
                              const v = (row as any)[c.key];
                              const text =
                                v == null
                                  ? ""
                                  : typeof v === "number"
                                  ? formatNumber(v)
                                  : String(v);
                              return (
                                <td
                                  key={c.key}
                                  className="px-2 py-1 border-b whitespace-nowrap max-w-[260px] truncate"
                                  title={text}
                                >
                                  {text || (
                                    <span className="text-muted-foreground/50">
                                      —
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {parsedRows.length > PREVIEW_ROWS && (
                    <div className="text-[11px] text-muted-foreground">
                      Showing first {PREVIEW_ROWS} of{" "}
                      {formatNumber(parsedRows.length, {
                        maximumFractionDigits: 0,
                      })}{" "}
                      parsed rows.
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex-1 min-h-0 overflow-auto scrollbar-thin rounded-md border">
                    <table className="w-full text-[12px] border-collapse">
                      <thead className="sticky top-0 bg-zinc-50/95 backdrop-blur z-10">
                        <tr>
                          <th className="px-2 py-1.5 text-left text-[10px] uppercase tracking-wider font-semibold text-zinc-700 border-b w-12">
                            #
                          </th>
                          {sheet.headers.map((h, i) => (
                            <th
                              key={i}
                              className="px-2 py-1.5 text-left text-[10px] uppercase tracking-wider font-semibold text-zinc-700 border-b whitespace-nowrap"
                              title={h}
                            >
                              {h && h.trim() ? (
                                h
                              ) : (
                                <span className="text-muted-foreground/40 normal-case font-normal italic">
                                  (unnamed)
                                </span>
                              )}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sheet.rows.slice(0, PREVIEW_ROWS).map((row, ri) => (
                          <tr
                            key={ri}
                            className={cn(
                              "hover:bg-accent/40",
                              ri % 2 === 1 && "bg-muted/20"
                            )}
                          >
                            <td className="px-2 py-1 text-[10px] tabular-nums text-muted-foreground border-b">
                              {ri + 1}
                            </td>
                            {sheet.headers.map((_, ci) => {
                              const v = row[ci];
                              const text =
                                v == null
                                  ? ""
                                  : typeof v === "number"
                                  ? formatNumber(v)
                                  : String(v);
                              return (
                                <td
                                  key={ci}
                                  className="px-2 py-1 border-b whitespace-nowrap max-w-[260px] truncate"
                                  title={text}
                                >
                                  {text || (
                                    <span className="text-muted-foreground/50">
                                      —
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {sheet.totalRows > PREVIEW_ROWS && (
                    <div className="text-[11px] text-muted-foreground">
                      Showing first {PREVIEW_ROWS} of{" "}
                      {formatNumber(sheet.totalRows, {
                        maximumFractionDigits: 0,
                      })}{" "}
                      rows.
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!sheet || loading || !!error}
            onClick={() => {
              if (!file || !sheet) return;
              onConfirm({
                name: file.name,
                size: file.size,
                rowCount: parsedRows ? parsedRows.length : sheet.totalRows,
                sheetName: sheet.name,
                headers: sheet.headers,
                rows: sheet.rows,
                targetTab,
                parsedRows: parsedRows ?? undefined,
              });
            }}
          >
            Import{" "}
            {parsedRows
              ? formatNumber(parsedRows.length, { maximumFractionDigits: 0 })
              : sheet &&
                formatNumber(sheet.totalRows, { maximumFractionDigits: 0 })}{" "}
            rows
            {needsTabPick && (
              <span className="opacity-80">→ {targetTab}</span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border bg-card px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="text-base font-semibold tabular-nums tracking-tight mt-0.5">
        {value}
      </div>
    </div>
  );
}

/* -------------------- Parsing -------------------- */

async function parseFile(file: File): Promise<Parsed> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (ext === "json") {
    const text = await file.text();
    const data = JSON.parse(text);
    return parseJson(data);
  }

  // xlsx, xls, csv — all readable by SheetJS
  const ab = await file.arrayBuffer();
  const wb = XLSX.read(ab, { type: "array" });
  const sheets: ParsedSheet[] = wb.SheetNames.map((name) => {
    const ws = wb.Sheets[name];
    const aoa = XLSX.utils.sheet_to_json<any[]>(ws, {
      header: 1,
      defval: null,
      blankrows: false,
    });
    // Pick the row with the most non-empty cells in the first few rows
    // as the header — handles Excel pivot tables and reports that have
    // a title row or two above the real headers.
    const headerRowIdx = detectHeaderRow(aoa);
    const headers = (aoa[headerRowIdx] ?? []).map((h) =>
      h == null ? "" : String(h)
    );
    const rows = aoa.slice(headerRowIdx + 1);
    return { name, headers, rows, totalRows: rows.length };
  });
  return {
    kind: ext === "csv" ? "csv" : "xlsx",
    sheets,
    workbook: wb,
  };
}

/** Score every sheet by how relevant its name is to the current section/tab
 *  and how dense its data is, then return the highest-scoring sheet.
 *  Penalises common "reference"/"template"/"pivot" sheets that exist alongside
 *  the real data in many of the source workbooks. */
function pickBestSheet(
  sheets: ParsedSheet[],
  section?: string,
  tab?: string
): ParsedSheet | undefined {
  if (sheets.length === 0) return undefined;
  if (sheets.length === 1) return sheets[0];

  const t = (tab ?? "").toLowerCase();
  const s = (section ?? "").toLowerCase();

  const scored = sheets.map((sh) => {
    const name = sh.name.toLowerCase();
    let score = 0;

    // Name relevance — exact word matches win.
    const tabWords = t.split(/\s+/).filter(Boolean);
    const secWords = s.split(/\s+/).filter(Boolean);
    for (const w of tabWords) if (w && name.includes(w)) score += 60;
    for (const w of secWords) if (w && name.includes(w)) score += 30;

    // Penalise scratch / reference / template sheets.
    if (/\bref\b|-ref\b|template|backup|archive|old|copy|sheet\d+$/i.test(name))
      score -= 200;
    if (/pivot|chart|notes|readme|index|cover|inflation/i.test(name))
      score -= 80;

    // Density: rows + non-empty headers.
    score += Math.min(sh.totalRows / 50, 30);
    score += sh.headers.filter((h) => h && String(h).trim() !== "").length;

    return { sh, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].sh;
}

/** Scan the first few rows and pick the most likely header row:
 *  - reward string cells (headers are almost always text)
 *  - penalise numeric cells (data rows are mostly numbers)
 *  - tiebreak on raw non-empty count. */
function detectHeaderRow(aoa: any[][]): number {
  let bestIdx = 0;
  let bestScore = -Infinity;
  const scanLimit = Math.min(aoa.length, 8);
  for (let i = 0; i < scanLimit; i++) {
    const row = aoa[i] ?? [];
    let strings = 0;
    let numbers = 0;
    let nonEmpty = 0;
    for (const c of row) {
      if (c == null || String(c).trim() === "") continue;
      nonEmpty++;
      if (typeof c === "number") {
        numbers++;
        continue;
      }
      // string that's actually a number? still count it as a number
      const s = String(c).trim();
      if (s !== "" && !Number.isNaN(Number(s.replace(/[, ]/g, "")))) {
        numbers++;
      } else {
        strings++;
      }
    }
    if (nonEmpty === 0) continue;
    // Header row has high string-share; data rows are number-heavy.
    const score = strings * 10 - numbers * 3 + nonEmpty * 0.1;
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function parseJson(data: unknown): Parsed {
  if (Array.isArray(data) && data.length > 0 && typeof data[0] === "object") {
    const headers = Array.from(
      new Set(data.flatMap((r) => Object.keys(r as object)))
    );
    const rows = (data as any[]).map((r) => headers.map((h) => r[h] ?? null));
    return {
      kind: "json",
      sheets: [{ name: "data", headers, rows, totalRows: rows.length }],
      workbook: null,
    };
  }
  throw new Error(
    "JSON must be an array of objects, e.g. [{\"col\": value}, …]"
  );
}
