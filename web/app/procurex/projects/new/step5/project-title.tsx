"use client"

import { Pencil } from "lucide-react"

/**
 * Project title heading. When `name` is omitted the heading shows a
 * "Not implemented" placeholder — the caller is expected to pull the
 * real `projects.name` from the DB and pass it in. No mock fallback.
 */
export function ProjectTitle({ name }: { name?: string | null }) {
  return (
    <div className="flex items-center gap-[8px] w-full">
      {name ? (
        <h2
          className="flex-1 font-bold text-[#142845] text-[28px] leading-[40px] tracking-[0.4px]"
          style={{ fontFamily: "Poppins, sans-serif" }}
        >
          {name}
        </h2>
      ) : (
        <span
          className="flex-1 inline-flex items-center gap-[6px] px-[10px] py-[6px] rounded-[8px] border border-dashed border-[#94a3b8] bg-white text-[#475569] text-[12px] font-medium uppercase tracking-wider w-fit"
          title="No project name available — pass `name` prop or wire the project record"
        >
          Project name — Not implemented
        </span>
      )}
      <button
        type="button"
        className="bg-white flex items-center justify-center rounded-[8px] size-[32px] hover:bg-gray-50"
        aria-label="Edit project"
      >
        <Pencil className="size-[16px] text-[#142845]" />
      </button>
    </div>
  )
}
