"use client"

import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronDown,
  Loader2,
  Plus,
  Sheet as SheetIcon,
  Sparkles,
  Trash2,
  X,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import {
  importBoqMapping,
  importPteMapping,
  parseBoqDocument,
  parsePteDocument,
} from "@/modules/procurex/boq/actions"
import type {
  BoqField,
  ParsedWorkbook,
  PteValidationReport,
  SheetPreview,
} from "@/modules/procurex/boq/parser"

/** Display labels for the six canonical fields. */
const FIELD_LABELS: Record<BoqField, string> = {
  itemRef: "Item",
  description: "Description",
  quantity: "Quantity",
  unit: "Unit",
  rate: "Rate",
  amount: "Amount",
}

const FIELD_ORDER: BoqField[] = [
  "itemRef",
  "description",
  "quantity",
  "unit",
  "rate",
  "amount",
]

/** Field → cell text color in the preview grid. */
const FIELD_TINT: Record<BoqField, string> = {
  itemRef: "bg-amber-100/60 text-amber-900",
  description: "bg-blue-100/60 text-blue-900",
  quantity: "bg-emerald-100/60 text-emerald-900",
  unit: "bg-violet-100/60 text-violet-900",
  rate: "bg-fuchsia-100/60 text-fuchsia-900",
  amount: "bg-rose-100/60 text-rose-900",
}

/**
 * Full-screen BoQ-import modal.
 *
 * Opens after the user uploads a BoQ xlsx onto the Step 2 BOQ slot.
 * Shows a sheets picker (left), per-sheet preview grid (centre), and
 * column-mapping panel (right). The mapping is global — the user picks
 * the column letter for each canonical field once, and it applies to
 * every included sheet (because BoQs from one project share structure).
 *
 * No AI is involved — all detection is deterministic in parser.ts.
 */
export type BoqMappingMode = "boq" | "pte"

export function BoqMappingModal({
  documentId,
  projectId: _projectId,
  defaultName,
  mode = "boq",
  onClose,
  onImported,
}: {
  documentId: string
  projectId: string
  defaultName?: string
  /** "boq" — empty BoQ import.  "pte" — Pre-Tender Estimate import.
   *  In PTE mode the modal runs the structure-validator against the
   *  project's existing empty BoQ and surfaces a banner with the result. */
  mode?: BoqMappingMode
  onClose: () => void
  onImported: (summary: { templateId: string; itemsCreated: number }) => void
}) {
  const [loadState, setLoadState] = useState<
    | { kind: "loading" }
    | { kind: "error"; message: string }
    | {
        kind: "ready"
        workbook: ParsedWorkbook
        filename: string
        /** Only populated in PTE mode and only when an empty BoQ exists. */
        validation: PteValidationReport | null
      }
  >({ kind: "loading" })

  // Per-sheet inclusion + active sheet preview + global mapping state
  const [includedBySheet, setIncludedBySheet] = useState<Record<string, boolean>>({})
  const [activeSheet, setActiveSheet] = useState<string | null>(null)
  /** Single canonical mapping applied to every included sheet. Keyed by
   *  column letter so we can render the same mapping over every preview. */
  const [columnMap, setColumnMap] = useState<Partial<Record<string, BoqField>>>({})
  const [extraColumns, setExtraColumns] = useState<Record<string, string>>({})
  const [currency, setCurrency] = useState<string | null>(null)
  const [templateName, setTemplateName] = useState("")

  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)

  // 1. Kick off the parse on mount. In PTE mode we use parsePteDocument
  // which also runs the structure-validator against the project's BoQ.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const result =
        mode === "pte"
          ? await parsePteDocument(documentId)
          : await parseBoqDocument(documentId)
      if (cancelled) return
      if (!result.ok) {
        setLoadState({ kind: "error", message: result.error })
        return
      }
      const { workbook, documentFilename } = result
      const validation: PteValidationReport | null =
        "validation" in result
          ? ((result.validation as PteValidationReport | null) ?? null)
          : null
      const included: Record<string, boolean> = {}
      for (const s of workbook.sheets) included[s.name] = !s.skipByDefault

      // Pick the first item sheet (auto-detected mapping) as the
      // canonical preview + mapping source.
      const sourceSheet = workbook.sheets.find(
        (s) => !s.skipByDefault && Object.keys(s.columnMap).length > 0,
      )
      setIncludedBySheet(included)
      setActiveSheet(sourceSheet?.name ?? workbook.sheets[0]?.name ?? null)
      setColumnMap(sourceSheet?.columnMap ?? {})
      setCurrency(workbook.workbookCurrency)
      setTemplateName(defaultName ?? documentFilename.replace(/\.xlsx$/i, ""))
      setLoadState({
        kind: "ready",
        workbook,
        filename: documentFilename,
        validation,
      })
    })()
    return () => {
      cancelled = true
    }
  }, [documentId, defaultName, mode])

  // Esc closes the modal — except while importing (don't lose the work).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !importing) onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose, importing])

  // Compute totals (selected sheets + estimated items) — drives the
  // sidebar footer and the Import button label.
  const totals = useMemo(() => {
    if (loadState.kind !== "ready") return { sheets: 0, items: 0 }
    let sheets = 0
    let items = 0
    for (const s of loadState.workbook.sheets) {
      if (includedBySheet[s.name]) {
        sheets += 1
        items += s.estimatedDataRows
      }
    }
    return { sheets, items }
  }, [loadState, includedBySheet])

  const activeSheetPreview: SheetPreview | null = useMemo(() => {
    if (loadState.kind !== "ready" || !activeSheet) return null
    return loadState.workbook.sheets.find((s) => s.name === activeSheet) ?? null
  }, [loadState, activeSheet])

  // Number of columns the preview grid should render (max across active +
  // a sensible floor of 6 for the default BoQ structure).
  const previewColCount = useMemo(() => {
    if (!activeSheetPreview) return 6
    let n = 6
    for (const r of activeSheetPreview.preview) n = Math.max(n, r.cells.length)
    return n
  }, [activeSheetPreview])

  // ──────────────────────────────────────────────────────────────────
  // Field-mapping helpers
  // ──────────────────────────────────────────────────────────────────

  function setFieldToColumn(field: BoqField, letter: string | null) {
    setColumnMap((prev) => {
      const next: Partial<Record<string, BoqField>> = {}
      // Drop any column that was previously this field.
      for (const [k, v] of Object.entries(prev)) {
        if (v !== field) next[k] = v
      }
      if (letter) {
        // Drop any conflicting assignment for the new column.
        delete next[letter]
        next[letter] = field
      }
      // Make sure this column isn't also flagged as extra.
      if (letter && extraColumns[letter]) {
        setExtraColumns((p) => {
          const c = { ...p }
          if (letter) delete c[letter]
          return c
        })
      }
      return next
    })
  }

  function addExtraColumn() {
    // Pick the next un-assigned column letter for the default value.
    if (!activeSheetPreview) return
    const taken = new Set([
      ...Object.keys(columnMap),
      ...Object.keys(extraColumns),
    ])
    for (let i = 0; i < previewColCount; i += 1) {
      const letter = colLetter(i)
      if (!taken.has(letter)) {
        setExtraColumns((prev) => ({ ...prev, [letter]: `Extra column ${letter}` }))
        return
      }
    }
  }

  function removeExtraColumn(letter: string) {
    setExtraColumns((prev) => {
      const next = { ...prev }
      delete next[letter]
      return next
    })
  }

  // ──────────────────────────────────────────────────────────────────
  // Import
  // ──────────────────────────────────────────────────────────────────

  async function handleImport() {
    if (loadState.kind !== "ready") return
    setImporting(true)
    setImportError(null)
    const sheets = loadState.workbook.sheets.map((s) => ({
      name: s.name,
      included: !!includedBySheet[s.name],
      headerRow: s.headerRow ?? 0,
      columnMap,
      extraColumns,
    }))
    try {
      const result =
        mode === "pte"
          ? await importPteMapping({
              documentId,
              templateName,
              currency,
              sheets,
            })
          : await importBoqMapping({
              documentId,
              templateName,
              currency,
              sheets,
            })
      if (!result.ok) {
        setImportError(result.error)
        setImporting(false)
        return
      }
      onImported({
        templateId: result.templateId,
        itemsCreated: result.itemsCreated,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setImportError(msg)
      setImporting(false)
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/40 flex items-stretch justify-center p-4"
      onClick={importing ? undefined : onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#fafbfc] rounded-2xl w-full max-w-[1500px] h-full shadow-xl border border-[#e9e9e9] flex flex-col"
      >
        {/* ─── Header ─── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#ececec] bg-white rounded-t-2xl">
          <div className="flex flex-col gap-1">
            <h3 className="font-semibold text-[16px] text-[#142845]">
              Import Bill of Quantities
            </h3>
            <p className="text-[12px] text-[#666]">
              {loadState.kind === "ready"
                ? loadState.filename
                : loadState.kind === "loading"
                  ? "Reading workbook…"
                  : "Could not read workbook"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={importing}
            className="size-9 flex items-center justify-center rounded-lg hover:bg-[#f3f4f5] disabled:opacity-40"
            aria-label="Close"
          >
            <X className="size-4 text-[#555]" />
          </button>
        </div>

        {loadState.kind === "loading" ? (
          <div className="flex-1 flex items-center justify-center text-[#666]">
            <Loader2 className="size-5 animate-spin mr-2" />
            <span className="text-sm">Parsing workbook…</span>
          </div>
        ) : loadState.kind === "error" ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8">
            <AlertCircle className="size-6 text-red-500" />
            <p className="text-sm text-[#444] max-w-md text-center">
              {loadState.message}
            </p>
            <button
              onClick={onClose}
              className="mt-2 px-4 py-2 text-sm font-medium text-[#555] hover:bg-[#fafafa] rounded-lg border border-[#e0e0e0]"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            {/* ─── PTE-only validation banner ─── */}
            {mode === "pte" && (
              <PteValidationBanner validation={loadState.validation} />
            )}

            <div className="flex-1 grid grid-cols-[260px_1fr_320px] min-h-0">
            {/* ─── Sheets sidebar (left) ─── */}
            <SheetsSidebar
              workbook={loadState.workbook}
              includedBySheet={includedBySheet}
              activeSheet={activeSheet}
              totals={totals}
              onToggle={(name) =>
                setIncludedBySheet((prev) => ({ ...prev, [name]: !prev[name] }))
              }
              onSelect={(name) => setActiveSheet(name)}
              onIncludeAllItems={() => {
                const next: Record<string, boolean> = {}
                for (const s of loadState.workbook.sheets) {
                  next[s.name] = !s.skipByDefault
                }
                setIncludedBySheet(next)
              }}
              onClearAll={() => {
                const next: Record<string, boolean> = {}
                for (const s of loadState.workbook.sheets) next[s.name] = false
                setIncludedBySheet(next)
              }}
            />

            {/* ─── Preview grid (centre) ─── */}
            <PreviewGrid
              sheet={activeSheetPreview}
              columnMap={columnMap}
              extraColumns={extraColumns}
              previewColCount={previewColCount}
            />

            {/* ─── Mapping panel (right) ─── */}
            <MappingPanel
              previewColCount={previewColCount}
              columnMap={columnMap}
              extraColumns={extraColumns}
              currency={currency}
              templateName={templateName}
              detectedCurrency={loadState.workbook.workbookCurrency}
              onFieldChange={setFieldToColumn}
              onCurrencyChange={setCurrency}
              onTemplateNameChange={setTemplateName}
              onAddExtra={addExtraColumn}
              onExtraLabelChange={(letter, label) =>
                setExtraColumns((prev) => ({ ...prev, [letter]: label }))
              }
              onExtraColumnLetterChange={(oldLetter, newLetter) => {
                setExtraColumns((prev) => {
                  const next = { ...prev }
                  const label = next[oldLetter]
                  delete next[oldLetter]
                  if (label) next[newLetter] = label
                  return next
                })
              }}
              onExtraRemove={removeExtraColumn}
            />
            </div>
          </div>
        )}

        {/* ─── Footer ─── */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-[#ececec] bg-white rounded-b-2xl">
          <div className="text-[12px] text-[#666]">
            {loadState.kind === "ready" && (
              <span>
                {totals.sheets} sheet{totals.sheets === 1 ? "" : "s"} ·{" "}
                {totals.items.toLocaleString()} item{totals.items === 1 ? "" : "s"} estimated
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {importError && (
              <span className="text-[12px] text-red-600 mr-2">{importError}</span>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={importing}
              className="px-4 py-2 text-sm font-medium text-[#555] hover:bg-[#fafafa] rounded-lg disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={
                importing ||
                loadState.kind !== "ready" ||
                totals.sheets === 0 ||
                !columnMap || Object.values(columnMap).filter((v) => v === "itemRef").length === 0
              }
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#142845] hover:bg-[#0a1426] rounded-lg disabled:opacity-40"
            >
              {importing ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Importing…
                </>
              ) : (
                <>
                  <Check className="size-4" />
                  Import {totals.items > 0 ? totals.items.toLocaleString() : ""} items
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// SheetsSidebar — left pane: list of sheets with include checkboxes.
// ──────────────────────────────────────────────────────────────────────

function SheetsSidebar({
  workbook,
  includedBySheet,
  activeSheet,
  totals,
  onToggle,
  onSelect,
  onIncludeAllItems,
  onClearAll,
}: {
  workbook: ParsedWorkbook
  includedBySheet: Record<string, boolean>
  activeSheet: string | null
  totals: { sheets: number; items: number }
  onToggle: (name: string) => void
  onSelect: (name: string) => void
  onIncludeAllItems: () => void
  onClearAll: () => void
}) {
  return (
    <aside className="border-r border-[#ececec] bg-white flex flex-col min-h-0">
      <div className="px-4 py-3 border-b border-[#f0f0f0]">
        <h4 className="text-[12px] font-semibold uppercase tracking-wider text-[#888]">
          Sheets · {workbook.sheetCount}
        </h4>
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={onIncludeAllItems}
            className="text-[11px] px-2 py-1 rounded bg-[#142845]/5 text-[#142845] hover:bg-[#142845]/10"
          >
            Items only
          </button>
          <button
            type="button"
            onClick={onClearAll}
            className="text-[11px] px-2 py-1 rounded hover:bg-[#fafafa] text-[#666]"
          >
            Clear
          </button>
        </div>
      </div>

      <ul className="flex-1 overflow-auto px-2 py-2 space-y-0.5">
        {workbook.sheets.map((s) => {
          const isActive = activeSheet === s.name
          const included = !!includedBySheet[s.name]
          const isSkipDefault = s.skipByDefault
          const hasHeader = s.headerRow !== null
          return (
            <li key={s.name}>
              <button
                type="button"
                onClick={() => onSelect(s.name)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left ${
                  isActive ? "bg-[#142845]/5" : "hover:bg-[#fafafa]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={included}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => onToggle(s.name)}
                  className="size-3.5 accent-[#142845]"
                />
                <SheetIcon
                  className={`size-3.5 shrink-0 ${
                    hasHeader ? "text-emerald-500" : "text-[#bbb]"
                  }`}
                />
                <span
                  className={`flex-1 truncate text-[13px] ${
                    isSkipDefault ? "text-[#999]" : "text-[#1a1a1a]"
                  }`}
                  title={s.name}
                >
                  {s.name}
                </span>
                {hasHeader && (
                  <span className="text-[10px] text-[#888] tabular-nums">
                    {s.estimatedDataRows}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>

      <div className="px-4 py-3 border-t border-[#f0f0f0] text-[11px] text-[#666] tabular-nums space-y-0.5">
        <div className="flex justify-between">
          <span>Selected sheets</span>
          <span>{totals.sheets}</span>
        </div>
        <div className="flex justify-between font-medium text-[#142845]">
          <span>Total items</span>
          <span>{totals.items.toLocaleString()}</span>
        </div>
      </div>
    </aside>
  )
}

// ──────────────────────────────────────────────────────────────────────
// PreviewGrid — centre pane: the active sheet's first 25 rows, with
// every mapped column tinted to match its field colour.
// ──────────────────────────────────────────────────────────────────────

function PreviewGrid({
  sheet,
  columnMap,
  extraColumns,
  previewColCount,
}: {
  sheet: SheetPreview | null
  columnMap: Partial<Record<string, BoqField>>
  extraColumns: Record<string, string>
  previewColCount: number
}) {
  if (!sheet) {
    return (
      <div className="flex-1 flex items-center justify-center text-[#888] text-sm">
        Select a sheet from the left to preview.
      </div>
    )
  }
  const cols = Array.from({ length: previewColCount }, (_, i) => colLetter(i))
  const headerRow = sheet.headerRow

  return (
    <div className="overflow-auto bg-[#fafbfc]">
      <div className="px-5 py-4">
        <div className="flex items-baseline gap-3 mb-3">
          <h4 className="text-[14px] font-semibold text-[#142845]">{sheet.name}</h4>
          <span className="text-[12px] text-[#666]">
            {sheet.totalRows} rows · {sheet.estimatedDataRows} items
          </span>
          {headerRow !== null ? (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Header detected at row {headerRow}
            </span>
          ) : (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              No header found
            </span>
          )}
        </div>

        <div className="overflow-x-auto rounded-lg border border-[#e9e9e9] bg-white">
          <table className="text-[12px] w-max min-w-full">
            <thead>
              <tr className="bg-[#f6f7f9] border-b border-[#e9e9e9]">
                <th className="px-2 py-1.5 text-[10px] text-[#888] font-medium w-10">
                  #
                </th>
                {cols.map((letter) => {
                  const mapped = columnMap[letter]
                  const extra = extraColumns[letter]
                  return (
                    <th
                      key={letter}
                      className="px-2 py-1.5 text-left min-w-[140px] border-l border-[#eef0f2]"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-[#888] font-mono">
                          {letter}
                        </span>
                        {mapped && (
                          <span
                            className={`inline-block w-fit px-1.5 py-0.5 rounded text-[10px] font-medium ${FIELD_TINT[mapped]}`}
                          >
                            {FIELD_LABELS[mapped]}
                          </span>
                        )}
                        {extra && !mapped && (
                          <span className="inline-block w-fit px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                            {extra}
                          </span>
                        )}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {sheet.preview.map((row) => {
                const isHeader = row.rowIndex === headerRow
                return (
                  <tr
                    key={row.rowIndex}
                    className={`border-b border-[#f3f4f5] ${
                      isHeader ? "bg-emerald-50/30" : ""
                    }`}
                  >
                    <td className="px-2 py-1 text-[10px] text-[#bbb] tabular-nums font-mono w-10">
                      {row.rowIndex}
                    </td>
                    {cols.map((letter, i) => {
                      const mapped = columnMap[letter]
                      const cell = row.cells[i] ?? ""
                      return (
                        <td
                          key={letter}
                          className={`px-2 py-1 align-top whitespace-nowrap text-[#222] truncate max-w-[260px] border-l border-[#f3f4f5] ${
                            mapped && !isHeader ? FIELD_TINT[mapped] : ""
                          }`}
                          title={cell}
                        >
                          {cell || (
                            <span className="text-[#ccc]">·</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// MappingPanel — right pane: column letter for each canonical field,
// plus extra-column picker and template metadata.
// ──────────────────────────────────────────────────────────────────────

function MappingPanel({
  previewColCount,
  columnMap,
  extraColumns,
  currency,
  templateName,
  detectedCurrency,
  onFieldChange,
  onCurrencyChange,
  onTemplateNameChange,
  onAddExtra,
  onExtraLabelChange,
  onExtraColumnLetterChange,
  onExtraRemove,
}: {
  previewColCount: number
  columnMap: Partial<Record<string, BoqField>>
  extraColumns: Record<string, string>
  currency: string | null
  templateName: string
  detectedCurrency: string | null
  onFieldChange: (field: BoqField, letter: string | null) => void
  onCurrencyChange: (c: string | null) => void
  onTemplateNameChange: (s: string) => void
  onAddExtra: () => void
  onExtraLabelChange: (letter: string, label: string) => void
  onExtraColumnLetterChange: (oldLetter: string, newLetter: string) => void
  onExtraRemove: (letter: string) => void
}) {
  const letters = Array.from({ length: previewColCount }, (_, i) => colLetter(i))
  const reverseMap: Partial<Record<BoqField, string>> = {}
  for (const [letter, field] of Object.entries(columnMap)) {
    if (field) reverseMap[field] = letter
  }
  const autoDetected = detectedCurrency && currency === detectedCurrency

  return (
    <aside className="border-l border-[#ececec] bg-white flex flex-col min-h-0">
      <div className="flex-1 overflow-auto px-5 py-4 space-y-5">
        {/* Template name */}
        <div>
          <label className="text-[11px] uppercase tracking-wider font-semibold text-[#888]">
            Template name
          </label>
          <input
            value={templateName}
            onChange={(e) => onTemplateNameChange(e.target.value)}
            className="mt-1 w-full px-2.5 py-1.5 text-[13px] border border-[#e0e0e0] rounded-md focus:outline-none focus:border-[#142845]"
          />
        </div>

        {/* Canonical field mapping */}
        <div>
          <div className="flex items-center justify-between">
            <h5 className="text-[11px] uppercase tracking-wider font-semibold text-[#888]">
              Column mapping
            </h5>
            <Sparkles className="size-3 text-[#bbb]" />
          </div>
          <p className="text-[11px] text-[#999] mt-0.5 mb-3">
            Applies to every selected sheet.
          </p>
          <div className="space-y-2">
            {FIELD_ORDER.map((field) => (
              <div
                key={field}
                className="flex items-center gap-2 text-[12px]"
              >
                <span
                  className={`flex-1 px-2 py-1 rounded ${FIELD_TINT[field]} text-[12px] font-medium`}
                >
                  {FIELD_LABELS[field]}
                </span>
                <ArrowRight className="size-3 text-[#bbb]" />
                <select
                  value={reverseMap[field] ?? ""}
                  onChange={(e) =>
                    onFieldChange(field, e.target.value || null)
                  }
                  className="w-[110px] px-2 py-1 text-[12px] border border-[#e0e0e0] rounded-md bg-white focus:outline-none focus:border-[#142845] font-mono"
                >
                  <option value="">(none)</option>
                  {letters.map((l) => (
                    <option key={l} value={l}>
                      Column {l}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* Currency */}
        <div>
          <label className="text-[11px] uppercase tracking-wider font-semibold text-[#888]">
            Currency {autoDetected && <span className="text-emerald-600">· detected</span>}
          </label>
          <input
            value={currency ?? ""}
            onChange={(e) =>
              onCurrencyChange(e.target.value.trim().toUpperCase() || null)
            }
            placeholder="AED"
            className="mt-1 w-full px-2.5 py-1.5 text-[13px] border border-[#e0e0e0] rounded-md focus:outline-none focus:border-[#142845] uppercase font-mono"
          />
        </div>

        {/* Extra columns */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h5 className="text-[11px] uppercase tracking-wider font-semibold text-[#888]">
              Extra columns
            </h5>
            <button
              type="button"
              onClick={onAddExtra}
              className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-[#142845]/5 text-[#142845] hover:bg-[#142845]/10"
            >
              <Plus className="size-3" /> Add
            </button>
          </div>
          {Object.keys(extraColumns).length === 0 ? (
            <p className="text-[11px] text-[#aaa] italic">
              Optional. Add a column to capture extra fields (e.g. WBS code,
              CSI ref).
            </p>
          ) : (
            <div className="space-y-2">
              {Object.entries(extraColumns).map(([letter, label]) => (
                <div key={letter} className="flex items-center gap-1.5">
                  <select
                    value={letter}
                    onChange={(e) =>
                      onExtraColumnLetterChange(letter, e.target.value)
                    }
                    className="w-[68px] px-1.5 py-1 text-[12px] border border-[#e0e0e0] rounded-md bg-white font-mono"
                  >
                    {letters.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                  <input
                    value={label}
                    onChange={(e) => onExtraLabelChange(letter, e.target.value)}
                    className="flex-1 px-2 py-1 text-[12px] border border-[#e0e0e0] rounded-md focus:outline-none focus:border-[#142845]"
                  />
                  <button
                    type="button"
                    onClick={() => onExtraRemove(letter)}
                    className="size-7 flex items-center justify-center rounded hover:bg-red-50 text-[#999] hover:text-red-500"
                    aria-label="Remove"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

// ──────────────────────────────────────────────────────────────────────
// helpers
// ──────────────────────────────────────────────────────────────────────

function colLetter(idx: number): string {
  let s = ""
  let n = idx
  while (n >= 0) {
    s = String.fromCharCode(65 + (n % 26)) + s
    n = Math.floor(n / 26) - 1
  }
  return s
}

// ──────────────────────────────────────────────────────────────────────
// PteValidationBanner — strip across the top of the modal in PTE mode.
// Shows the alignment verdict + a collapsible drill-down with per-sheet
// match details. Display-only — the user can still click Import either
// way (per the chosen "show warnings, allow override" policy).
// ──────────────────────────────────────────────────────────────────────

function PteValidationBanner({
  validation,
}: {
  validation: PteValidationReport | null
}) {
  const [open, setOpen] = useState(false)

  if (!validation) {
    return (
      <div className="px-5 py-2.5 border-b border-[#ececec] bg-[#fafbfc] text-[12px] text-[#666] flex items-center gap-2">
        <AlertCircle className="size-3.5 text-[#999]" />
        No empty BoQ has been imported yet for this project — nothing to
        validate against. The PTE will import standalone.
      </div>
    )
  }

  const score = Math.round(validation.overallScore * 100)
  const palette =
    validation.verdict === "match"
      ? {
          bg: "bg-emerald-50",
          border: "border-emerald-200",
          icon: <Check className="size-3.5 text-emerald-700" />,
          text: "text-emerald-900",
          summary: "Structure matches the empty BoQ",
        }
      : validation.verdict === "partial"
        ? {
            bg: "bg-amber-50",
            border: "border-amber-200",
            icon: <AlertTriangle className="size-3.5 text-amber-700" />,
            text: "text-amber-900",
            summary: "Partial match — some sheets diverge",
          }
        : {
            bg: "bg-red-50",
            border: "border-red-200",
            icon: <AlertTriangle className="size-3.5 text-red-700" />,
            text: "text-red-900",
            summary: "Most PTE sheets don't align with the empty BoQ",
          }

  return (
    <div className={`border-b ${palette.border} ${palette.bg}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full px-5 py-2.5 flex items-center gap-3 text-left ${palette.text}`}
      >
        {palette.icon}
        <span className="text-[12px] font-medium">{palette.summary}</span>
        <span className="text-[11px] opacity-70 tabular-nums">
          · {score}% items aligned · {validation.matched.length} sheets matched
          {validation.pteOnlySheets.length > 0 &&
            ` · ${validation.pteOnlySheets.length} PTE-only`}
          {validation.boqOnlySections.length > 0 &&
            ` · ${validation.boqOnlySections.length} BoQ-only`}
        </span>
        <ChevronDown
          className={`size-3.5 ml-auto transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-5 pb-3 max-h-[210px] overflow-auto text-[11px] grid grid-cols-3 gap-x-6 gap-y-2">
          {validation.matched.length > 0 && (
            <div>
              <h6 className="text-[10px] uppercase tracking-wider font-semibold text-[#666] mb-1">
                Matched sheets
              </h6>
              <ul className="space-y-0.5">
                {validation.matched.map((m) => (
                  <li
                    key={m.pteSheet}
                    className="flex items-center justify-between"
                  >
                    <span className="font-mono">
                      {m.pteSheet} → {m.boqSection}
                    </span>
                    <span className="text-[#666] tabular-nums ml-2">
                      {m.itemsMatched}/{m.itemsMatched + m.itemsMissed}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {validation.pteOnlySheets.length > 0 && (
            <div>
              <h6 className="text-[10px] uppercase tracking-wider font-semibold text-[#666] mb-1">
                In PTE only
              </h6>
              <ul className="space-y-0.5">
                {validation.pteOnlySheets.map((s) => (
                  <li key={s.pteSheet} className="font-mono">
                    {s.pteSheet}{" "}
                    <span className="text-[#888] tabular-nums">
                      ({s.items})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {validation.boqOnlySections.length > 0 && (
            <div>
              <h6 className="text-[10px] uppercase tracking-wider font-semibold text-[#666] mb-1">
                In BoQ only
              </h6>
              <ul className="space-y-0.5">
                {validation.boqOnlySections.map((s) => (
                  <li key={s.boqSection} className="font-mono">
                    {s.boqSection}{" "}
                    <span className="text-[#888] tabular-nums">
                      ({s.items})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
