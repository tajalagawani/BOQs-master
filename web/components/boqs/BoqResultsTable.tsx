"use client";

// BOQ results — the full-screen catalogue of every coded item, styled to match
// the RatesX library (Omnium shell): a left sections sidebar + a dense table
// with sticky sortable headers, a per-column filter row, column show/hide, and
// a compact pagination bar. Scoped by `.omnium-rates` so the shadcn tokens
// (bg-card, text-foreground, accent, …) apply.

import * as React from "react";
import Link from "next/link";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  X,
  SlidersHorizontal,
  LayoutGrid,
  Check,
  GripVertical,
  AlertTriangle,
  ArrowLeft,
  Search,
  Layers,
  FileSpreadsheet,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/modules/rates/components/ui/select";
import { Button } from "@/modules/rates/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/modules/rates/components/ui/dropdown-menu";
import { cn, formatNumber } from "@/modules/rates/lib/utils";
import type { WorkspaceData } from "@/components/BoqWorkspace";
import { nrmInfo } from "@/lib/nrm/nrm-map";

const SECTION_TITLES: Record<string, string> = {
  A: "General Requirements", B: "Site Work", C: "Concrete", D: "Masonry",
  E: "Metalwork", F: "Woodwork", G: "Thermal & Moisture", H: "Doors & Windows",
  J: "Finishes", K: "Accessories", L: "Equipment", M: "Furnishings",
  N: "Special Construction", P: "Conveying", Q: "Mechanical", R: "Electrical",
};
const SECTION_COLOR: Record<string, string> = {
  A: "bg-zinc-100 text-zinc-700", B: "bg-stone-200 text-stone-700",
  C: "bg-slate-200 text-slate-700", D: "bg-orange-100 text-orange-700",
  E: "bg-amber-100 text-amber-700", F: "bg-yellow-100 text-yellow-700",
  G: "bg-lime-100 text-lime-700", H: "bg-emerald-100 text-emerald-700",
  J: "bg-teal-100 text-teal-700", K: "bg-cyan-100 text-cyan-700",
  L: "bg-sky-100 text-sky-700", M: "bg-blue-100 text-blue-700",
  N: "bg-indigo-100 text-indigo-700", P: "bg-violet-100 text-violet-700",
  Q: "bg-fuchsia-100 text-fuchsia-700", R: "bg-rose-100 text-rose-700",
};
const SECTION_DOT: Record<string, string> = {
  A: "bg-zinc-400", B: "bg-stone-500", C: "bg-slate-500", D: "bg-orange-500",
  E: "bg-amber-500", F: "bg-yellow-500", G: "bg-lime-500", H: "bg-emerald-500",
  J: "bg-teal-500", K: "bg-cyan-500", L: "bg-sky-500", M: "bg-blue-500",
  N: "bg-indigo-500", P: "bg-violet-500", Q: "bg-fuchsia-500", R: "bg-rose-500",
};
const STAGE_COLOR: Record<string, string> = {
  Rule: "bg-emerald-100 text-emerald-800",
  Fuzzy: "bg-amber-100 text-amber-800",
  AI: "bg-blue-100 text-blue-800",
};

type Align = "left" | "right" | "center";
type CellType = "mono" | "text" | "number" | "seclabel" | "stage" | "conf" | "flag";
interface Col {
  key: string;
  label: string;
  width: number;
  align: Align;
  type: CellType;
  hidden?: boolean; // hidden by default (still toggleable via the Columns menu)
}

// Column schema mirrors the POMI master layout.
const COLUMNS: Col[] = [
  { key: "rowNum", label: "Row", width: 52, align: "right", type: "number" },
  { key: "ref", label: "REF", width: 64, align: "left", type: "mono" },
  { key: "description", label: "Description", width: 380, align: "left", type: "text" },
  { key: "quantity", label: "Qty", width: 82, align: "right", type: "number" },
  { key: "unit", label: "Unit", width: 60, align: "left", type: "text" },
  { key: "rate", label: "Rate", width: 96, align: "right", type: "number" },
  { key: "amount", label: "Amount", width: 112, align: "right", type: "number" },
  { key: "pomiSection", label: "POMI Section", width: 190, align: "left", type: "seclabel" },
  { key: "code1", label: "Code 1", width: 56, align: "center", type: "mono" },
  { key: "code2", label: "Code 2", width: 64, align: "center", type: "mono" },
  { key: "code3", label: "Code 3", width: 72, align: "center", type: "mono" },
  { key: "code4", label: "Code 4", width: 56, align: "center", type: "mono" },
  { key: "p1name", label: "P1 Name", width: 170, align: "left", type: "text" },
  { key: "p2name", label: "P2 Name", width: 180, align: "left", type: "text" },
  { key: "p3name", label: "P3 Name", width: 200, align: "left", type: "text" },
  { key: "p4name", label: "P4 Name", width: 240, align: "left", type: "text" },
  { key: "subName", label: "POMI Sub Section", width: 200, align: "left", type: "text" },
  { key: "nrmGroup", label: "NRM Group", width: 170, align: "left", type: "text" },
  { key: "nrm", label: "NRM", width: 60, align: "left", type: "mono" },
  { key: "nrmDescription", label: "NRM Description", width: 220, align: "left", type: "text" },
  { key: "nrmClauses", label: "POMI Clauses", width: 320, align: "left", type: "text" },
  { key: "measurement", label: "Measurement", width: 200, align: "left", type: "text" },
  { key: "nrmMethod", label: "Measurement Method", width: 220, align: "left", type: "text" },
  { key: "confidence", label: "Conf%", width: 72, align: "right", type: "conf" },
  { key: "stage", label: "Stage", width: 80, align: "left", type: "stage" },
  { key: "flag", label: "Flag", width: 56, align: "center", type: "flag" },
  // Hidden by default — toggle on via the Columns menu.
  { key: "pomiCode", label: "POMI Code", width: 96, align: "left", type: "mono", hidden: true },
  { key: "sheet", label: "BATCH", width: 140, align: "left", type: "text", hidden: true },
];

// Canonical key order + lookup. `columnOrder` (user-reorderable) holds keys; the
// table renders columns in that order, ignoring any key COLUMNS no longer has.
const DEFAULT_ORDER = COLUMNS.map((c) => c.key);
const COL_BY_KEY: Record<string, Col> = Object.fromEntries(COLUMNS.map((c) => [c.key, c]));
const COLS_STORAGE_KEY = "boq-results-columns:v1";

// Drop a saved order that references unknown keys, and append any column added
// to COLUMNS since the order was saved — so new columns never silently vanish.
function reconcileOrder(saved: unknown): string[] {
  if (!Array.isArray(saved)) return DEFAULT_ORDER;
  const known = saved.filter((k): k is string => typeof k === "string" && k in COL_BY_KEY);
  const seen = new Set(known);
  return [...known, ...DEFAULT_ORDER.filter((k) => !seen.has(k))];
}

const HEADER_H = 34;
const FILTER_H = 32;
const ROW_H = 34;

type Row = Record<string, unknown> & {
  rowNum: number;
  code: string;
  pomiCode: string;
  sectionCode: string; // bare section letter (for sidebar filter + colour)
  sheet: string;
  ref: string;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
  pomiSection: string; // "A — General Requirements"
  code1: string;
  code2: string;
  code3: string;
  code4: string;
  p1name: string;
  p2name: string;
  p3name: string;
  p4name: string;
  subName: string;
  nrm: string;
  nrmGroup: string;
  nrmDescription: string;
  nrmClauses: string;
  measurement: string;
  nrmMethod: string;
  stage: string;
  confidence: number;
  flag: string;
};
type SortState = { key: string; dir: "asc" | "desc" } | null;

export function BoqResultsTable({
  projectId,
  projectName,
  data,
}: {
  projectId: string;
  projectName: string;
  data: WorkspaceData;
}) {
  const rows: Row[] = React.useMemo(() => {
    const out: Row[] = [];
    let n = 0;
    for (const sec of data.sections) {
      for (const it of data.itemsBySection[sec.code] || []) {
        const pc = it.pomiCode || "";
        const ni = nrmInfo(it.nrm);
        out.push({
          rowNum: ++n,
          code: it.code,
          pomiCode: pc,
          sectionCode: sec.code,
          sheet: it.sheetName || "",
          ref: it.ref || "",
          description: it.description,
          unit: it.unit,
          quantity: it.quantity,
          rate: it.rate,
          amount: it.amount,
          pomiSection: it.pomiSection || "",
          // Hierarchical code prefixes: A → A02 → A0200
          code1: pc.slice(0, 1),
          code2: pc.slice(1, 3),
          code3: pc.slice(3, 5),
          code4: pc.slice(5, 7),
          p1name: it.p1name || "",
          p2name: it.p2name || "",
          p3name: it.p3name || "",
          p4name: it.p4name || "",
          subName: it.pomiSubSection || "",
          nrm: it.nrm || "",
          nrmGroup: ni?.group || "",
          nrmDescription: it.nrmDescription || "",
          nrmClauses: ni?.clauses || "",
          measurement: it.measurement || "",
          nrmMethod: ni?.method || "",
          stage: it.stage || "",
          confidence: it.confidence || 0,
          flag: it.flag || "",
        });
      }
    }
    return out;
  }, [data]);

  // Distinct original file sheets (the workbook's tabs), in first-seen order.
  const sheets = React.useMemo(() => {
    const seen = new Set<string>();
    const order: string[] = [];
    for (const r of rows) {
      if (r.sheet && !seen.has(r.sheet)) {
        seen.add(r.sheet);
        order.push(r.sheet);
      }
    }
    return order;
  }, [rows]);
  const sheetCounts = React.useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of rows) if (r.sheet) m[r.sheet] = (m[r.sheet] || 0) + 1;
    return m;
  }, [rows]);
  const hasSheets = sheets.length > 0;

  const [search, setSearch] = React.useState("");
  const [activeSection, setActiveSection] = React.useState("__all__");
  // Default to "All sheets" so a sheet selection never hides a section the user
  // picks in the sidebar (a section's items often live in other sheets).
  const [activeSheet, setActiveSheet] = React.useState<string>("__all__");
  const [reviewOnly, setReviewOnly] = React.useState(false);
  const [colFilters, setColFilters] = React.useState<Record<string, string>>({});
  const [hiddenCols, setHiddenCols] = React.useState<Set<string>>(
    () => new Set(COLUMNS.filter((c) => c.hidden).map((c) => c.key)),
  );
  // The committed column order the table renders by. The Columns menu edits a
  // draft and commits it to this on close ("adopt the table on close").
  const [columnOrder, setColumnOrder] = React.useState<string[]>(DEFAULT_ORDER);
  const [colsMenuOpen, setColsMenuOpen] = React.useState(false);
  const [draftOrder, setDraftOrder] = React.useState<string[]>(DEFAULT_ORDER);
  const [dragKey, setDragKey] = React.useState<string | null>(null);
  const [dropTarget, setDropTarget] = React.useState<{ key: string; after: boolean } | null>(null);
  const [sort, setSort] = React.useState<SortState>(null);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(50);

  React.useEffect(() => setPage(1), [search, activeSection, activeSheet, reviewOnly, colFilters, pageSize]);

  // Restore the saved column order + visibility (client-only; defaults render on
  // the server so there's no hydration mismatch).
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(COLS_STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { order?: unknown; hidden?: unknown };
      const order = reconcileOrder(saved.order);
      setColumnOrder(order);
      setDraftOrder(order);
      if (Array.isArray(saved.hidden)) {
        setHiddenCols(new Set(saved.hidden.filter((k): k is string => typeof k === "string" && k in COL_BY_KEY)));
      }
    } catch {
      /* ignore malformed storage */
    }
  }, []);

  React.useEffect(() => {
    try {
      localStorage.setItem(COLS_STORAGE_KEY, JSON.stringify({ order: columnOrder, hidden: [...hiddenCols] }));
    } catch {
      /* storage unavailable (private mode / quota) — order just won't persist */
    }
  }, [columnOrder, hiddenCols]);

  const orderedColumns = React.useMemo(
    () => columnOrder.map((k) => COL_BY_KEY[k]).filter(Boolean) as Col[],
    [columnOrder],
  );
  const visibleColumns = React.useMemo(
    () => orderedColumns.filter((c) => !hiddenCols.has(c.key)),
    [orderedColumns, hiddenCols],
  );
  const totalWidth = React.useMemo(() => visibleColumns.reduce((s, c) => s + c.width, 0), [visibleColumns]);

  // Export mirrors the table: the same visible columns, in the same order
  // (committed when the Columns menu closes). The server reorders/filters the
  // workbook to match these keys.
  const exportHref = React.useMemo(() => {
    const params = new URLSearchParams({ cols: visibleColumns.map((c) => c.key).join(",") });
    return `/api/run/${projectId}/export?${params.toString()}`;
  }, [visibleColumns, projectId]);

  const filtered = React.useMemo(() => {
    const g = search.trim().toLowerCase();
    const fEntries = Object.entries(colFilters).filter(([, v]) => v && v.trim());
    return rows.filter((r) => {
      if (activeSheet !== "__all__" && r.sheet !== activeSheet) return false;
      if (activeSection !== "__all__" && r.sectionCode !== activeSection) return false;
      if (reviewOnly && r.flag !== "⚠") return false;
      if (g) {
        const hay = `${r.ref} ${r.pomiCode} ${r.code1} ${r.code2} ${r.code3} ${r.code4} ${r.description} ${r.subName} ${r.nrm} ${r.measurement}`.toLowerCase();
        if (!hay.includes(g)) return false;
      }
      for (const [key, val] of fEntries) {
        const v = r[key];
        if (v == null) return false;
        if (!String(v).toLowerCase().includes(val.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [rows, search, activeSection, activeSheet, reviewOnly, colFilters]);

  const sorted = React.useMemo(() => {
    if (!sort) return filtered;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = a[sort.key] as string | number;
      const bv = b[sort.key] as string | number;
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [filtered, sort]);

  const total = sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const visible = sorted.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (key: string) =>
    setSort((s) => (s?.key === key ? (s.dir === "asc" ? { key, dir: "desc" } : null) : { key, dir: "asc" }));
  const toggleCol = (k: string) =>
    setHiddenCols((s) => {
      const next = new Set(s);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  // Columns menu: seed the draft on open, commit it to the live order on close.
  const onColsMenuOpenChange = (open: boolean) => {
    if (open) setDraftOrder(columnOrder);
    else {
      setColumnOrder(draftOrder);
      setDragKey(null);
      setDropTarget(null);
    }
    setColsMenuOpen(open);
  };

  const onColDrop = () => {
    setDraftOrder((prev) => {
      if (!dragKey || !dropTarget) return prev;
      const next = prev.filter((k) => k !== dragKey);
      let idx = next.indexOf(dropTarget.key);
      if (idx < 0) return prev;
      if (dropTarget.after) idx += 1;
      next.splice(idx, 0, dragKey);
      return next;
    });
    setDragKey(null);
    setDropTarget(null);
  };

  const resetCols = () => {
    setHiddenCols(new Set());
    setDraftOrder(DEFAULT_ORDER);
  };

  const activeFilterCount =
    Object.values(colFilters).filter((v) => v && v.trim()).length +
    (search ? 1 : 0) +
    (activeSection !== "__all__" ? 1 : 0) +
    (reviewOnly ? 1 : 0);
  const clearAll = () => {
    setColFilters({});
    setSearch("");
    setActiveSection("__all__");
    setReviewOnly(false);
  };

  const shownAmount = filtered.reduce((s, r) => s + (r.amount || 0), 0);
  const reviewCount = rows.filter((r) => r.flag === "⚠").length;

  return (
    <div className="omnium-rates flex h-full overflow-hidden bg-white text-foreground">
      {/* Sidebar */}
      <BoqSidebar
        projectName={projectName}
        totals={data.totals}
        sections={data.sections}
        totalRows={rows.length}
        search={search}
        onSearch={setSearch}
        active={activeSection}
        onActive={setActiveSection}
      />

      {/* Main */}
      <main className="flex-1 min-w-0 flex flex-col p-1.5 bg-white">
        <div className="flex-1 min-h-0 rounded-md border overflow-hidden bg-card flex flex-col">
          {/* Toolbar */}
          <div className="flex items-center gap-2 px-3 py-2 border-b flex-wrap shrink-0">
            <div className="text-[13px] font-medium px-0.5">
              {activeSection === "__all__"
                ? "All sections"
                : `${activeSection} · ${SECTION_TITLES[activeSection] || ""}`}
            </div>

            <button
              type="button"
              onClick={() => setReviewOnly((v) => !v)}
              disabled={reviewCount === 0}
              className={cn(
                "inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border text-[13px] transition-colors disabled:opacity-40",
                reviewOnly ? "bg-amber-500/10 border-amber-500/40 text-amber-700" : "text-muted-foreground hover:bg-accent/50",
              )}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Review only
              {reviewCount > 0 && <span className="tabular-nums">({reviewCount})</span>}
            </button>

            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAll} className="text-muted-foreground">
                <X className="h-3.5 w-3.5" />
                Clear ({activeFilterCount})
              </Button>
            )}

            <div className="ml-auto flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground tabular-nums hidden md:inline">
                {formatNumber(total, { maximumFractionDigits: 0 })} rows · {formatNumber(shownAmount, { maximumFractionDigits: 0 })}
              </span>

              <DropdownMenu open={colsMenuOpen} onOpenChange={onColsMenuOpenChange}>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    Columns
                    {hiddenCols.size > 0 && (
                      <span className="ml-0.5 inline-flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-foreground text-background text-[10px] tabular-nums">
                        {COLUMNS.length - hiddenCols.size}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-1">
                  <DropdownMenuLabel className="flex items-center justify-between">
                    <span>Columns</span>
                    <button
                      onClick={resetCols}
                      className="text-[10px] font-normal text-muted-foreground hover:text-foreground"
                    >
                      Reset
                    </button>
                  </DropdownMenuLabel>
                  <p className="px-2 pb-1 text-[10px] leading-tight text-muted-foreground/80">
                    Drag to reorder · click to show/hide. New order applies when you close this menu.
                  </p>
                  <DropdownMenuSeparator />
                  <div className="max-h-[60vh] overflow-y-auto scrollbar-thin">
                    {draftOrder.map((key) => {
                      const c = COL_BY_KEY[key];
                      if (!c) return null;
                      const vis = !hiddenCols.has(key);
                      const isDragging = dragKey === key;
                      const isOver = dropTarget?.key === key && dragKey !== key;
                      return (
                        <div
                          key={key}
                          draggable
                          onDragStart={(e) => {
                            setDragKey(key);
                            e.dataTransfer.effectAllowed = "move";
                            // Firefox needs data set for a drag to actually start.
                            e.dataTransfer.setData("text/plain", key);
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                            const r = e.currentTarget.getBoundingClientRect();
                            setDropTarget({ key, after: e.clientY - r.top > r.height / 2 });
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            onColDrop();
                          }}
                          onDragEnd={() => {
                            setDragKey(null);
                            setDropTarget(null);
                          }}
                          className={cn(
                            "relative flex items-center rounded-sm transition-colors",
                            isDragging && "opacity-40",
                          )}
                        >
                          {isOver && (
                            <span
                              className={cn(
                                "pointer-events-none absolute inset-x-1 z-10 h-0.5 rounded-full bg-primary",
                                dropTarget?.after ? "-bottom-px" : "-top-px",
                              )}
                            />
                          )}
                          <span
                            className="shrink-0 grid place-items-center px-1 py-1.5 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-foreground"
                            aria-hidden
                          >
                            <GripVertical className="h-3.5 w-3.5" />
                          </span>
                          <button
                            onClick={() => toggleCol(key)}
                            className="min-w-0 flex-1 flex items-center gap-2 rounded-sm pr-2 py-1.5 text-sm hover:bg-accent text-left"
                          >
                            <span
                              className={cn(
                                "h-4 w-4 rounded-sm border grid place-items-center transition-colors shrink-0",
                                vis ? "bg-primary border-primary text-primary-foreground" : "border-input",
                              )}
                            >
                              {vis && <Check className="h-3 w-3" />}
                            </span>
                            <span className="flex-1 truncate">{c.label}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <Link href={`/boqs/import/${projectId}/master`}>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Master
                </Button>
              </Link>
              <a href={exportHref}>
                <Button size="sm" className="gap-1.5">
                  <Download className="h-3.5 w-3.5" />
                  Export
                </Button>
              </a>
            </div>
          </div>

          {/* Sheet tabs — the original workbook's sheets, like Excel */}
          {hasSheets && (
            <div className="flex items-center gap-0.5 px-2 py-1 border-b overflow-x-auto shrink-0 bg-card">
              <SheetTab active={activeSheet === "__all__"} onClick={() => setActiveSheet("__all__")} label="All sheets" count={rows.length} />
              {sheets.map((s) => (
                <SheetTab
                  key={s}
                  active={activeSheet === s}
                  onClick={() => setActiveSheet(s)}
                  label={s}
                  count={sheetCounts[s] || 0}
                />
              ))}
            </div>
          )}

          {/* Table */}
          <div className="grid-scroller relative flex-1 overflow-auto scrollbar-thin">
            <table
              className="border-collapse text-[13px]"
              style={{ tableLayout: "fixed", width: totalWidth, minWidth: "100%" }}
            >
              <colgroup>
                {visibleColumns.map((c) => (
                  <col key={c.key} style={{ width: c.width }} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  {visibleColumns.map((c) => {
                    const active = sort?.key === c.key;
                    return (
                      <th
                        key={c.key}
                        className={cn(
                          "sticky-top z-20 bg-zinc-50/95 backdrop-blur border-b border-r last:border-r-0 px-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-700",
                          c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left",
                        )}
                        style={{ height: HEADER_H }}
                      >
                        <button
                          onClick={() => toggleSort(c.key)}
                          className={cn(
                            "inline-flex items-center gap-1 hover:text-foreground transition-colors max-w-full",
                            active && "text-foreground",
                            c.align === "right" && "justify-end w-full",
                            c.align === "center" && "justify-center w-full",
                          )}
                        >
                          <span className="truncate">{c.label}</span>
                          {active ? (
                            sort?.dir === "asc" ? <ArrowUp className="h-3 w-3 shrink-0" /> : <ArrowDown className="h-3 w-3 shrink-0" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-40 shrink-0" />
                          )}
                        </button>
                      </th>
                    );
                  })}
                </tr>
                <tr>
                  {visibleColumns.map((c) => (
                    <th
                      key={c.key}
                      className="sticky-top-2 z-20 bg-card border-b border-r last:border-r-0 px-1"
                      style={{ height: FILTER_H }}
                    >
                      <input
                        type="text"
                        value={colFilters[c.key] || ""}
                        onChange={(e) => setColFilters((f) => ({ ...f, [c.key]: e.target.value }))}
                        placeholder={c.label}
                        className={cn(
                          "w-full h-6 px-1.5 rounded-md border border-transparent bg-transparent text-[11px] placeholder:text-muted-foreground hover:bg-accent/50 focus-visible:outline-none focus-visible:bg-background focus-visible:border-input transition-colors",
                          c.align === "right" && "text-right",
                          colFilters[c.key] && "border-input bg-background text-foreground font-medium",
                        )}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((r, i) => (
                  <tr key={i} className="group transition-colors">
                    {visibleColumns.map((c) => (
                      <td
                        key={c.key}
                        className={cn(
                          "border-b border-r last:border-r-0 px-2",
                          r.flag === "⚠" ? "bg-amber-50/60 group-hover:bg-amber-50" : "bg-card group-hover:bg-accent/40",
                          c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left",
                        )}
                        style={{ height: ROW_H }}
                      >
                        <Cell type={c.type} value={r[c.key]} row={r} />
                      </td>
                    ))}
                  </tr>
                ))}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={visibleColumns.length} className="h-40 text-center text-muted-foreground text-sm bg-card">
                      No items match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="border-t px-3 h-7 flex items-center gap-2 text-[11px] text-muted-foreground shrink-0">
            <div>
              <span className="text-foreground font-medium tabular-nums">{total === 0 ? 0 : (page - 1) * pageSize + 1}</span>
              {"–"}
              <span className="text-foreground font-medium tabular-nums">{Math.min(page * pageSize, total)}</span>{" "}
              of <span className="text-foreground font-medium tabular-nums">{formatNumber(total, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                <SelectTrigger className="h-5 w-[56px] text-[11px] px-1.5 gap-0.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[25, 50, 100, 200].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center">
                <PgBtn onClick={() => setPage(1)} disabled={page <= 1}><ChevronsLeft className="h-3 w-3" /></PgBtn>
                <PgBtn onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}><ChevronLeft className="h-3 w-3" /></PgBtn>
                <span className="px-1.5 tabular-nums">{page}/{pageCount}</span>
                <PgBtn onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={page >= pageCount}><ChevronRight className="h-3 w-3" /></PgBtn>
                <PgBtn onClick={() => setPage(pageCount)} disabled={page >= pageCount}><ChevronsRight className="h-3 w-3" /></PgBtn>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function BoqSidebar({
  projectName,
  totals,
  sections,
  totalRows,
  search,
  onSearch,
  active,
  onActive,
}: {
  projectName: string;
  totals: WorkspaceData["totals"];
  sections: WorkspaceData["sections"];
  totalRows: number;
  search: string;
  onSearch: (v: string) => void;
  active: string;
  onActive: (v: string) => void;
}) {
  return (
    <aside className="hidden lg:flex flex-col w-[230px] shrink-0 bg-card">
      {/* Project header */}
      <div className="px-3 pt-3 pb-2.5">
        <Link href="/boqs" className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground mb-1.5">
          <ArrowLeft className="h-3 w-3" />
          All projects
        </Link>
        <div className="flex items-start gap-2">
          <div className="h-7 w-7 rounded-md bg-zinc-100 grid place-items-center shrink-0">
            <FileSpreadsheet className="h-3.5 w-3.5 text-zinc-600" />
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold leading-tight truncate" title={projectName}>{projectName}</div>
            <div className="text-[10.5px] text-muted-foreground tabular-nums">
              {formatNumber(totals.items, { maximumFractionDigits: 0 })} items
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 pt-3 pb-1">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search items…"
            className="w-full h-8 pl-8 pr-7 rounded-md border bg-background text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          {search && (
            <button
              onClick={() => onSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 grid place-items-center rounded-sm text-muted-foreground hover:text-foreground hover:bg-accent"
              aria-label="Clear"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Sections nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 scrollbar-thin">
        <div className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Sections
        </div>
        <ul className="space-y-0.5">
          <li>
            <SidebarItem
              active={active === "__all__"}
              onClick={() => onActive("__all__")}
              dot="bg-foreground/40"
              label="All sections"
              icon={<Layers className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
              count={totalRows}
            />
          </li>
          {sections.map((s) => (
            <li key={s.code}>
              <SidebarItem
                active={active === s.code}
                onClick={() => onActive(s.code)}
                dot={SECTION_DOT[s.code] || "bg-muted-foreground/30"}
                label={`${s.code} · ${SECTION_TITLES[s.code] || s.name}`}
                count={s.itemCount}
              />
            </li>
          ))}
        </ul>
      </nav>

      {/* Totals footer */}
      <div className="p-3">
        <div className="rounded-md bg-background border p-2.5">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total amount</div>
          <div className="text-sm font-semibold tabular-nums">
            {formatNumber(totals.amount, { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[10.5px] text-muted-foreground mt-0.5 tabular-nums">
            {totals.items} items · {totals.sections} sections
          </div>
        </div>
      </div>
    </aside>
  );
}

function SidebarItem({
  active,
  onClick,
  dot,
  label,
  icon,
  count,
}: {
  active: boolean;
  onClick: () => void;
  dot: string;
  label: string;
  icon?: React.ReactNode;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full group flex items-center gap-2 rounded-md pl-2 pr-2 py-1.5 text-[13px] transition-colors",
        active ? "bg-accent/70 text-foreground" : "text-foreground/75 hover:text-foreground hover:bg-accent/40",
      )}
    >
      <span className={cn("h-4 w-1 rounded-full shrink-0", dot)} />
      {icon}
      <span className={cn("flex-1 text-left truncate", active && "font-medium")}>{label}</span>
      <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">{count}</span>
    </button>
  );
}

function Cell({ type, value, row }: { type: CellType; value: unknown; row: Row }) {
  if (type === "mono")
    return <span className="font-mono text-[12px] text-muted-foreground">{String(value ?? "")}</span>;
  if (type === "number") {
    const n = value as number;
    return (
      <span className="tabular-nums">
        {n ? formatNumber(n, { maximumFractionDigits: 2 }) : <span className="text-muted-foreground/50">—</span>}
      </span>
    );
  }
  if (type === "seclabel") {
    const s = String(value ?? "");
    if (!s) return <span className="text-muted-foreground/50">—</span>;
    const letter = row.sectionCode || s.charAt(0).toUpperCase();
    return (
      <span className="flex items-center gap-1.5 min-w-0" title={s}>
        <span className={cn("h-3.5 w-1 rounded-full shrink-0", SECTION_DOT[letter] || "bg-muted-foreground/30")} />
        <span className="truncate">{s}</span>
      </span>
    );
  }
  if (type === "flag") {
    const s = String(value ?? "");
    if (s === "⚠") return <span className="text-amber-600" title="needs review">⚠</span>;
    if (s === "✓") return <span className="text-emerald-600">✓</span>;
    return <span className="text-muted-foreground/40">—</span>;
  }
  if (type === "stage") {
    const s = String(value ?? "");
    if (!s) return <span className="text-muted-foreground/50">—</span>;
    return (
      <span className={cn("inline-flex px-1.5 py-0.5 rounded text-[10.5px] font-medium", STAGE_COLOR[s] || "bg-zinc-100 text-zinc-600")}>{s}</span>
    );
  }
  if (type === "conf") {
    const c = (value as number) || 0;
    if (!c) return <span className="text-muted-foreground/50">—</span>;
    const color = c >= 85 ? "bg-emerald-100 text-emerald-700" : c >= 70 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";
    return (
      <span className={cn("px-1.5 py-0.5 rounded text-[11px] tabular-nums", color)} title={row.flag === "⚠" ? "needs review" : ""}>
        {Math.round(c)}
      </span>
    );
  }
  const s = String(value ?? "");
  return <span className="block truncate" title={s}>{s || <span className="text-muted-foreground/50">—</span>}</span>;
}

function SheetTab({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={cn(
        "shrink-0 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[12px] whitespace-nowrap transition-colors max-w-[220px]",
        active
          ? "bg-accent/70 text-foreground font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-accent/40",
      )}
    >
      <span className="truncate">{label}</span>
      <span className={cn("tabular-nums text-[10.5px]", active ? "text-muted-foreground" : "text-muted-foreground/70")}>
        {count}
      </span>
    </button>
  );
}

function PgBtn({ onClick, disabled, children }: { onClick: () => void; disabled: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="h-5 w-5 grid place-items-center rounded hover:bg-accent disabled:opacity-30 disabled:pointer-events-none"
    >
      {children}
    </button>
  );
}
