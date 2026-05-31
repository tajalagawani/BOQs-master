"use client"

import { useState } from "react"
import {
  ChevronDown,
  ChevronUp,
  CircleCheck,
  Send,
  MessageSquare,
  Share2,
  Search,
  PanelLeft,
  Download,
} from "lucide-react"
import { Label, ListBox, Select } from "@heroui/react"
import { BIDDERS } from "./mock-data"

const REVISION_OPTIONS = [
  { id: "rev-0", name: "Initial Tender Revision (Revision 0)" },
  { id: "rev-1", name: "Revision 1" },
  { id: "rev-2", name: "Revision 2" },
  { id: "rev-3", name: "Revision 3" },
]

interface SidebarProps {
  activeSectionId: string
  onSectionClick: (id: string) => void
  ptePresent: boolean
  onPtePresentChange: (next: boolean) => void
  onReviewPtcClick: () => void
  onBidderReview: (bidderId: string) => void
}

export function Step5Sidebar({
  activeSectionId,
  onSectionClick,
  ptePresent,
  onPtePresentChange,
  onReviewPtcClick,
  onBidderReview,
}: SidebarProps) {
  const [ptcOpen, setPtcOpen] = useState(true)

  const navItem = (id: string, label: string, indented = false) => {
    const active = id === activeSectionId
    return (
      <button
        key={id}
        type="button"
        onClick={() => onSectionClick(id)}
        className={`flex gap-[8px] h-[32px] items-center px-[16px] py-[8px] rounded-[8px] w-full text-left ${
          active ? "bg-[rgba(226,237,247,0.5)]" : ""
        }`}
      >
        <span
          className={`flex-1 text-[#142845] text-[12px] leading-[16px] ${
            active ? "font-normal" : "font-light"
          } ${indented ? "pl-[8px]" : ""}`}
        >
          {label}
        </span>
        {id !== "exec" && id !== "tender-returns" && id !== "bidder-summaries" && id !== "ptc-prep" && (
          <CircleCheck className="size-[16px] text-emerald-500 fill-emerald-500 stroke-white shrink-0" />
        )}
      </button>
    )
  }

  return (
    <aside className="bg-white flex flex-col items-start overflow-clip pb-[16px] px-[16px] rounded-br-[16px] w-[280px] sticky top-[80px] self-start max-h-[calc(100vh-80px)] overflow-y-auto">
      <div className="flex flex-col gap-[32px] items-start w-full">
        {/* Status chips + title */}
        <div className="flex flex-col items-start w-full">
          <div className="flex items-start pb-[24px] w-full relative">
            <div className="flex flex-1 flex-col gap-[16px] items-start justify-center min-w-0">
              <div className="flex gap-[8px] h-[96px] items-center justify-end pb-[16px] w-full">
                <div className="flex-1" />
                <button
                  type="button"
                  className="bg-white flex items-center justify-center rounded-[8px] size-[32px] hover:bg-gray-50"
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
                    title="Click to toggle PTE availability (preview)"
                  >
                    <p className="flex-1 font-medium leading-[16px] text-left">PTE</p>
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
              <h1
                className="font-bold text-[#142845] text-[24px] leading-[40px] tracking-[0.4px] whitespace-nowrap"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                Results Overview
              </h1>
              <p className="font-light text-[#142845] text-[12px] leading-[16px]">
                Interactive summary of tender returns and key issues for{" "}
                <span className="font-semibold">Revision X</span>
              </p>
            </div>
          </div>

          {/* Revision dropdown */}
          <div className="flex flex-col gap-[8px] items-start pb-[16px] w-full">
            <Select fullWidth defaultValue="rev-0" placeholder="Select revision">
              <Label>Select Revision</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {REVISION_OPTIONS.map((o) => (
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

        {/* TOC */}
        <nav className="flex flex-col gap-[8px] items-start w-full">
          {navItem("exec", "01. Executive Summary")}
          {navItem("tender-returns", "02. Tender Returns (Revision {X})")}
          {navItem("bidder-summaries", "03. Tenderer Summaries")}

          <button
            type="button"
            onClick={() => setPtcOpen((v) => !v)}
            className="flex gap-[8px] h-[32px] items-center px-[16px] py-[8px] rounded-[8px] w-full"
          >
            <span className="flex-1 font-light text-[#142845] text-[14px] leading-[24px] text-left">
              PTC Preparation
            </span>
            {ptcOpen ? (
              <ChevronUp className="size-[16px] text-[#142845]" />
            ) : (
              <ChevronDown className="size-[16px] text-[#142845]" />
            )}
          </button>

          {ptcOpen && (
            <div className="flex flex-col gap-[8px] items-start w-full pt-[8px]">
              {BIDDERS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => onBidderReview(b.id)}
                  className="flex gap-[8px] h-[32px] items-center px-[16px] py-[8px] rounded-[8px] w-full text-left hover:bg-gray-50"
                >
                  <span className="flex-1 font-light text-[#142845] text-[12px] leading-[16px]">
                    {b.fullName}
                  </span>
                  {b.selected && (
                    <CircleCheck className="size-[16px] text-emerald-500 fill-emerald-500 stroke-white shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </nav>

        {/* Actions section */}
        <div className="flex flex-col gap-[8px] items-start">
          <div className="flex gap-[4px] h-[16px] items-center w-[248px]">
            <Send className="size-[16px] text-black" />
            <p className="font-semibold text-black text-[12px] leading-[16px]">
              ACTIONS
            </p>
          </div>
          <div className="flex gap-[8px] items-start">
            <button
              type="button"
              className="bg-white flex h-[24px] items-center justify-center px-[8px] rounded-[8px] gap-[8px]"
            >
              <MessageSquare className="size-[14px] text-black" />
              <span className="font-normal text-black text-[12px] leading-[16px]">
                Comment
              </span>
              <ChevronDown className="size-[14px] text-black" />
            </button>
            <button
              type="button"
              className="bg-white flex h-[24px] items-center justify-center px-[8px] rounded-[8px] gap-[8px]"
            >
              <Share2 className="size-[14px] text-black" />
              <span className="font-normal text-black text-[12px] leading-[16px]">
                Share
              </span>
              <ChevronDown className="size-[14px] text-black" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white border border-[#d9d9d9] flex h-[48px] items-center justify-between px-[16px] rounded-[16px] w-[248px]">
          <p className="italic font-normal text-[#555] text-[14px] leading-[24px]">
            Search
          </p>
          <Search className="size-[16px] text-[#555]" />
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-[16px] items-center justify-center py-[16px] w-full">
          <button
            type="button"
            className="flex gap-[4px] h-[32px] items-center justify-center p-[8px] rounded-[16px]"
          >
            <span className="border-b border-black font-normal text-[#142845] text-[12px] leading-[16px]">
              Collapse all accordions
            </span>
          </button>
          <button
            type="button"
            onClick={onReviewPtcClick}
            className="bg-[#142845] flex gap-[8px] h-[32px] items-center justify-center px-[16px] py-[8px] rounded-[16px] hover:bg-[#0e1d34]"
          >
            <span className="font-normal text-white text-[12px] leading-[16px]">
              Review PTC
            </span>
          </button>
          <button
            type="button"
            className="border border-[#142845] flex gap-[8px] h-[32px] items-center justify-center px-[16px] py-[8px] rounded-[16px]"
          >
            <Download className="size-[14px] text-[#142845]" />
            <span className="font-normal text-[#142845] text-[12px] leading-[16px]">
              Export PDF
            </span>
          </button>
          <button
            type="button"
            className="border border-[#142845] flex gap-[8px] h-[32px] items-center justify-center px-[16px] py-[8px] rounded-[16px]"
          >
            <Download className="size-[14px] text-[#142845]" />
            <span className="font-normal text-[#142845] text-[12px] leading-[16px]">
              Export to Excel
            </span>
          </button>
        </div>
      </div>
    </aside>
  )
}
