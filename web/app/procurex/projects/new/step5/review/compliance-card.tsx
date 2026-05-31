"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { useLockState } from "./lock-context"
import {
  AlertCircle,
  BadgeCheck,
  BarChart3,
  Banknote,
  ChevronUp,
  ChevronDown,
  CheckSquare,
  Copy,
  Eye,
  FileText,
  Folder,
  Clock,
  Percent,
  Calendar,
  Ruler,
  ShieldCheck,
  PenLine,
  Layers,
  List,
  Coins,
  FileEdit,
  FileCheck2,
  ScanSearch,
  Sparkles,
  Wrench,
  HelpCircle,
} from "lucide-react"

import { upsertReviewRow } from "@/modules/procurex/review/review-row-actions"
import type { ReviewSectionKey } from "@/modules/procurex/review/types"

interface Criterion {
  icon: ReactNode
  title: string
  description: ReactNode
}

/**
 * A bidder cell on the compliance grid. Three flavours so the page is
 * never lying:
 *  - "value"           — real value extracted/derived from project + bidder data
 *  - "missing"         — bidder hasn't uploaded the underlying doc yet
 *  - "not_implemented" — Step 2 has no extractor for this field yet
 *
 * The legacy `{ text, tone }` shape is still accepted (string + tone)
 * for callers that haven't been migrated; it's mapped onto `value`.
 */
type CellTone = "success" | "danger" | "warning" | "neutral"

export type BidderCell =
  | { kind: "value"; text: string; tone: CellTone }
  | { kind: "missing" }
  | { kind: "not_implemented" }
  | { text: string; tone: CellTone } // legacy shape

export interface ComplianceCardRow {
  /** Stable tenderer id — used as the upsert key against
   *  `tender_review_row`. When absent, the row stays local-only
   *  (legacy behaviour). */
  bidderId?: string
  bidder: string
  cells: BidderCell[]
  qsComment?: string
  /** Persisted Include-in-PTC toggle. Defaults to true. */
  includeInPtc?: boolean
}

interface ComplianceCardProps {
  id?: string
  letter: string // "A", "B", ...
  title: string // e.g. "FORM OF TENDER"
  description: string
  criteria: Criterion[]
  /** Column headers for the bidder table (after the "Tenderer" column) */
  columns: string[]
  /** Bidder rows. Each row has cells matching columns + an optional QS comment + include flag */
  rows: ComplianceCardRow[]
  /** Stable section id — required so the textarea + toggle persist
   *  against `tender_review_row(tendererId, sectionKey)`. Omit to keep
   *  state local-only (older call sites). */
  sectionKey?: ReviewSectionKey
  /** When true, the QS Comment textarea sprouts a Sparkles icon
   *  prefix marking the text as an AI suggestion. */
  qsCommentAiSuggestion?: boolean
  /** Optional element id; when present, a View button is shown next
   *  to the QS Comment cell that scrolls to that anchor (used by
   *  Section B to link out to the Deviations section). */
  qsCommentViewAnchor?: string
  /** When true, the bidder row table (column headers + status pills +
   *  QS Comment + Include-in-PTC toggle) is hidden. Used by Section D
   *  per Figma 1280:66928 — BoQ only shows header + criteria cards,
   *  with the actual line-item review surfaces living in the BOQ
   *  sub-sections below. */
  hideTable?: boolean
  /** Extra content rendered INSIDE the card, after the criteria row.
   *  Used by Section D to host its sub-section tables (Arithmetical
   *  Errors, Unpriced/Incomplete, High/Low, Deviations from Tender
   *  Bill) per Figma 1279:62009. */
  children?: ReactNode
}

const TONE_CLASSES: Record<CellTone, string> = {
  success: "bg-[#c8e5d5] text-[#1f4d34]",
  danger: "bg-[#f8d7d7] text-[#8a2a2a]",
  warning: "bg-[#fde6c2] text-[#7a4a00]",
  neutral: "bg-[#e9e9e9] text-[#262626]",
}

type NormalisedCell =
  | { kind: "value"; text: string; tone: CellTone }
  | { kind: "missing" }
  | { kind: "not_implemented" }

function normaliseCell(cell: BidderCell): NormalisedCell {
  if ("kind" in cell) return cell
  return { kind: "value", text: cell.text, tone: cell.tone }
}

function Pill(cell: BidderCell) {
  const normalised = normaliseCell(cell)

  if (normalised.kind === "missing") {
    return (
      <span
        className="inline-flex items-center gap-[4px] text-[12px] font-medium leading-[16px] px-[8px] py-[2px] rounded-[8px] whitespace-nowrap bg-[#fde6c2] text-[#7a4a00]"
        title="Bidder hasn't submitted this document yet"
      >
        Missing
      </span>
    )
  }

  if (normalised.kind === "not_implemented") {
    return (
      <span
        className="inline-flex items-center gap-[4px] text-[11px] font-medium leading-[16px] px-[8px] py-[2px] rounded-[8px] whitespace-nowrap border border-dashed border-[#94a3b8] bg-[#f1f5f9] text-[#475569]"
        title="Step 2 has no extractor for this field yet"
      >
        Not implemented
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center justify-center text-[12px] font-medium leading-[16px] px-[8px] py-[2px] rounded-[8px] whitespace-nowrap ${TONE_CLASSES[normalised.tone]}`}
    >
      {normalised.text}
    </span>
  )
}

function ToggleSwitch({
  on,
  onChange,
}: {
  on: boolean
  onChange: (next: boolean) => void
}) {
  const { readOnly } = useLockState()
  const bgCls = readOnly
    ? "bg-[#c4c4c4] cursor-not-allowed"
    : on
      ? "bg-[#2a69b9] justify-end"
      : "bg-[#c4c4c4] justify-start"
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={readOnly}
      onClick={() => !readOnly && onChange(!on)}
      className={`flex items-center p-[4px] rounded-[13px] shadow-[0_4px_8px_0_rgba(0,0,0,0.1)] w-[48px] h-[26px] shrink-0 transition-colors ${
        readOnly ? "justify-end" : ""
      } ${bgCls}`}
    >
      <span className="bg-white rounded-full size-[16px] block" />
    </button>
  )
}

export function ComplianceCard({
  id,
  letter,
  title,
  description,
  criteria,
  columns,
  rows,
  sectionKey,
  qsCommentAiSuggestion,
  qsCommentViewAnchor,
  hideTable,
  children,
}: ComplianceCardProps) {
  const [open, setOpen] = useState(true)
  // Hydrate local state from server-supplied row defaults. The row's
  // `includeInPtc` defaults to true when not provided; `qsComment`
  // defaults to "".
  const [includeMap, setIncludeMap] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(rows.map((r) => [r.bidder, r.includeInPtc ?? true])),
  )
  const [comments, setComments] = useState<Record<string, string>>(() =>
    Object.fromEntries(rows.map((r) => [r.bidder, r.qsComment ?? ""])),
  )

  // Per-bidder debounce timers for the textarea — only one in-flight
  // upsert per bidder at a time. Refs survive renders.
  const commentTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  useEffect(() => {
    const timers = commentTimers.current
    return () => {
      for (const t of Object.values(timers)) clearTimeout(t)
    }
  }, [])

  const bidderIdFor = (bidderName: string): string | undefined =>
    rows.find((r) => r.bidder === bidderName)?.bidderId

  const persistComment = (bidderName: string, value: string) => {
    const tendererId = bidderIdFor(bidderName)
    if (!sectionKey || !tendererId) return
    const existing = commentTimers.current[bidderName]
    if (existing) clearTimeout(existing)
    commentTimers.current[bidderName] = setTimeout(() => {
      void upsertReviewRow({
        tendererId,
        sectionKey,
        qsComment: value,
      })
    }, 600)
  }

  const persistInclude = (bidderName: string, next: boolean) => {
    const tendererId = bidderIdFor(bidderName)
    if (!sectionKey || !tendererId) return
    void upsertReviewRow({
      tendererId,
      sectionKey,
      includeInPtc: next,
    })
  }

  return (
    <section
      id={id}
      className="bg-white border border-[rgba(226,237,247,0.5)] flex flex-col gap-[24px] p-[24px] rounded-[16px] w-full scroll-mt-[120px]"
    >
      {/* Header */}
      <div className="flex flex-col gap-[8px]">
        <div className="flex items-center justify-between gap-[12px]">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex flex-1 items-center gap-[12px] min-w-0 text-left"
          >
            <span className="bg-[#142845] flex items-center justify-center rounded-[8px] size-[28px] shrink-0">
              <span className="font-semibold text-white text-[12px] leading-[16px]">
                {letter}
              </span>
            </span>
            <h3 className="font-semibold text-[#141414] text-[18px] leading-[24px] tracking-wide uppercase">
              {title}
            </h3>
          </button>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Collapse" : "Expand"}
            className="flex items-center justify-center rounded-[8px] size-[32px] hover:bg-gray-50"
          >
            {open ? (
              <ChevronUp className="size-[16px] text-[#142845]" />
            ) : (
              <ChevronDown className="size-[16px] text-[#142845]" />
            )}
          </button>
        </div>
        <p className="font-light text-[#555] text-[12px] leading-[18px] max-w-[1024px]">
          {description}
        </p>
      </div>

      {open && (
        <>
          {/* Criteria pills */}
          {criteria.length > 0 && (
            <div
              className={`grid gap-[12px] ${
                criteria.length === 1
                  ? "grid-cols-1"
                  : criteria.length === 2
                    ? "grid-cols-2"
                    : criteria.length === 3
                      ? "grid-cols-3"
                      : criteria.length === 4
                        ? "grid-cols-4"
                        : "grid-cols-5"
              }`}
            >
              {criteria.map((c) => (
                <div
                  key={c.title}
                  className="bg-[rgba(226,237,247,0.5)] border border-[#e2edf7] flex flex-col gap-[6px] p-[16px] rounded-[12px]"
                >
                  <div className="flex items-center gap-[8px]">
                    <span className="bg-white flex items-center justify-center rounded-[6px] size-[24px] shrink-0">
                      {c.icon}
                    </span>
                    <p className="font-semibold text-[#141414] text-[14px] leading-[20px]">
                      {c.title}
                    </p>
                  </div>
                  <p className="font-light text-[#555] text-[12px] leading-[16px]">
                    {c.description}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Bidder table — hidden by Section D (Figma 1280:66928) which
              renders only header + criteria cards. */}
          {!hideTable && (
          <div className="flex flex-col w-full">
            <div className="flex items-stretch w-full">
              <div className="flex flex-1 items-center gap-[16px] py-[8px] pr-[8px]">
                <p className="w-[180px] font-semibold text-[#434343] text-[12px] leading-[16px] shrink-0">
                  Tenderer
                </p>
                {columns.map((col) => (
                  <p
                    key={col}
                    className="flex-1 font-semibold text-[#434343] text-[12px] leading-[16px] whitespace-nowrap"
                  >
                    {col}
                  </p>
                ))}
                <p className="flex-[2] font-semibold text-[#434343] text-[12px] leading-[16px]">
                  QS Comment
                </p>
              </div>
              <div className="bg-[rgba(226,237,247,0.5)] flex items-center justify-center px-[16px] rounded-tl-[8px] w-[140px] shrink-0">
                <p className="font-semibold text-[#434343] text-[12px] leading-[16px] whitespace-nowrap">
                  Include in PTC?
                </p>
              </div>
            </div>

            {rows.map((row) => {
              const on = includeMap[row.bidder] ?? true
              return (
                <div
                  key={row.bidder}
                  className="border-t border-[#e2edf7] flex items-stretch w-full"
                >
                  <div className="flex flex-1 items-center gap-[16px] py-[14px] pr-[8px]">
                    <p className="w-[180px] font-medium text-[#141414] text-[14px] leading-[20px] shrink-0">
                      {row.bidder}
                    </p>
                    {row.cells.map((cell, idx) => (
                      <div
                        key={`${columns[idx]}-${idx}`}
                        className="flex-1"
                      >
                        <Pill {...cell} />
                      </div>
                    ))}
                    <div className="flex-[2] flex items-start gap-[8px]">
                      <div className="flex-1 bg-white border border-[#d9d9d9] rounded-[16px] px-[16px] py-[8px] flex items-start gap-[8px] min-h-[40px]">
                        {qsCommentAiSuggestion && (
                          <Sparkles
                            className="size-[16px] text-[#142845] shrink-0 mt-[4px]"
                            aria-label="AI suggestion"
                          />
                        )}
                        <textarea
                          value={comments[row.bidder] ?? ""}
                          onChange={(e) => {
                            const next = e.target.value
                            setComments((m) => ({ ...m, [row.bidder]: next }))
                            persistComment(row.bidder, next)
                          }}
                          rows={2}
                          className="flex-1 bg-transparent text-[#262626] text-[14px] leading-[24px] focus:outline-none resize-none min-w-0"
                          style={{ fontFamily: "Inter, sans-serif" }}
                        />
                      </div>
                      {qsCommentViewAnchor && (
                        <button
                          type="button"
                          onClick={() => {
                            const el = document.getElementById(qsCommentViewAnchor)
                            if (el)
                              el.scrollIntoView({ behavior: "smooth", block: "start" })
                          }}
                          className="border border-[#142845] flex gap-[8px] h-[32px] items-center justify-center px-[16px] py-[8px] rounded-[16px] shrink-0 hover:bg-[#f5f7fb]"
                        >
                          <Eye className="size-[16px] text-[#142845]" />
                          <span className="font-normal text-[#142845] text-[12px] leading-[16px] whitespace-nowrap">
                            View
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-[8px] px-[16px] w-[140px] shrink-0">
                    <ToggleSwitch
                      on={on}
                      onChange={(next) => {
                        setIncludeMap((m) => ({ ...m, [row.bidder]: next }))
                        persistInclude(row.bidder, next)
                      }}
                    />
                    <span className="font-normal text-[#262626] text-[14px] leading-[20px]">
                      {on ? "Yes" : "No"}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
          )}
          {children}
        </>
      )}
    </section>
  )
}

// Iconography helpers for Criteria pills, exported for the section configs
export const ComplianceIcons = {
  fot: <FileText className="size-[14px] text-[#142845]" />,
  time: <Clock className="size-[14px] text-[#142845]" />,
  ohp: <Percent className="size-[14px] text-[#142845]" />,
  validity: <Calendar className="size-[14px] text-[#142845]" />,
  signature: <PenLine className="size-[14px] text-[#142845]" />,
  shield: <ShieldCheck className="size-[14px] text-[#142845]" />,
  layers: <Layers className="size-[14px] text-[#142845]" />,
  coins: <Coins className="size-[14px] text-[#142845]" />,
  edit: <FileEdit className="size-[14px] text-[#142845]" />,
  certified: <FileCheck2 className="size-[14px] text-[#142845]" />,
  wrench: <Wrench className="size-[14px] text-[#142845]" />,
  // BoQ Section D — Figma 1280:66928
  alert: <AlertCircle className="size-[14px] text-[#142845]" />,
  banknote: <Banknote className="size-[14px] text-[#142845]" />,
  chart: <BarChart3 className="size-[14px] text-[#142845]" />,
  // Tender Documents Section E — Figma 1280:68284
  badgeCheck: <BadgeCheck className="size-[14px] text-[#142845]" />,
  folder: <Folder className="size-[14px] text-[#142845]" />,
  ruler: <Ruler className="size-[14px] text-[#142845]" />,
  checkSquare: <CheckSquare className="size-[14px] text-[#142845]" />,
  // Tender Bond Section F — Figma 1280:68848
  documentDuplicate: <Copy className="size-[14px] text-[#142845]" />,
  // Value Engineering Section H — Figma 1287:41097
  searchCircle: <ScanSearch className="size-[14px] text-[#142845]" />,
  // Form of Maintenance Section I — Figma 1287:42013
  listBullet: <List className="size-[14px] text-[#142845]" />,
  help: <HelpCircle className="size-[14px] text-[#142845]" />,
}
