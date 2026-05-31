"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Mail } from "lucide-react"
import { BIDDER_SUMMARIES } from "./mock-data"

export function ExecutiveSummary({
  id,
  ptePresent,
}: {
  id: string
  ptePresent: boolean
}) {
  const [open, setOpen] = useState(true)

  const lowest = BIDDER_SUMMARIES[0]
  const mostCommercial = BIDDER_SUMMARIES[0]
  const mostTechnical = BIDDER_SUMMARIES[1]
  const ptePtcDiff = lowest.variancePct
  const direction = ptePtcDiff < 0 ? "below" : "above"
  const diffAbs = Math.abs(ptePtcDiff)

  const formatM = (n: number) =>
    `AED ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M`

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
              01
            </span>
          </span>
          <h3 className="font-semibold text-[#141414] text-[18px] leading-[24px]">
            Executive Summary
          </h3>
        </div>
        {open ? (
          <ChevronUp className="size-[16px] text-[#142845]" />
        ) : (
          <ChevronDown className="size-[16px] text-[#142845]" />
        )}
      </button>
      <p className="font-light text-[#555] text-[12px] leading-[16px]">
        Auto-generated narrative from the latest tender returns. Edit copy
        before issuing.
      </p>

      {open && (
        <div className="flex flex-col gap-[12px] pt-[8px]">
          {ptePresent ? (
            <>
              <p className="text-[#141414] text-[14px] leading-[24px]">
                <span className="font-semibold">{lowest.fullName}</span>{" "}
                is the lowest tenderer at{" "}
                <span className="font-semibold">{formatM(lowest.tenderSum)}</span>
                , which is{" "}
                <span className="font-semibold">
                  {diffAbs}% {direction}
                </span>{" "}
                the PTE.
              </p>
              <p className="text-[#141414] text-[14px] leading-[24px]">
                <span className="font-semibold">{mostCommercial.fullName}</span>{" "}
                is the most compliant commercial by{" "}
                <span className="font-semibold">98%</span>.
              </p>
              <p className="text-[#141414] text-[14px] leading-[24px]">
                <span className="font-semibold">{mostTechnical.fullName}</span>{" "}
                is the most compliant commercial by{" "}
                <span className="font-semibold">95%</span>.
              </p>
            </>
          ) : (
            <p className="text-[#141414] text-[14px] leading-[24px]">
              <span className="font-semibold">{lowest.fullName}</span>{" "}
              is the lowest tenderer at{" "}
              <span className="font-semibold">{formatM(lowest.tenderSum)}</span>
              . Variances are shown against the lowest tenderer.
            </p>
          )}

          <div className="flex flex-col gap-[8px] pt-[16px]">
            <p className="font-normal text-[#434343] text-[12px] leading-[16px]">
              <span className="text-[#c32a4f]">*</span> Email
            </p>
            <div className="bg-white border border-[#d9d9d9] flex h-[64px] items-start gap-[12px] px-[16px] py-[8px] rounded-[16px] w-full">
              <Mail className="size-[16px] text-[#555] mt-[8px] shrink-0" />
              <textarea
                placeholder="Placeholder text"
                rows={2}
                className="flex-1 bg-transparent italic text-[#555] text-[14px] leading-[24px] resize-none focus:outline-none placeholder:italic placeholder:text-[#555]"
                style={{ fontFamily: "Inter, sans-serif" }}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
