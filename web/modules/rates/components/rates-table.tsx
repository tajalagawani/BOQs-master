"use client";

import * as React from "react";
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
  Sparkles,
  MoreHorizontal,
  Upload,
  Inbox,
  Check,
  Trash2,
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
  TooltipProvider,
} from "@/modules/rates/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/modules/rates/components/ui/dropdown-menu";
import { UploadPreviewDialog } from "@/modules/rates/components/upload-preview-dialog";
import { TypedCell } from "@/modules/rates/components/typed-cell";
import { mapUploadToSchema } from "@/modules/rates/lib/upload-mapper";
import {
  type Column,
  getSchema,
  getTabs,
  schemaKey,
} from "@/modules/rates/lib/schemas";
import { loadJson, saveJson } from "@/modules/rates/lib/persist";
import { cn, formatNumber } from "@/modules/rates/lib/utils";

const STORE_KEY = "uploads";

type Row = Record<string, unknown>;

type UploadMeta = {
  name: string;
  size: number;
  rowCount: number;
  sheetName?: string;
};

type DataEntry = { meta: UploadMeta; rows: Row[]; extraColumns: Column[] };
type DataStore = Record<string, DataEntry | undefined>;

type SortState = { key: string; dir: "asc" | "desc" } | null;

const CHECK_W = 36;
const ACTIONS_W = 40;
const HEADER_H = 34;
const FILTER_H = 32;

type Props = {
  /* legacy seed used for Buildings :: Rates while we wait for uploads to fill
   *  out other (section, tab) combos. */
  seedRows: Row[];
  seedFilters: Record<string, string[]>;
  /** Snapshots already persisted in the main IOX DB. Hydrates the in-memory
   *  store on mount so any browser sees every section a teammate uploaded. */
  persisted?: DataStore;
  search: string;
  onSearchChange: (v: string) => void;
  activeSection: string;
};

export function RatesTable({
  seedRows,
  seedFilters,
  persisted,
  search,
  onSearchChange,
  activeSection,
}: Props) {
  const global = search;
  const tabsForSection = getTabs(activeSection);
  const showTabs = tabsForSection.length > 0;

  const [activeTab, setActiveTab] = React.useState<string>(
    tabsForSection[0] ?? ""
  );
  React.useEffect(() => {
    setActiveTab(tabsForSection[0] ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

  const baseSchema = React.useMemo(
    () => getSchema(activeSection, activeTab),
    [activeSection, activeTab]
  );

  /* ---------- per-key data store ----------
   *  Seeded synchronously from the IOX DB snapshots passed in via `persisted`
   *  so the first paint already shows every uploaded section. localStorage
   *  acts as a fallback cache when the DB is unreachable. Writes are mirrored
   *  to /api/rates/uploads so other browsers see the change after refresh. */
  const [data, setData] = React.useState<DataStore>(() => persisted ?? {});
  const [storageWarn, setStorageWarn] = React.useState(false);
  // Result of the last push into the RatesX warehouse (the "lib" the AI reads).
  // null = idle, "saving" = in flight; otherwise inserted/skipped or an error.
  const [libStatus, setLibStatus] = React.useState<
    | null
    | { kind: "saving" }
    | { kind: "ok"; inserted: number; skipped: number }
    | { kind: "error"; reason: string }
  >(null);
  const hydrated = React.useRef(false);

  // Hydrate from localStorage once on mount — only used when the DB returned
  // nothing for this key (e.g. unauthenticated previews, dev without Postgres).
  React.useEffect(() => {
    const local = loadJson<DataStore>(STORE_KEY, {});
    if (local && Object.keys(local).length > 0) {
      setData((prev) => ({ ...local, ...prev }));
    }
    hydrated.current = true;
  }, []);

  // Save to localStorage on every change. Falls back to a warning chip on
  // quota errors. We don't push to the server here — pushes happen at the
  // point of upload/delete so we don't replay the full table on every tick.
  React.useEffect(() => {
    if (Object.keys(data).length === 0) {
      saveJson(STORE_KEY, {});
      setStorageWarn(false);
      return;
    }
    const ok = saveJson(STORE_KEY, data);
    setStorageWarn(!ok);
  }, [data]);

  const currentKey = schemaKey(activeSection, activeTab || "_");
  const isBuildingsRates = currentKey === schemaKey("Buildings", "Rates");
  const upload = data[currentKey];
  const activeRows: Row[] = upload?.rows ?? (isBuildingsRates ? seedRows : []);
  const uploadedMeta = upload?.meta ?? null;
  const filtersForKey: Record<string, string[]> = isBuildingsRates
    ? seedFilters
    : {};

  /* Merge any synthetic columns from the uploaded file onto the schema. */
  const schema = React.useMemo(() => {
    if (!baseSchema) return null;
    const extra = upload?.extraColumns ?? [];
    if (extra.length === 0) return baseSchema;
    // Drop any extra column whose key collides with the schema or an earlier
    // extra — older snapshots can hold duplicate `extra_*` keys which would
    // crash the render with React's "two children with the same key".
    const seen = new Set(baseSchema.columns.map((c) => c.key));
    const uniqueExtra = extra.filter((c) => {
      if (seen.has(c.key)) return false;
      seen.add(c.key);
      return true;
    });
    return { ...baseSchema, columns: [...baseSchema.columns, ...uniqueExtra] };
  }, [baseSchema, upload]);

  /* ---------- filters / sort / pagination ---------- */
  const [colFilters, setColFilters] = React.useState<Record<string, string>>(
    {}
  );
  const [hiddenCols, setHiddenCols] = React.useState<Set<string>>(new Set());
  const [sort, setSort] = React.useState<SortState>(null);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(50);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  // Reset state when the schema changes.
  React.useEffect(() => {
    setColFilters({});
    setHiddenCols(new Set());
    setSort(null);
    setPage(1);
    setSelected(new Set());
  }, [currentKey]);

  React.useEffect(() => setPage(1), [global, colFilters, pageSize]);

  /* ---------- upload flow ---------- */
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = React.useState<File | null>(null);

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPendingFile(file);
  };

  /* ---------- derived data ---------- */
  const visibleColumns = React.useMemo(
    () => (schema ? schema.columns.filter((c) => !hiddenCols.has(c.key)) : []),
    [schema, hiddenCols]
  );

  const totalWidth = React.useMemo(
    () =>
      CHECK_W +
      ACTIONS_W +
      visibleColumns.reduce((s, c) => s + c.width, 0),
    [visibleColumns]
  );

  const filtered = React.useMemo(() => {
    if (!schema) return [] as Row[];
    const g = global.trim().toLowerCase();
    const fEntries = Object.entries(colFilters).filter(
      ([, v]) => v && v.trim()
    );

    return activeRows.filter((r) => {
      if (g) {
        const hay = schema.columns
          .map((c) => r[c.key])
          .filter((v) => v != null)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(g)) return false;
      }
      for (const [key, val] of fEntries) {
        const v = r[key];
        if (v == null) return false;
        if (!String(v).toLowerCase().includes(val.trim().toLowerCase()))
          return false;
      }
      return true;
    });
  }, [activeRows, schema, global, colFilters]);

  const sorted = React.useMemo(() => {
    if (!sort) return filtered;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number")
        return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [filtered, sort]);

  const total = sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const visible = sorted.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (key: string) => {
    setSort((s) =>
      s?.key === key
        ? s.dir === "asc"
          ? { key, dir: "desc" }
          : null
        : { key, dir: "asc" }
    );
  };

  const toggleCol = (k: string) => {
    setHiddenCols((s) => {
      const next = new Set(s);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const activeFilterCount =
    Object.values(colFilters).filter((v) => v && v.trim()).length +
    (global ? 1 : 0);

  const clearAll = () => {
    setColFilters({});
    onSearchChange("");
  };

  /* ---------- selection ---------- */
  const rowId = (r: Row, fallback: number) =>
    r.ref != null ? String(r.ref) : `idx-${fallback}`;

  const filteredIds = React.useMemo(
    () => sorted.map((r, i) => rowId(r, i)),
    [sorted]
  );
  const allFilteredSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selected.has(id));
  const someFilteredSelected =
    !allFilteredSelected && filteredIds.some((id) => selected.has(id));

  const toggleAll = () => {
    setSelected((prev) => {
      if (allFilteredSelected) {
        const next = new Set(prev);
        for (const id of filteredIds) next.delete(id);
        return next;
      }
      const next = new Set(prev);
      for (const id of filteredIds) next.add(id);
      return next;
    });
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = () => {
    if (selected.size === 0) return;
    const remaining = activeRows.filter(
      (r, i) => !selected.has(rowId(r, i))
    );
    let nextEntry: DataEntry | null = null;
    setData((prev) => {
      const existing = prev[currentKey];
      nextEntry = {
        meta: existing?.meta ?? {
          name: isBuildingsRates ? "rates.json (edited)" : `${activeTab}`,
          size: 0,
          rowCount: remaining.length,
        },
        rows: remaining,
        extraColumns: existing?.extraColumns ?? [],
      };
      return { ...prev, [currentKey]: nextEntry };
    });
    setSelected(new Set());
    if (nextEntry) {
      void syncUpload(activeSection, activeTab, nextEntry);
    }
  };

  /** Push a snapshot to the main IOX DB. Errors are surfaced via console but
   *  don't disrupt the UI — the localStorage cache keeps the data alive. */
  const syncUpload = async (
    section: string,
    tab: string,
    entry: DataEntry,
  ) => {
    setLibStatus({ kind: "saving" });
    try {
      const res = await fetch("/api/rates/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, tab, ...entry }),
      });
      if (!res.ok) {
        const text = await res.text();
        console.warn("[rates] failed to sync upload to DB:", res.status, text);
        setLibStatus({ kind: "error", reason: `HTTP ${res.status}` });
        return;
      }
      // The route normalizes the rows into the v2 warehouse via dispatchUpload
      // and reports the outcome under `v2`. Surface it so the user knows the
      // mapping actually landed in the lib the AI queries — a silent 0-row push
      // (e.g. a schema mismatch) is the failure mode we want to make visible.
      const body = (await res.json().catch(() => null)) as
        | { v2?: { kind?: string; result?: { inserted?: number; skipped?: number; reason?: string } } }
        | null;
      const v2 = body?.v2;
      const inserted = Number(v2?.result?.inserted ?? 0);
      const skipped = Number(v2?.result?.skipped ?? 0);
      if (v2?.kind === "error") {
        setLibStatus({ kind: "error", reason: v2.result?.reason ?? "warehouse write failed" });
      } else if (inserted === 0) {
        setLibStatus({
          kind: "error",
          reason: v2?.result?.reason ?? "no rows matched this section's schema",
        });
      } else {
        setLibStatus({ kind: "ok", inserted, skipped });
      }
    } catch (err) {
      console.warn("[rates] sync error:", err);
      setLibStatus({ kind: "error", reason: (err as Error).message });
    }
  };

  const deleteUpload = async (section: string, tab: string) => {
    try {
      const res = await fetch(
        `/api/rates/uploads?section=${encodeURIComponent(section)}&tab=${encodeURIComponent(tab)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        console.warn(
          "[rates] failed to delete upload from DB:",
          res.status,
          await res.text(),
        );
      }
    } catch (err) {
      console.warn("[rates] delete error:", err);
    }
  };

  /* ---- Full-lib export / import — migrate the whole library between envs.
   *  Export downloads every persisted snapshot (all sections + tabs) as one
   *  JSON file; Import POSTs each back through /api/rates/uploads, which also
   *  normalizes into the warehouse the AI reads. Run Export on local, Import
   *  on prod (or vice-versa) to move the lib across. */
  const importInputRef = React.useRef<HTMLInputElement>(null);
  const [ioStatus, setIoStatus] = React.useState<string | null>(null);

  const exportLib = async () => {
    setIoStatus("Exporting…");
    try {
      const res = await fetch("/api/rates/uploads");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rates-lib-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      const n = Array.isArray(data?.uploads) ? data.uploads.length : 0;
      setIoStatus(`Exported ${n} section${n === 1 ? "" : "s"}`);
    } catch (e) {
      setIoStatus(`Export failed: ${(e as Error).message}`);
    }
  };

  // Plain CSV of the section currently in view (all columns, all rows) — for
  // opening in Excel. Use the full-lib JSON Export above for migration.
  const exportSectionCsv = () => {
    if (!schema || activeRows.length === 0) {
      setIoStatus("Nothing to export in this section");
      return;
    }
    const cols = schema.columns;
    const esc = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [
      cols.map((c) => esc(c.label)).join(","),
      ...activeRows.map((r) => cols.map((c) => esc(r[c.key])).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeSection}-${activeTab || "data"}.csv`.replace(/\s+/g, "_");
    a.click();
    URL.revokeObjectURL(url);
    setIoStatus(`Exported ${activeRows.length} rows to CSV`);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setIoStatus("Importing…");
    try {
      const parsed = JSON.parse(await file.text());
      const uploads: unknown[] = Array.isArray(parsed?.uploads)
        ? parsed.uploads
        : Array.isArray(parsed)
          ? parsed
          : [];
      let ok = 0;
      for (const u of uploads as Array<{
        section?: string;
        tab?: string;
        meta?: UploadMeta;
        rows?: Row[];
        extraColumns?: Column[];
      }>) {
        if (!u?.section || !u?.tab || !Array.isArray(u?.rows)) continue;
        const r = await fetch("/api/rates/uploads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            section: u.section,
            tab: u.tab,
            meta: u.meta,
            rows: u.rows,
            extraColumns: u.extraColumns ?? [],
          }),
        });
        if (r.ok) ok++;
      }
      setIoStatus(`Imported ${ok}/${uploads.length} sections — reloading…`);
      setTimeout(() => window.location.reload(), 900);
    } catch (e) {
      setIoStatus(`Import failed: ${(e as Error).message}`);
    }
  };

  /* ---------- render ---------- */
  return (
    <TooltipProvider delayDuration={150}>
      <div className="bg-card flex flex-col h-full overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-3 py-2 border-b flex-wrap shrink-0">
          {showTabs ? (
            <div className="inline-flex items-center gap-0.5">
              {tabsForSection.map((t) => {
                const active = activeTab === t;
                return (
                  <button
                    key={t}
                    onClick={() => setActiveTab(t)}
                    className={cn(
                      "h-8 px-3 text-[13px] rounded-md transition-colors relative",
                      active
                        ? "text-foreground font-medium bg-accent/60"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                    )}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-[13px] font-medium px-1">{activeSection}</div>
          )}

          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="text-muted-foreground"
            >
              <X className="h-3.5 w-3.5" />
              Clear ({activeFilterCount})
            </Button>
          )}

          {selected.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              className="gap-1.5 text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-700"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete{" "}
              <span className="tabular-nums">({selected.size})</span>
            </Button>
          )}

          <div className="ml-auto flex items-center gap-1.5">
            {storageWarn && (
              <span
                title="Browser storage quota exceeded — uploads won't survive a refresh"
                className="inline-flex items-center gap-1.5 h-7 px-2 rounded-md border bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[11px]"
              >
                Storage full
              </span>
            )}
            {libStatus?.kind === "saving" && (
              <span className="inline-flex items-center gap-1.5 h-7 px-2 rounded-md border bg-zinc-500/10 text-zinc-600 dark:text-zinc-300 text-[11px]">
                Saving to lib…
              </span>
            )}
            {libStatus?.kind === "ok" && (
              <span
                title={`${libStatus.inserted} rows written to the RatesX warehouse${libStatus.skipped ? `, ${libStatus.skipped} skipped` : ""}`}
                className="inline-flex items-center gap-1.5 h-7 px-2 rounded-md border bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[11px]"
              >
                <Check className="h-3 w-3" />
                {formatNumber(libStatus.inserted, { maximumFractionDigits: 0 })} in lib
              </span>
            )}
            {libStatus?.kind === "error" && (
              <span
                title={`Mapping saved locally but did NOT reach the lib: ${libStatus.reason}`}
                className="inline-flex items-center gap-1.5 h-7 px-2 rounded-md border bg-red-500/10 text-red-700 dark:text-red-300 text-[11px]"
              >
                Not saved to lib
              </span>
            )}
            {uploadedMeta && (
              <span className="inline-flex items-center gap-1.5 h-7 pl-2 pr-1 rounded-md border bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[11px]">
                <Check className="h-3 w-3" />
                <span
                  className="max-w-[180px] truncate"
                  title={uploadedMeta.name}
                >
                  {uploadedMeta.name}
                </span>
                <span className="text-emerald-700/70 tabular-nums">
                  {formatNumber(uploadedMeta.rowCount, {
                    maximumFractionDigits: 0,
                  })}{" "}
                  rows
                </span>
                <button
                  onClick={() => {
                    setData((prev) => {
                      const next = { ...prev };
                      delete next[currentKey];
                      return next;
                    });
                    void deleteUpload(activeSection, activeTab);
                  }}
                  title="Revert"
                  className="h-4 w-4 grid place-items-center rounded-sm hover:bg-emerald-500/20"
                  aria-label="Dismiss"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            )}
            <span className="text-xs text-muted-foreground tabular-nums hidden md:inline">
              {formatNumber(total, { maximumFractionDigits: 0 })} rows
            </span>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={!schema}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Columns
                  {hiddenCols.size > 0 && schema && (
                    <span className="ml-0.5 inline-flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-foreground text-background text-[10px] tabular-nums">
                      {schema.columns.length - hiddenCols.size}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1">
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span>
                    {activeSection} — {activeTab}
                  </span>
                  <button
                    onClick={() => setHiddenCols(new Set())}
                    className="text-[10px] font-normal text-muted-foreground hover:text-foreground"
                  >
                    Reset
                  </button>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="max-h-[340px] overflow-y-auto scrollbar-thin">
                  {schema?.columns.map((c) => {
                    const visible = !hiddenCols.has(c.key);
                    return (
                      <button
                        key={c.key}
                        onClick={() => toggleCol(c.key)}
                        className="w-full flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent text-left"
                      >
                        <span
                          className={cn(
                            "h-4 w-4 rounded-sm border grid place-items-center transition-colors",
                            visible
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-input"
                          )}
                        >
                          {visible && <Check className="h-3 w-3" />}
                        </span>
                        <span className="flex-1 truncate">{c.label}</span>
                      </button>
                    );
                  })}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" size="sm" className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.json"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleUploadClick}
              disabled={!schema}
            >
              <Upload className="h-3.5 w-3.5" />
              Upload
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={exportLib}
              title="Download the entire library (all sections) as a JSON file"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={exportSectionCsv}
              disabled={!schema || activeRows.length === 0}
              title="Download the section currently in view as a CSV (for Excel)"
            >
              <Download className="h-3.5 w-3.5" />
              CSV
            </Button>
            <input
              ref={importInputRef}
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => importInputRef.current?.click()}
              title="Import a library JSON file into this environment (writes to the warehouse the AI reads)"
            >
              <Inbox className="h-3.5 w-3.5" />
              Import
            </Button>
            {ioStatus && (
              <span
                className="text-[11px] text-zinc-500 self-center max-w-[220px] truncate"
                title={ioStatus}
              >
                {ioStatus}
              </span>
            )}
            <Button
              size="sm"
              className="gap-1.5 bg-gradient-to-tr from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white border-0"
              onClick={() => {
                window.location.href = "/rates/assistant";
              }}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Ask AI
            </Button>
          </div>
        </div>

        {/* Table / Empty state */}
        {!schema ? (
          <EmptyState
            title={`${activeSection} has no tabs yet`}
            body="Pick a section that has data sources, or upload a file to seed this view."
          />
        ) : activeRows.length === 0 ? (
          <EmptyState
            title={`No ${activeTab.toLowerCase()} data for ${activeSection}`}
            body={`Upload a ${activeTab} file to seed this view.`}
            onUpload={handleUploadClick}
          />
        ) : (
          <div className="grid-scroller relative flex-1 overflow-auto scrollbar-thin">
            <table
              className="border-collapse text-[13px]"
              style={{ tableLayout: "fixed", width: totalWidth, minWidth: "100%" }}
            >
              <colgroup>
                <col style={{ width: CHECK_W }} />
                {visibleColumns.map((c) => (
                  <col key={c.key} style={{ width: c.width }} />
                ))}
                <col style={{ width: ACTIONS_W }} />
              </colgroup>

              <thead>
                <tr>
                  <th
                    className="sticky-top sticky-left z-30 bg-zinc-50/95 backdrop-blur border-b border-r"
                    style={{ height: HEADER_H }}
                  >
                    <div className="grid place-items-center h-full">
                      <input
                        type="checkbox"
                        aria-label="Select all"
                        checked={allFilteredSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = someFilteredSelected;
                        }}
                        onChange={toggleAll}
                        className="h-3.5 w-3.5 rounded border-input cursor-pointer"
                      />
                    </div>
                  </th>
                  {visibleColumns.map((c) => (
                    <SortableTh
                      key={c.key}
                      col={c}
                      sort={sort}
                      onSort={toggleSort}
                    />
                  ))}
                  <th
                    className="sticky-top z-20 bg-zinc-50/95 backdrop-blur border-b"
                    style={{ height: HEADER_H }}
                  />
                </tr>
                <tr>
                  <th
                    className="sticky-top-2 sticky-left z-30 bg-card border-b border-r"
                    style={{ height: FILTER_H }}
                  />
                  {visibleColumns.map((c) => (
                    <th
                      key={c.key}
                      className="sticky-top-2 z-20 bg-card border-b border-r last:border-r-0 px-1"
                      style={{ height: FILTER_H }}
                    >
                      <ColFilterInput
                        col={c}
                        value={colFilters[c.key] || ""}
                        onChange={(v) =>
                          setColFilters((f) => ({ ...f, [c.key]: v }))
                        }
                        options={filtersForKey[c.key]}
                      />
                    </th>
                  ))}
                  <th
                    className="sticky-top-2 z-20 bg-card border-b"
                    style={{ height: FILTER_H }}
                  />
                </tr>
              </thead>

              <tbody>
                {visible.map((r, i) => {
                  const id = rowId(r, (page - 1) * pageSize + i);
                  const isSelected = selected.has(id);
                  return (
                  <tr
                    key={i}
                    className={cn(
                      "group transition-colors",
                      isSelected
                        ? "[&>td]:bg-primary/5 hover:[&>td]:bg-primary/10"
                        : "[&>td]:bg-card hover:[&>td]:bg-accent/40"
                    )}
                  >
                    <td
                      className="sticky-left z-10 border-b border-r"
                      style={{ height: 32 }}
                    >
                      <div className="grid place-items-center h-full">
                        <input
                          type="checkbox"
                          aria-label="Select row"
                          checked={isSelected}
                          onChange={() => toggleOne(id)}
                          className="h-3.5 w-3.5 rounded border-input cursor-pointer"
                        />
                      </div>
                    </td>
                    {visibleColumns.map((c) => (
                      <TypedCell key={c.key} column={c} value={r[c.key]} />
                    ))}
                    <td className="border-b" style={{ height: 32 }}>
                      <div className="grid place-items-center h-full">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                          aria-label="More"
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
                {visible.length === 0 && (
                  <tr>
                    <td
                      colSpan={visibleColumns.length + 2}
                      className="h-40 text-center text-muted-foreground text-sm"
                    >
                      No rows match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="border-t px-3 h-7 flex items-center gap-2 text-[11px] text-muted-foreground shrink-0">
          <div>
            <span className="text-foreground font-medium tabular-nums">
              {total === 0 ? 0 : (page - 1) * pageSize + 1}
            </span>
            {"–"}
            <span className="text-foreground font-medium tabular-nums">
              {Math.min(page * pageSize, total)}
            </span>{" "}
            of{" "}
            <span className="text-foreground font-medium tabular-nums">
              {formatNumber(total, { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <Select
              value={String(pageSize)}
              onValueChange={(v) => setPageSize(Number(v))}
            >
              <SelectTrigger className="h-5 w-[56px] text-[11px] px-1.5 gap-0.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[25, 50, 100, 200].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center">
              <button
                onClick={() => setPage(1)}
                disabled={page <= 1}
                className="h-5 w-5 grid place-items-center rounded hover:bg-accent disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronsLeft className="h-3 w-3" />
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-5 w-5 grid place-items-center rounded hover:bg-accent disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronLeft className="h-3 w-3" />
              </button>
              <span className="px-1.5 tabular-nums">
                {page}/{pageCount}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={page >= pageCount}
                className="h-5 w-5 grid place-items-center rounded hover:bg-accent disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronRight className="h-3 w-3" />
              </button>
              <button
                onClick={() => setPage(pageCount)}
                disabled={page >= pageCount}
                className="h-5 w-5 grid place-items-center rounded hover:bg-accent disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronsRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <UploadPreviewDialog
        file={pendingFile}
        targetTabs={tabsForSection.length > 0 ? tabsForSection : [activeSection]}
        defaultTargetTab={activeTab || activeSection}
        sectionName={activeSection}
        onCancel={() => setPendingFile(null)}
        onConfirm={(result) => {
          const targetTab = result.targetTab;
          const targetSchema = getSchema(activeSection, targetTab);
          if (!targetSchema) return;
          // Prefer the explicit parser's rows when present, else generic mapper.
          let rows: Record<string, unknown>[];
          let extraColumns: Column[] = [];
          if (result.parsedRows) {
            rows = result.parsedRows;
          } else {
            const mapped = mapUploadToSchema(result, targetSchema);
            rows = mapped.rows;
            extraColumns = mapped.extraColumns;
          }
          const key = schemaKey(activeSection, targetTab || "_");
          const entry: DataEntry = {
            meta: {
              name: result.name,
              size: result.size,
              rowCount: rows.length,
              sheetName: result.sheetName,
            },
            rows,
            extraColumns,
          };
          setData((prev) => ({ ...prev, [key]: entry }));
          if (tabsForSection.includes(targetTab)) {
            setActiveTab(targetTab);
          }
          setPendingFile(null);
          // Mirror to the main IOX DB so the snapshot survives reloads
          // and is visible to other browsers.
          void syncUpload(activeSection, targetTab, entry);
        }}
      />
    </TooltipProvider>
  );
}

/* ---------------- Subcomponents ---------------- */

function EmptyState({
  title,
  body,
  onUpload,
}: {
  title: string;
  body: string;
  onUpload?: () => void;
}) {
  return (
    <div className="flex-1 grid place-items-center px-6">
      <div className="text-center max-w-md">
        <div className="mx-auto h-12 w-12 rounded-xl bg-zinc-100 grid place-items-center mb-3">
          <Inbox className="h-6 w-6 text-zinc-500" />
        </div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground mt-1">{body}</p>
        {onUpload && (
          <Button size="sm" className="mt-4 gap-1.5" onClick={onUpload}>
            <Upload className="h-3.5 w-3.5" />
            Upload file
          </Button>
        )}
      </div>
    </div>
  );
}

function SortableTh({
  col,
  sort,
  onSort,
}: {
  col: Column;
  sort: SortState;
  onSort: (k: string) => void;
}) {
  const active = sort?.key === col.key;
  return (
    <th
      className={cn(
        "sticky-top z-20 bg-zinc-50/95 backdrop-blur border-b text-[11px] font-semibold uppercase tracking-wider text-zinc-700 px-2",
        col.align === "right" ? "text-right" : "text-left"
      )}
      style={{ height: HEADER_H }}
    >
      <button
        onClick={() => onSort(col.key)}
        className={cn(
          "inline-flex items-center gap-1 hover:text-foreground transition-colors max-w-full",
          active && "text-foreground",
          col.align === "right" && "justify-end w-full"
        )}
      >
        <span className="truncate">{col.label}</span>
        {active ? (
          sort?.dir === "asc" ? (
            <ArrowUp className="h-3 w-3 shrink-0" />
          ) : (
            <ArrowDown className="h-3 w-3 shrink-0" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40 shrink-0" />
        )}
      </button>
    </th>
  );
}

function ColFilterInput({
  col,
  value,
  onChange,
  options,
}: {
  col: Column;
  value: string;
  onChange: (v: string) => void;
  options?: string[];
}) {
  const hasOptions =
    options &&
    options.length > 0 &&
    options.length <= 60 &&
    col.type !== "number" &&
    col.type !== "money" &&
    col.type !== "ratio" &&
    col.type !== "year" &&
    col.type !== "description";

  if (hasOptions) {
    return (
      <Select
        value={value || "__all__"}
        onValueChange={(v) => onChange(v === "__all__" ? "" : v)}
      >
        <SelectTrigger
          className={cn(
            "h-6 w-full text-[11px] px-1.5 gap-1 border-transparent bg-transparent hover:bg-accent/50 focus:bg-background focus:border-input transition-colors [&_svg]:h-3 [&_svg]:w-3",
            value && "text-foreground font-medium"
          )}
        >
          <SelectValue
            placeholder={<span className="text-muted-foreground">All</span>}
          />
        </SelectTrigger>
        <SelectContent className="max-h-[320px]">
          <SelectItem value="__all__">All</SelectItem>
          {options!.slice(0, 60).map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={col.label}
      className={cn(
        "w-full h-6 px-1.5 rounded-md border border-transparent bg-transparent text-[11px] placeholder:text-muted-foreground hover:bg-accent/50 focus-visible:outline-none focus-visible:bg-background focus-visible:border-input transition-colors",
        col.align === "right" && "text-right",
        value && "border-input bg-background text-foreground font-medium"
      )}
    />
  );
}
