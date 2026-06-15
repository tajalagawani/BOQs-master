"use client"

import { Layers, List } from "lucide-react"

export type RateView = "item" | "section"

/**
 * Segmented toggle: switches a high/low rate sub-block between
 * per-item rows (default) and per-section aggregated rows.
 *
 * Item view  → one row per BoQ item per bidder (variance vs PTE rate)
 * Section view → one row per BoQ section per bidder (variance vs PTE
 *                section total). Cheaper to scan when items are noisy.
 *
 * Restyled to the 10X suite tokens — parchment track, navy active
 * pill, mirroring the report's segmented controls.
 */
export function RateViewToggle({
  value,
  onChange,
  itemCount,
  sectionCount,
}: {
  value: RateView
  onChange: (next: RateView) => void
  itemCount: number
  sectionCount: number
}) {
  return (
    <div className="bg-suite-card-soft border border-suite-line flex items-center p-[3px] rounded-[10px] gap-[2px] print:hidden">
      <ToggleButton
        active={value === "item"}
        onClick={() => onChange("item")}
        icon={<List className="size-[12px]" />}
        label="Per item"
        badge={itemCount}
      />
      <ToggleButton
        active={value === "section"}
        onClick={() => onChange("section")}
        icon={<Layers className="size-[12px]" />}
        label="Per section"
        badge={sectionCount}
      />
    </div>
  )
}

function ToggleButton({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  badge: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-[6px] h-[26px] px-[10px] rounded-[8px] text-[12px] leading-[16px] font-medium transition-colors ${
        active
          ? "bg-suite-navy-2 text-white"
          : "text-suite-ink-2 hover:bg-suite-card"
      }`}
    >
      <span className={active ? "text-white" : "text-suite-ink-4"}>
        {icon}
      </span>
      {label}
      <span
        className={`suite-num text-[10px] font-medium px-[6px] py-[1px] rounded-[6px] ${
          active ? "bg-white/15 text-white" : "bg-suite-neut-bg text-suite-ink-2"
        }`}
      >
        {badge}
      </span>
    </button>
  )
}
