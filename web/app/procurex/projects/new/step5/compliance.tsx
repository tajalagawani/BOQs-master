"use client"

import { useState } from "react"
import {
  ChevronDown,
  ChevronUp,
  CircleCheck,
  CircleAlert,
  CircleX,
  CircleHelp,
} from "lucide-react"
import type { ProjectComplianceRow } from "@/modules/procurex/review/overview-data"
import type { ComplianceCell } from "./types"

const REQUIREMENTS = [
  { key: "fotSubmission", label: "FOT Submission" },
  { key: "timeForCompletion", label: "Time for Completion" },
  { key: "ohpMarkup", label: "OHP Markup" },
  { key: "tenderValidity", label: "Tender Validity" },
  { key: "signatures", label: "Signatures" },
] as const

function StatusIcon({ status }: { status: ComplianceCell["status"] }) {
  if (status === "compliant") {
    return (
      <CircleCheck className="size-[16px] text-emerald-500 fill-emerald-500 stroke-white" />
    )
  }
  if (status === "partial") {
    return <CircleAlert className="size-[16px] text-amber-500" />
  }
  if (status === "non_compliant") {
    return <CircleX className="size-[16px] text-red-500" />
  }
  return <CircleHelp className="size-[16px] text-[#a3a3a3]" />
}

function StatusPill({ status }: { status: ComplianceCell["status"] }) {
  const map = {
    compliant: { label: "Compliant", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    partial: { label: "Partial", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    non_compliant: { label: "Non-compliant", cls: "bg-red-50 text-red-700 border-red-200" },
    missing: { label: "Missing", cls: "bg-gray-50 text-gray-600 border-gray-200" },
  }
  const m = map[status]
  return (
    <span
      className={`inline-flex items-center gap-[4px] border ${m.cls} text-[11px] font-medium px-[8px] py-[2px] rounded-[6px]`}
    >
      <StatusIcon status={status} />
      {m.label}
    </span>
  )
}

export function ComplianceRequirements({
  id,
  rows,
}: {
  id: string
  /** Real per-bidder compliance rows. `null` = loading; `[]` = no
   *  tenderers on the project yet. */
  rows: ProjectComplianceRow[] | null
}) {
  const [open, setOpen] = useState(true)

  return (
    <section
      id={id}
      className="bg-white rounded-[16px] p-[24px] flex flex-col gap-[16px]"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full"
      >
        <div className="flex items-center gap-[12px]">
          <span className="bg-[#142845] flex items-center justify-center px-[8px] py-[2px] rounded-[8px] min-w-[40px]">
            <span className="font-medium text-white text-[12px] leading-[20px]">
              03
            </span>
          </span>
          <h3 className="font-semibold text-[#141414] text-[18px] leading-[24px]">
            Compliance Requirements
          </h3>
        </div>
        {open ? (
          <ChevronUp className="size-[16px] text-[#142845]" />
        ) : (
          <ChevronDown className="size-[16px] text-[#142845]" />
        )}
      </button>
      <p className="font-light text-[#555] text-[12px] leading-[16px]">
        Per-bidder compliance against the FOT clauses.
      </p>

      {open && (
        <>
          {/* Header chips */}
          <div className="grid grid-cols-5 gap-[12px]">
            {REQUIREMENTS.map((r) => (
              <div
                key={r.key}
                className="bg-[#e2edf7] border border-[#b9d2eb] flex flex-col items-center justify-center gap-[4px] px-[12px] py-[10px] rounded-[12px]"
              >
                <span className="font-medium text-[#142845] text-[12px] leading-[16px] text-center">
                  {r.label}
                </span>
              </div>
            ))}
          </div>

          {/* Compliance Summary */}
          <div className="flex flex-col gap-[12px] pt-[8px]">
            <h4 className="font-semibold text-[#141414] text-[14px] leading-[20px]">
              Compliance Summary
            </h4>
            <div className="flex flex-col gap-[8px]">
              {rows === null ? (
                <div className="text-[12px] text-[#888] px-[16px] py-[10px]">
                  Loading compliance data…
                </div>
              ) : rows.length === 0 ? (
                <div className="text-[12px] text-[#888] px-[16px] py-[10px]">
                  No tenderers on this project yet.
                </div>
              ) : (
                rows.map((row) => (
                  <div
                    key={row.bidderId}
                    className="bg-[#f8f8f8] border border-[#e9e9e9] flex items-center gap-[16px] px-[16px] py-[10px] rounded-[12px]"
                  >
                    <span className="bg-[#142845] flex items-center justify-center rounded-[6px] size-[24px] text-white text-[11px] font-medium shrink-0">
                      {row.code}
                    </span>
                    <span className="font-medium text-[#141414] text-[12px] w-[200px] shrink-0">
                      {row.name}
                    </span>
                    <div className="grid grid-cols-5 gap-[8px] flex-1">
                      <StatusPill status={row.cells.fotSubmission} />
                      <StatusPill status={row.cells.timeForCompletion} />
                      <StatusPill status={row.cells.ohpMarkup} />
                      <StatusPill status={row.cells.tenderValidity} />
                      <StatusPill status={row.cells.signatures} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </section>
  )
}
