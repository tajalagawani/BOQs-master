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
    <div className="bg-white border border-[#e2edf7] flex items-center p-[3px] rounded-[10px] gap-[2px] print:hidden">
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
      className={`flex items-center gap-[6px] h-[26px] px-[10px] rounded-[8px] text-[12px] leading-[16px] transition-colors ${
        active
          ? "bg-[#142845] text-white font-medium"
          : "text-[#555] hover:bg-[rgba(226,237,247,0.5)]"
      }`}
    >
      <span
        className={
          active ? "text-white" : "text-[#888]"
        }
      >
        {icon}
      </span>
      {label}
      <span
        className={`tabular-nums text-[10px] font-medium px-[6px] py-[1px] rounded-[6px] ${
          active ? "bg-white/15 text-white" : "bg-[#f5f5f5] text-[#555]"
        }`}
      >
        {badge}
      </span>
    </button>
  )
}
