"use client"

import { useState } from "react"
import {
  X,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  ArrowRight,
} from "lucide-react"
import { BIDDERS } from "./mock-data"

interface ReviewItem {
  id: string
  bidderId: string
  category: string
  description: string
  status: "open" | "resolved"
}

const REVIEW_GROUPS: Array<{ title: string; items: ReviewItem[] }> = [
  {
    title: "High-rate items requiring QS review",
    items: [
      {
        id: "hr-1",
        bidderId: "orion",
        category: "High rate",
        description: "A-101 Concrete Foundation Work +18.4% above benchmark",
        status: "open",
      },
      {
        id: "hr-2",
        bidderId: "orion",
        category: "High rate",
        description: "A-102 Steel Reinforcement +26.3% (highest among bidders)",
        status: "open",
      },
      {
        id: "hr-3",
        bidderId: "stratus",
        category: "High rate",
        description: "B-204 MEP Risers +15.1% above benchmark",
        status: "resolved",
      },
    ],
  },
  {
    title: "Unpriced items to clarify",
    items: [
      {
        id: "up-1",
        bidderId: "helix",
        category: "Unpriced",
        description: "5 unpriced items in Bill 2 (External Works)",
        status: "open",
      },
      {
        id: "up-2",
        bidderId: "linea",
        category: "Unpriced",
        description: "3 items marked NIL — confirm scope inclusion",
        status: "open",
      },
    ],
  },
  {
    title: "Arithmetical errors",
    items: [
      {
        id: "ae-1",
        bidderId: "stratus",
        category: "Arithmetical",
        description: "Tender sum off by AED 12,400 — adjust before issuing",
        status: "open",
      },
    ],
  },
  {
    title: "Commercial deviations",
    items: [
      {
        id: "cd-1",
        bidderId: "orion",
        category: "Commercial",
        description: "Variation markup % differs from FOT clause 3(a)",
        status: "open",
      },
    ],
  },
  {
    title: "Compliance gaps",
    items: [
      {
        id: "cg-1",
        bidderId: "axis",
        category: "Compliance",
        description: "Time for Completion missing — flag with bidder",
        status: "open",
      },
      {
        id: "cg-2",
        bidderId: "axis",
        category: "Compliance",
        description: "Tender Validity non-compliant",
        status: "open",
      },
    ],
  },
]

function bidderName(id: string) {
  return BIDDERS.find((b) => b.id === id)?.fullName ?? id
}

function GroupBlock({
  title,
  items,
}: {
  title: string
  items: ReviewItem[]
}) {
  const [open, setOpen] = useState(true)
  const openCount = items.filter((i) => i.status === "open").length

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between gap-[8px] py-[8px] w-full"
      >
        <div className="flex items-center gap-[8px] flex-1">
          {open ? (
            <ChevronDown className="size-[14px] text-[#142845]" />
          ) : (
            <ChevronRight className="size-[14px] text-[#142845]" />
          )}
          <span className="font-semibold text-[#141414] text-[13px] leading-[18px] text-left">
            {title}
          </span>
        </div>
        <span className="bg-[#f299ae] flex items-center justify-center px-[8px] rounded-[8px] h-[20px]">
          <span className="font-medium text-black text-[11px] leading-[14px]">
            {openCount}
          </span>
        </span>
      </button>
      {open && (
        <div className="flex flex-col gap-[8px] pt-[4px] pb-[8px]">
          {items.map((item) => (
            <div
              key={item.id}
              className={`flex items-start gap-[10px] p-[12px] rounded-[10px] border ${
                item.status === "resolved"
                  ? "bg-emerald-50 border-emerald-100"
                  : "bg-[#fff5f7] border-[#f299ae]/40"
              }`}
            >
              {item.status === "resolved" ? (
                <CircleCheck className="size-[14px] text-emerald-500 fill-emerald-500 stroke-white shrink-0 mt-[2px]" />
              ) : (
                <CircleAlert className="size-[14px] text-[#c32a4f] shrink-0 mt-[2px]" />
              )}
              <div className="flex-1 flex flex-col gap-[2px] min-w-0">
                <p className="font-medium text-[#141414] text-[12px] leading-[16px]">
                  {item.description}
                </p>
                <p className="font-light text-[#555] text-[11px] leading-[14px]">
                  {bidderName(item.bidderId)}
                </p>
              </div>
              <button
                type="button"
                aria-label="Open item"
                className="text-[#142845] hover:text-black"
              >
                <ArrowRight className="size-[14px]" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function ReviewPanel({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const totalOpen = REVIEW_GROUPS.reduce(
    (sum, g) => sum + g.items.filter((i) => i.status === "open").length,
    0,
  )

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className="fixed right-0 top-0 bottom-0 w-[420px] bg-white border-l border-[#e9e9e9] shadow-[-8px_0_24px_rgba(20,40,69,0.08)] z-50 flex flex-col"
        role="dialog"
        aria-label="Review PTC"
      >
        <div className="flex items-start justify-between px-[24px] pt-[24px] pb-[16px] border-b border-[#e9e9e9]">
          <div className="flex flex-col gap-[6px]">
            <div className="flex items-center gap-[10px]">
              <h3
                className="font-bold text-[#142845] text-[20px] leading-[28px]"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                Review PTC
              </h3>
              <span className="bg-[#f299ae] flex items-center justify-center px-[8px] rounded-[8px] h-[22px]">
                <span className="font-semibold text-black text-[11px] leading-[14px] whitespace-nowrap">
                  {totalOpen} to review
                </span>
              </span>
            </div>
            <p className="font-light text-[#555] text-[12px] leading-[16px]">
              Resolve the items below before issuing the PTC pack.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="bg-white border border-[#e9e9e9] flex items-center justify-center rounded-[8px] size-[32px] hover:bg-gray-50"
          >
            <X className="size-[16px] text-[#142845]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-[24px] py-[8px]">
          {REVIEW_GROUPS.map((g) => (
            <GroupBlock key={g.title} title={g.title} items={g.items} />
          ))}
        </div>

        <div className="flex items-center gap-[12px] px-[24px] py-[16px] border-t border-[#e9e9e9] bg-white">
          <button
            type="button"
            onClick={onClose}
            className="border border-[#142845] flex h-[40px] items-center justify-center px-[16px] rounded-[12px] flex-1 font-normal text-[#142845] text-[12px] leading-[16px]"
          >
            Continue editing
          </button>
          <button
            type="button"
            className="bg-[#142845] flex h-[40px] items-center justify-center px-[16px] rounded-[12px] flex-1 font-normal text-white text-[12px] leading-[16px]"
          >
            Issue PTC pack
          </button>
        </div>
      </aside>
    </>
  )
}
