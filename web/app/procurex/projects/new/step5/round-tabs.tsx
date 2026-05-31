"use client"

import type { RoundKey } from "./types"

const TABS: Array<{ key: RoundKey; label: string }> = [
  { key: "initial", label: "Initial" },
  { key: "ptc1", label: "PTC 1" },
  { key: "ptc2", label: "PTC 2" },
  { key: "ptc3", label: "PTC 3" },
]

export function RoundTabs({
  active,
  onChange,
}: {
  active: RoundKey
  onChange: (k: RoundKey) => void
}) {
  return (
    <div className="bg-[#d9d9d9] flex h-[32px] items-start p-[4px] rounded-[50px] w-fit">
      {TABS.map((t) => {
        const selected = active === t.key
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={`flex h-full items-center justify-center px-[16px] py-[8px] rounded-[500px] whitespace-nowrap text-[12px] leading-[16px] ${
              selected
                ? "bg-white font-medium text-black drop-shadow-[0_6px_8.5px_rgba(0,0,0,0.08)]"
                : "font-normal text-[#262626]"
            }`}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
