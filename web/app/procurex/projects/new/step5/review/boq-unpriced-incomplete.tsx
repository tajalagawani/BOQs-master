"use client"

import { useState } from "react"
import {
  Banknote,
  Check,
  ChevronUp,
  ChevronsUpDown,
  CircleCheck,
  MoreHorizontal,
} from "lucide-react"

/**
 * Section D sub-block — "Unpriced / Incomplete Items".
 *
 * Pulled as-is from Figma 1279:61031. TWO stacked sub-sections:
 *
 *   C1 — Included / Incomplete (Needs individual pricing)
 *       columns: Item ref · BOQ Item · Unit · Quantity · Tenderer entry ·
 *                Impact (AED) · Instruction · Include in PTC?
 *
 *   C2 — Excluded / By client / By others (QS review required)
 *       columns: Item ref · BOQ Item · Unit · Quantity · Tenderer entry ·
 *                Impact (AED) · Include in PTC?
 *
 * Each sub-table has its own light-blue section header bar
 * (`rgba(226,237,247,0.5)`) with a chevron-up collapse affordance.
 * Status pills sit in the "Tenderer entry" column (Included / Excluded /
 * By others / By client); instruction pills sit in the C1 Instruction
 * column (Price item / Missing unit rate / Missing price). All pills
 * use the amber `#faebd3` background.
 *
 * Below the tables: a QS Acceptance card with a checkbox.
 */

export interface UnpricedIncompleteRow {
  id: string
  itemRef: string
  boqItem: string
  unit: string
  quantity: string
  /** Pill text in the "Tenderer entry" column. */
  tendererEntry: "Included" | "Excluded" | "By others" | "By client"
  /** AED impact figure — e.g. "+80,000", "424", or "—". */
  impactAed: string
  /** Whether the Impact value should render with a red highlight pill.
   *  Per Figma, some Impact figures use the warning chip. */
  impactWarning?: boolean
  /** Only used for C1 rows. */
  instruction?: "Price item" | "Missing unit rate" | "Missing price"
  includeInPtc: boolean
}

export interface BoqUnpricedIncompleteBlockProps {
  id?: string
  included: UnpricedIncompleteRow[]
  excluded: UnpricedIncompleteRow[]
  qsAccepted?: { byName: string; atIso: string } | null
}

export function BoqUnpricedIncompleteBlock({
  id,
  included,
  excluded,
  qsAccepted,
}: BoqUnpricedIncompleteBlockProps) {
  const [includes, setIncludes] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      [...included, ...excluded].map((r) => [r.id, r.includeInPtc]),
    ),
  )
  const [qsAcceptedLocal, setQsAcceptedLocal] = useState(Boolean(qsAccepted))
  const [c1Open, setC1Open] = useState(true)
  const [c2Open, setC2Open] = useState(true)

  return (
    <section id={id} className="flex flex-col gap-[32px] w-full scroll-mt-[120px]">
      {/* Sub-section header */}
      <div className="flex items-center gap-[32px] w-full">
        <div className="flex flex-1 items-center gap-[8px] min-w-0">
          <span className="bg-[rgba(226,237,247,0.5)] flex items-center justify-center rounded-[8px] size-[40px] shadow-[1px_1px_200px_0px_rgba(0,0,0,0.1)] shrink-0">
            <Banknote className="size-[16px] text-[#142845]" />
          </span>
          <h3 className="font-semibold text-[#142845] text-[18px] leading-[24px]">
            Unpriced / Incomplete Items
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

      {/* C1 — Included / Incomplete (Needs individual pricing) */}
      <div className="flex flex-col w-full">
        <SubsectionHeaderBar
          label="C1 - Included / Incomplete (Needs individual pricing)"
          open={c1Open}
          onToggle={() => setC1Open((v) => !v)}
        />
        {c1Open && (
          <>
            <p className="px-[16px] py-[8px] font-light text-[#555] text-[12px] leading-[16px]">
              The tenderer is required to provide an individual price for each
              item listed.
            </p>
            <UnpricedTable
              rows={included}
              variant="c1"
              includes={includes}
              setIncludes={setIncludes}
            />
          </>
        )}
      </div>

      {/* C2 — Excluded / By client / By others (QS review required) */}
      <div className="flex flex-col w-full">
        <SubsectionHeaderBar
          label="C2 - Excluded / By client / By others (QS review required)"
          open={c2Open}
          onToggle={() => setC2Open((v) => !v)}
        />
        {c2Open && (
          <UnpricedTable
            rows={excluded}
            variant="c2"
            includes={includes}
            setIncludes={setIncludes}
          />
        )}
      </div>

      {/* QS Acceptance card */}
      <QsAcceptanceCard
        label="I confirm unpriced / incomplete items have been reviewed for this tenderer"
        accepted={qsAcceptedLocal}
        onToggle={() => setQsAcceptedLocal((v) => !v)}
        meta={qsAccepted}
      />
    </section>
  )
}

// ─── Sub-section header bar — full-width light-blue strip with title
//     centered and a chevron-up collapse affordance on the right. ─────

function SubsectionHeaderBar({
  label,
  open,
  onToggle,
}: {
  label: string
  open: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="bg-[rgba(226,237,247,0.5)] flex items-center justify-between px-[16px] py-[10px] rounded-[8px] w-full hover:bg-[rgba(226,237,247,0.7)]"
    >
      <span className="flex-1 text-center font-semibold text-[#142845] text-[14px] leading-[20px]">
        {label}
      </span>
      <ChevronUp
        className={`size-[16px] text-[#142845] shrink-0 transition-transform ${
          open ? "" : "rotate-180"
        }`}
      />
    </button>
  )
}

// ─── Inner unpriced/incomplete table ────────────────────────────────

function UnpricedTable({
  rows,
  variant,
  includes,
  setIncludes,
}: {
  rows: UnpricedIncompleteRow[]
  variant: "c1" | "c2"
  includes: Record<string, boolean>
  setIncludes: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
}) {
  return (
    <div className="w-full">
      {/* Column header */}
      <div className="flex items-start w-full">
        <div className="flex flex-1 items-center gap-[16px] pb-[8px] pr-[8px] pt-[12px] pl-[16px]">
          <Th width={64}>Item ref</Th>
          <Th width={184}>BOQ Item</Th>
          <Th width={56}>Unit</Th>
          <Th width={72}>Quantity</Th>
          <Th width={112}>Tenderer entry</Th>
          <Th width={104}>Impact (AED)</Th>
          {variant === "c1" && <Th>Instruction</Th>}
          {variant === "c2" && <div className="flex-1" />}
        </div>
        <div className="flex items-center justify-center px-[16px] w-[160px] shrink-0 pt-[12px]">
          <p className="font-semibold text-[#434343] text-[12px] leading-[16px]">
            Include in PTC?
          </p>
        </div>
      </div>

      {/* Body */}
      {rows.length === 0 ? (
        <div className="border-t border-[#e2edf7] py-[24px] text-center text-[12px] text-[#888]">
          {variant === "c1"
            ? "No incomplete-priced items on this bidder's submission."
            : "No excluded items on this bidder's submission."}
        </div>
      ) : (
        rows.map((row) => {
          const on = includes[row.id] ?? row.includeInPtc
          return (
            <div
              key={row.id}
              className="border-t border-[#e2edf7] flex gap-[16px] items-center py-[16px] w-full"
            >
              <div className="flex flex-1 items-center gap-[16px] pr-[8px] pl-[16px]">
                <BodyCell width={64} className="text-black text-[12px] leading-[16px]">
                  {row.itemRef}
                </BodyCell>
                <BodyCell width={184} className="text-[#262626] text-[14px] leading-[24px] truncate">
                  {row.boqItem}
                </BodyCell>
                <BodyCell width={56} className="text-[#262626] text-[14px] leading-[24px] truncate">
                  {row.unit}
                </BodyCell>
                <BodyCell width={72} className="text-[#262626] text-[14px] leading-[24px] tabular-nums truncate">
                  {row.quantity}
                </BodyCell>
                <BodyCell width={112}>
                  <AmberPill text={row.tendererEntry} />
                </BodyCell>
                <BodyCell width={104}>
                  {row.impactWarning ? (
                    <span className="bg-[#f8ccd7] inline-flex items-center justify-center px-[8px] h-[24px] rounded-[8px] text-black text-[12px] leading-[16px] tabular-nums">
                      {row.impactAed}
                    </span>
                  ) : (
                    <span className="text-[#262626] text-[14px] leading-[24px] tabular-nums">
                      {row.impactAed}
                    </span>
                  )}
                </BodyCell>
                {variant === "c1" && (
                  <BodyCell className="flex-1">
                    {row.instruction ? (
                      <AmberPill text={row.instruction} />
                    ) : (
                      <span className="text-[#9aa1ac] text-[12px]">—</span>
                    )}
                  </BodyCell>
                )}
                {variant === "c2" && <div className="flex-1" />}
              </div>
              <div className="flex items-center gap-[8px] px-[16px] w-[160px] shrink-0">
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
                <span className="text-[#262626] text-[14px] leading-[24px]">
                  {on ? "Yes" : "No"}
                </span>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

function AmberPill({ text }: { text: string }) {
  return (
    <span className="bg-[#faebd3] inline-flex items-center justify-center h-[24px] px-[8px] rounded-[8px] whitespace-nowrap">
      <span className="text-black text-[12px] leading-[16px]">{text}</span>
    </span>
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
  const style = width !== undefined ? { width } : undefined
  return (
    <div
      className={`flex h-full items-center shrink-0 ${className}`}
      style={style}
    >
      {children}
    </div>
  )
}

// ─── QS Acceptance card (shared shape used by every BoQ sub-block) ──

function QsAcceptanceCard({
  label,
  accepted,
  onToggle,
  meta,
}: {
  label: string
  accepted: boolean
  onToggle: () => void
  meta?: { byName: string; atIso: string } | null
}) {
  return (
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
                aria-checked={accepted}
                onClick={onToggle}
                className={`size-[16px] rounded-[4px] border border-[#212121] flex items-center justify-center shrink-0 ${
                  accepted ? "bg-[#212121]" : "bg-white"
                }`}
              >
                {accepted && (
                  <Check className="size-[12px] text-white" strokeWidth={3} />
                )}
              </button>
              <p className="font-light text-black text-[14px] leading-[24px]">
                {label}
              </p>
            </div>
            <div className="flex items-center gap-[16px] shrink-0">
              {meta ? (
                <p className="italic text-[#555] text-[12px] leading-[16px]">
                  {meta.atIso} by {meta.byName}
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
  )
}
