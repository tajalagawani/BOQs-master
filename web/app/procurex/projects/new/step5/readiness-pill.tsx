"use client"

import { Info } from "lucide-react"

/**
 * PTC-readiness pill. Currently has no DB source — there's no
 * `ptc_round` table modelling readiness yet — so when called with no
 * `status` prop it renders a "Not implemented" affordance instead of
 * a fake "Needs Review" string.
 */
export function PtcReadinessPill({
  status,
}: {
  status?: "ready" | "needs-review" | "blocked" | null
} = {}) {
  if (!status) {
    return (
      <span
        className="inline-flex items-center gap-[6px] px-[8px] py-[2px] rounded-[8px] border border-dashed border-[#94a3b8] bg-white text-[#475569] text-[12px] font-medium uppercase tracking-wider w-fit"
        title="No `ptc_round` table yet — readiness calc not implemented"
      >
        PTC readiness — Not implemented
      </span>
    )
  }
  const palette =
    status === "ready"
      ? "bg-[#c8e5d5]"
      : status === "blocked"
        ? "bg-[#f8d7d7]"
        : "bg-[#f299ae]"
  const label =
    status === "ready"
      ? "Ready"
      : status === "blocked"
        ? "Blocked"
        : "Needs Review"
  return (
    <span
      className={`${palette} inline-flex items-center justify-center px-[8px] rounded-[8px] gap-[8px] h-[24px] w-fit`}
    >
      <span className="text-black text-[12px] leading-[16px] whitespace-nowrap">
        <span className="font-semibold">PTC readiness:</span>
        <span className="font-normal"> {label}</span>
      </span>
      <Info className="size-[16px] text-black" />
    </span>
  )
}
