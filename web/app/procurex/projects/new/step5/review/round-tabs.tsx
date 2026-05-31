"use client"

export type ReviewRoundKey = "initial" | "ptc1" | "ptc2" | "ptc3" | "summary"

const TABS: Array<{ key: ReviewRoundKey; label: string }> = [
  { key: "initial", label: "Initial" },
  { key: "ptc1", label: "PTC 1" },
  { key: "ptc2", label: "PTC 2" },
  { key: "ptc3", label: "PTC 3" },
  { key: "summary", label: "PTC Summary" },
]

export function ReviewRoundTabs({
  active,
  onChange,
  /** Round keys whose tabs should be hidden entirely (e.g. when PTC issued and no response yet) */
  hiddenRounds = [],
}: {
  active: ReviewRoundKey
  onChange: (k: ReviewRoundKey) => void
  hiddenRounds?: ReviewRoundKey[]
}) {
  const visibleTabs = TABS.filter((t) => !hiddenRounds.includes(t.key))
  return (
    <div className="bg-[#d9d9d9] flex h-[32px] items-start p-[4px] rounded-[50px] w-fit">
      {visibleTabs.map((t) => {
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
