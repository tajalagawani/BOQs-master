"use client"

import { PanelLeft, Send, Download, ArrowLeft } from "lucide-react"
import { Label, ListBox, Select } from "@heroui/react"

// Tender-round picker — Initial only until we model PTC issuance.
// "Revision 1/2" entries are placeholders flagged Not implemented in
// the dropdown label so the QS knows they're aspirational.
const REVIEW_REVISION_OPTIONS = [
  { id: "rev-0", name: "Initial Tender Revision" },
  { id: "rev-1", name: "Revision 1 — Not implemented" },
  { id: "rev-2", name: "Revision 2 — Not implemented" },
]

interface SidebarTenderer {
  id: string
  code: string
  name: string
}

interface ReviewSidebarProps {
  bidderFullName: string
  bidderId: string
  onBidderChange?: (id: string) => void
  ptePresent: boolean
  onPtePresentChange: (next: boolean) => void
  onBack: () => void
  /** When true, the "Generate PTC pack" button is greyed out (already issued). */
  ptcIssued?: boolean
  /** Real tenderers on the project — drives the bidder switcher
   *  dropdown. Comes from `getBidderReviewData(...).tenderers`. */
  tenderers: SidebarTenderer[]
}

export function ReviewSidebar({
  bidderFullName,
  bidderId,
  onBidderChange,
  ptePresent,
  onPtePresentChange,
  onBack,
  ptcIssued = true,
  tenderers,
}: ReviewSidebarProps) {
  return (
    <aside className="bg-white flex flex-col items-start pb-[16px] px-[16px] w-[280px] shrink-0 sticky top-[80px] self-start max-h-[calc(100vh-80px)] overflow-y-auto">
      <div className="flex flex-col gap-[32px] items-start w-full">
        <div className="flex flex-col items-start w-full">
          {/* Status chips + collapse icon row */}
          <div className="flex items-start pb-[24px] w-full relative">
            <div className="flex flex-1 flex-col gap-[16px] items-start justify-center min-w-0">
              <div className="flex gap-[8px] h-[96px] items-center justify-end pb-[16px] w-full">
                <div className="flex-1" />
                <button
                  type="button"
                  className="bg-white flex items-center justify-center rounded-[8px] size-[32px]"
                  aria-label="Collapse sidebar"
                >
                  <PanelLeft className="size-[16px] text-[#142845]" />
                </button>
                <div className="absolute bg-[rgba(226,237,247,0.5)] flex flex-col items-center justify-center left-[-16px] p-[16px] rounded-br-[16px] text-black top-0 w-[166px] gap-[4px]">
                  <div className="flex gap-[4px] items-center text-[12px] w-full">
                    <p className="font-medium leading-[16px] whitespace-nowrap">
                      Mode
                    </p>
                    <p className="flex-1 font-light leading-[16px] text-right">
                      Upload
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onPtePresentChange(!ptePresent)}
                    className="flex gap-[4px] items-center text-[12px] w-full hover:opacity-80"
                  >
                    <p className="flex-1 font-medium leading-[16px] text-left">
                      PTE
                    </p>
                    <p className="flex-1 font-light leading-[16px] text-right">
                      {ptePresent ? "Available" : "Not available"}
                    </p>
                  </button>
                  <div className="flex gap-[4px] items-center w-full">
                    <p className="font-medium text-[12px] leading-[16px] whitespace-nowrap">
                      Tenderers
                    </p>
                    <p className="flex-1 font-light text-[12px] leading-[16px] text-right">
                      6
                    </p>
                  </div>
                </div>
              </div>

              {/* Back link (utility, not in Figma but useful for navigation) */}
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-[8px] text-[#142845] hover:opacity-80"
              >
                <ArrowLeft className="size-[14px]" />
                <span className="font-normal text-[12px] leading-[16px] underline">
                  Back to Results Overview
                </span>
              </button>

              {/* Title */}
              <h2 className="font-semibold text-[#142845] text-[18px] leading-[24px]">
                Tenderer Review
              </h2>
            </div>
          </div>

          {/* Dropdowns */}
          <div className="flex flex-col gap-[16px] items-start w-full">
            <div className="w-[248px]">
              <Select
                fullWidth
                value={bidderId}
                onChange={(v) => onBidderChange?.(v as string)}
                isDisabled={!onBidderChange}
                placeholder="Select tenderer"
              >
                <Label>Select Tenderer</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {tenderers.length === 0 ? (
                      <ListBox.Item id="__empty" textValue="No tenderers">
                        No tenderers on this project — not implemented or
                        empty.
                      </ListBox.Item>
                    ) : (
                      tenderers.map((t) => (
                        <ListBox.Item key={t.id} id={t.id} textValue={t.name}>
                          {t.code} — {t.name}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))
                    )}
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>

            <div className="w-[248px]">
              <Select fullWidth defaultValue="rev-0" placeholder="Select revision">
                <Label>Select Revision</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {REVIEW_REVISION_OPTIONS.map((o) => (
                      <ListBox.Item key={o.id} id={o.id} textValue={o.name}>
                        {o.name}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-[16px] items-center justify-center py-[16px] w-full">
          <button
            type="button"
            disabled={ptcIssued}
            className={`flex gap-[8px] h-[32px] items-center justify-center px-[16px] py-[8px] rounded-[16px] ${
              ptcIssued
                ? "bg-[#c4c4c4] cursor-not-allowed"
                : "bg-[#142845] hover:bg-[#0e1d34]"
            }`}
          >
            <Send className="size-[14px] text-white" />
            <span className="font-normal text-white text-[12px] leading-[16px]">
              Generate PTC pack
            </span>
          </button>
          <button
            type="button"
            className="border border-[#142845] flex gap-[8px] h-[32px] items-center justify-center px-[16px] py-[8px] rounded-[16px]"
          >
            <Download className="size-[14px] text-[#142845]" />
            <span className="font-normal text-[#142845] text-[12px] leading-[16px]">
              Export Bidder Summary
            </span>
          </button>
          <button
            type="button"
            className="border border-[#142845] flex gap-[8px] h-[32px] items-center justify-center px-[16px] py-[8px] rounded-[16px]"
          >
            <Download className="size-[14px] text-[#142845]" />
            <span className="font-normal text-[#142845] text-[12px] leading-[16px]">
              Export Excel
            </span>
          </button>
        </div>
      </div>
    </aside>
  )
}
