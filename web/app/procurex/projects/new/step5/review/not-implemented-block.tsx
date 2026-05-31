"use client"

import { Construction } from "lucide-react"

/**
 * Visible placeholder rendered in place of a section/card whose real
 * data isn't wired yet. Keeps the page layout intact (so reviewers
 * keep their visual map of the surface) while making the gap obvious.
 *
 * Use this whenever a section in `Step5ReviewTenderer` would otherwise
 * render from mock data — replace the mock-driven component with one
 * of these blocks until the real source ships.
 */
export function NotImplementedBlock({
  title,
  id,
  hint,
}: {
  /** Section heading rendered at the top of the placeholder. */
  title: string
  /** Anchor id so the sidebar TOC still scrolls here. */
  id?: string
  /** Optional one-line description of what data is supposed to land. */
  hint?: string
}) {
  return (
    <section
      id={id}
      className="border border-dashed border-[#94a3b8] bg-[#f8fafc] rounded-[16px] p-[24px] flex items-start gap-[16px] scroll-mt-[120px]"
    >
      <span className="bg-[#e2e8f0] flex items-center justify-center rounded-[8px] size-[40px] shrink-0">
        <Construction className="size-[18px] text-[#475569]" />
      </span>
      <div className="flex flex-col gap-[8px] min-w-0 flex-1">
        <div className="flex items-center gap-[12px] flex-wrap">
          <h3 className="font-semibold text-[#142845] text-[16px] leading-[24px] tracking-wide uppercase">
            {title}
          </h3>
          <span className="inline-block px-[8px] py-[2px] rounded-[8px] border border-dashed border-[#94a3b8] bg-white text-[#475569] text-[10.5px] font-medium uppercase tracking-wider">
            Not implemented
          </span>
        </div>
        <p className="font-light text-[#475569] text-[12px] leading-[16px]">
          {hint ??
            "Real data for this section isn't wired yet — the underlying extractor or DB column doesn't exist."}
        </p>
      </div>
    </section>
  )
}
