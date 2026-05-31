"use client"

import { Home } from "lucide-react"

interface BreadcrumbProps {
  bidderName: string
  /** Real project name. When null, renders a small "Not implemented"
   *  placeholder in the breadcrumb instead of a hardcoded name. */
  projectName?: string | null
  onResultsOverviewClick: () => void
}

export function ReviewBreadcrumb({
  bidderName,
  projectName,
  onResultsOverviewClick,
}: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-start">
      <div className="flex items-center self-stretch">
        <div className="flex items-center justify-center rounded-[5.333px] size-[32px]">
          <Home className="size-[16px] text-[#142845]" />
        </div>
      </div>
      {projectName ? (
        <BreadcrumbItem label={projectName} />
      ) : (
        <div className="flex items-center justify-center">
          <div className="flex h-[48px] items-center justify-center px-[8px] rounded-[16px]">
            <span
              className="inline-flex items-center px-[8px] py-[2px] rounded-[8px] border border-dashed border-[#94a3b8] bg-white text-[#475569] text-[11px] font-medium uppercase tracking-wider"
              title="Project name not loaded"
            >
              Project — Not implemented
            </span>
          </div>
        </div>
      )}
      <div className="flex items-center">
        <span
          className="text-[#555] text-[14px] leading-[24px]"
          style={{ fontFamily: "Poppins, sans-serif" }}
        >
          /
        </span>
        <button
          type="button"
          onClick={onResultsOverviewClick}
          className="flex h-[48px] items-center justify-center px-[8px] rounded-[16px] cursor-pointer"
        >
          <span
            className="text-[#212121] text-[14px] leading-[24px]"
            style={{ fontFamily: "Poppins, sans-serif" }}
          >
            Results Overview
          </span>
        </button>
      </div>
      <div className="flex items-center">
        <span
          className="text-[#212121] text-[14px] leading-[24px]"
          style={{ fontFamily: "Poppins, sans-serif" }}
        >
          /
        </span>
        <div className="flex h-[48px] items-center justify-center px-[8px] rounded-[16px]">
          <span
            className="border-b border-[#212121] text-[#212121] text-[14px] leading-[24px]"
            style={{ fontFamily: "Poppins, sans-serif" }}
          >
            Review Tenderer (PTC): {bidderName}
          </span>
        </div>
      </div>
    </nav>
  )
}

function BreadcrumbItem({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center">
      <div className="flex h-[48px] items-center justify-center px-[8px] rounded-[16px]">
        <span
          className="text-[#555] text-[14px] leading-[24px]"
          style={{ fontFamily: "Poppins, sans-serif" }}
        >
          {label}
        </span>
      </div>
    </div>
  )
}
