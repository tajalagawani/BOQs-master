"use client"

import { ChevronDown } from "lucide-react"
import { Dropdown, Label } from "@heroui/react"

export interface AnchorOption {
  id: string
  label: string
}

interface SubPageTabsProps {
  boqReviewAnchors: AnchorOption[]
  qualificationsAnchors: AnchorOption[]
  onScrollTo: (anchorId: string) => void
}

export function SubPageTabs({
  boqReviewAnchors,
  qualificationsAnchors,
  onScrollTo,
}: SubPageTabsProps) {
  return (
    <div className="bg-[#e9e9e9] flex items-start p-[4px] rounded-[50px] w-fit relative">
      {/* PTC Summary - selected pill */}
      <button
        type="button"
        onClick={() => onScrollTo("ptc-summary-section")}
        className="bg-white drop-shadow-[0px_6px_8.5px_rgba(0,0,0,0.08)] flex h-[24px] items-center justify-center px-[16px] py-[8px] rounded-[500px] w-[120px]"
      >
        <p className="font-medium text-black text-[12px] leading-[16px] whitespace-nowrap">
          PTC Summary
        </p>
      </button>

      <TabDropdown
        label="BOQ Review"
        width={128}
        items={boqReviewAnchors}
        onSelect={onScrollTo}
      />
      <TabDropdown
        label="Qualifications & Deviations"
        width={200}
        items={qualificationsAnchors}
        onSelect={onScrollTo}
      />
    </div>
  )
}

function TabDropdown({
  label,
  width,
  items,
  onSelect,
}: {
  label: string
  width: number
  items: AnchorOption[]
  onSelect: (id: string) => void
}) {
  return (
    <Dropdown>
      <button
        type="button"
        className="flex gap-[10px] h-[24px] items-center justify-center px-[16px] py-[8px] rounded-[500px]"
        style={{ width }}
      >
        <p className="font-normal text-[#262626] text-[12px] leading-[16px] whitespace-nowrap">
          {label}
        </p>
        <ChevronDown className="size-[16px] text-[#262626]" />
      </button>
      <Dropdown.Popover>
        <Dropdown.Menu onAction={(key) => onSelect(String(key))}>
          {items.map((item) => (
            <Dropdown.Item key={item.id} id={item.id} textValue={item.label}>
              <Label>{item.label}</Label>
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  )
}
