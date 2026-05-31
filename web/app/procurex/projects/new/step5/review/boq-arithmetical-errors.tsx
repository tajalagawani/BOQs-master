"use client"

import { useState } from "react"
import {
  AlertCircle,
  Check,
  ChevronsUpDown,
  CircleCheck,
  MoreHorizontal,
} from "lucide-react"

/**
 * Section D sub-block — "Arithmetical Errors".
 *
 * Pulled as-is from Figma 1292:47192. Columns:
 *   Item ref · Description · Document · Expected · Found · Difference · Include in PTC?
 *
 * Below the table is a QS Acceptance card with a single checkbox the
 * QS ticks once they've reviewed the bidder's arithmetical errors.
 * Both surfaces are local state for now — persistence (sub-section
 * QS acceptance + per-row Include-in-PTC) will land alongside
 * `tender_priceset_review` when the BoQ Review backend ships.
 *
 * Real source for rows when wiring lands:
 *   SELECT item_id, payload->>'expectedCents', payload->>'gotCents',
 *          payload->>'documentSource', boq_item.label
 *   FROM tender_flag
 *   JOIN boq_item ON boq_item.id = tender_flag.item_id
 *   WHERE tender_flag.tenderer_id = ? AND tender_flag.kind = 'arithmetical_error'
 */

export interface ArithmeticalErrorRow {
  id: string
  itemRef: string
  description: string
  document: string
  expected: string
  found: string
  difference: string
  includeInPtc: boolean
}

export interface BoqArithmeticalErrorsBlockProps {
  id?: string
  rows: ArithmeticalErrorRow[]
  /** Persisted QS acceptance — when null, the checkbox renders empty. */
  qsAccepted?: { byName: string; atIso: string } | null
}

export function BoqArithmeticalErrorsBlock({
  id,
  rows,
  qsAccepted,
}: BoqArithmeticalErrorsBlockProps) {
  // Local-only state mirrors the Figma. Persistence lands when the
  // tender_priceset_review table ships.
  const [includes, setIncludes] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(rows.map((r) => [r.id, r.includeInPtc])),
  )
  const [qsAcceptedLocal, setQsAcceptedLocal] = useState(Boolean(qsAccepted))

  return (
    <section id={id} className="flex flex-col gap-[32px] w-full scroll-mt-[120px]">
      {/* Sub-section header */}
      <div className="flex items-center gap-[32px] w-full">
        <div className="flex flex-1 items-center gap-[8px] min-w-0">
          <span className="bg-[rgba(226,237,247,0.5)] flex items-center justify-center rounded-[8px] size-[40px] shadow-[1px_1px_200px_0px_rgba(0,0,0,0.1)] shrink-0">
            <AlertCircle className="size-[16px] text-[#142845]" />
          </span>
          <h3 className="font-semibold text-[#142845] text-[18px] leading-[24px]">
            Arithmetical Errors
          </h3>
        </div>
        <button
          type="button"
          className="flex items-center justify-center rounded-[8px] size-[32px] hover:bg-gray-50"
          aria-label="Section options"
        >
          <MoreHorizontal className="size-[16px] text-[#142845]" />
        </button>
      </div>

      {/* Errors table */}
      <div className="w-full">
        <div className="rounded-tl-[8px] rounded-tr-[8px] overflow-hidden">
          {/* Header row */}
          <div className="flex items-start w-full">
            <div className="flex flex-1 items-center gap-[16px] pb-[8px] pr-[8px]">
              <Th width={80}>Item ref</Th>
              <Th width={216}>Description</Th>
              <Th width={128}>Document</Th>
              <Th width={96}>Expected</Th>
              <Th width={104}>Found</Th>
              <Th>Difference</Th>
            </div>
            <div className="bg-[rgba(226,237,247,0.5)] flex items-center justify-center rounded-tl-[8px] px-[16px] w-[163px] shrink-0 h-[24px]">
              <p className="font-semibold text-[#434343] text-[12px] leading-[16px]">
                Include in PTC?
              </p>
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="border-t border-[#e2edf7] py-[24px] text-center text-[12px] text-[#888]">
              No arithmetical errors detected on this bidder's submission.
            </div>
          ) : (
            rows.map((row) => {
              const on = includes[row.id] ?? row.includeInPtc
              return (
                <div
                  key={row.id}
                  className="border-t border-[#e2edf7] flex gap-[16px] items-center py-[16px] w-full"
                >
                  <div className="flex flex-1 items-center gap-[16px] pr-[8px]">
                    <BodyCell width={80} className="font-normal text-black text-[12px] leading-[16px]">
                      {row.itemRef}
                    </BodyCell>
                    <BodyCell width={216} className="text-[#262626] text-[14px] leading-[24px] truncate">
                      {row.description}
                    </BodyCell>
                    <BodyCell width={128} className="text-[#262626] text-[14px] leading-[24px] truncate">
                      {row.document}
                    </BodyCell>
                    <BodyCell width={96} className="text-[#262626] text-[14px] leading-[24px] tabular-nums truncate">
                      {row.expected}
                    </BodyCell>
                    <BodyCell width={104} className="text-[#262626] text-[14px] leading-[24px] tabular-nums truncate">
                      {row.found}
                    </BodyCell>
                    <BodyCell className="flex-1 text-[#262626] text-[14px] leading-[24px] tabular-nums truncate">
                      {row.difference}
                    </BodyCell>
                  </div>
                  <div className="flex items-center gap-[8px] px-[16px] w-[161px] shrink-0">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={on}
                      onClick={() =>
                        setIncludes((m) => ({ ...m, [row.id]: !on }))
                      }
                      className={`flex items-center p-[4px] rounded-[13px] shadow-[0_4px_8px_0_rgba(0,0,0,0.1)] w-[48px] h-[26px] shrink-0 transition-colors ${
                        on
                          ? "bg-[#2a69b9] justify-end"
                          : "bg-[#c4c4c4] justify-start"
                      }`}
                    >
                      <span className="bg-white rounded-full size-[16px] block" />
                    </button>
                    <span className="text-[#262626] text-[14px] leading-[24px] font-normal">
                      {on ? "Yes" : "No"}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* QS Acceptance card */}
      <div className="bg-white border border-[rgba(226,237,247,0.5)] flex flex-col gap-[32px] p-[24px] rounded-[16px]">
        <div className="flex h-[32px] items-center gap-[32px]">
          <div className="flex flex-1 items-center min-w-0">
            <h4 className="font-semibold text-[#142845] text-[18px] leading-[24px]">
              QS Acceptance
            </h4>
          </div>
          <button
            type="button"
            className="flex items-center justify-center rounded-[8px] size-[32px] hover:bg-gray-50"
            aria-label="Acceptance options"
          >
            <MoreHorizontal className="size-[16px] text-[#142845]" />
          </button>
        </div>
        <div className="flex flex-col h-[64px] items-start justify-center">
          <div className="bg-white flex flex-col items-start justify-center px-[16px] py-[8px] rounded-[8px] w-full">
            <div className="flex items-center w-full">
              <div className="flex flex-1 items-center gap-[8px] min-w-0">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={qsAcceptedLocal}
                  onClick={() => setQsAcceptedLocal((v) => !v)}
                  className={`size-[16px] rounded-[4px] border border-[#212121] flex items-center justify-center shrink-0 drop-shadow-[0_3px_6px_rgba(0,90,132,0.04)] ${
                    qsAcceptedLocal ? "bg-[#212121]" : "bg-white"
                  }`}
                >
                  {qsAcceptedLocal && (
                    <Check
                      className="size-[12px] text-white"
                      strokeWidth={3}
                    />
                  )}
                </button>
                <p className="font-light text-black text-[14px] leading-[24px]">
                  I confirm arithmetical checks have been reviewed for this
                  tenderer
                </p>
              </div>
              <div className="flex items-center gap-[16px] shrink-0">
                {qsAccepted ? (
                  <p className="italic text-[#555] text-[12px] leading-[16px]">
                    {formatAcceptedAt(qsAccepted.atIso)} by {qsAccepted.byName}
                  </p>
                ) : (
                  <p className="italic text-[#555] text-[12px] leading-[16px]">
                    Not implemented — sub-section QS acceptance has no table yet
                  </p>
                )}
                <span className="bg-[#c8e5d5] flex h-[24px] items-center justify-center px-[8px] rounded-[8px] gap-[4px]">
                  <CircleCheck className="size-[16px] text-emerald-700 fill-emerald-100" />
                  <span className="text-black text-[12px] leading-[16px]">
                    QS Accepted
                  </span>
                </span>
                <button
                  type="button"
                  className="flex items-center justify-center rounded-[8px] size-[32px] hover:bg-gray-50"
                  aria-label="More"
                >
                  <MoreHorizontal className="size-[16px] text-[#142845]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Th({
  children,
  width,
}: {
  children: React.ReactNode
  width?: number
}) {
  const widthCls = width === undefined ? "flex-1 min-w-0" : ""
  const style = width !== undefined ? { width } : undefined
  return (
    <div
      className={`flex items-center gap-[4px] shrink-0 ${widthCls}`}
      style={style}
    >
      <span className="font-semibold text-[#434343] text-[12px] leading-[16px]">
        {children}
      </span>
      <ChevronsUpDown className="size-[12px] text-[#9aa1ac] shrink-0" />
    </div>
  )
}

function BodyCell({
  children,
  width,
  className = "",
}: {
  children: React.ReactNode
  width?: number
  className?: string
}) {
  const widthCls = width === undefined ? "" : ""
  const style = width !== undefined ? { width } : undefined
  return (
    <div
      className={`flex h-full items-center shrink-0 ${widthCls} ${className}`}
      style={style}
    >
      {children}
    </div>
  )
}

function formatAcceptedAt(iso: string): string {
  try {
    const d = new Date(iso)
    return `${String(d.getDate()).padStart(2, "0")}/${d.toLocaleString("en-GB", { month: "short" })}/${d.getFullYear()}`
  } catch {
    return iso
  }
}
