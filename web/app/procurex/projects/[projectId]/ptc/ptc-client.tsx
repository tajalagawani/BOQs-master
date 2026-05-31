"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft, Send } from "lucide-react"

import type { ProjectBidderOverviewRow } from "@/modules/procurex/review/overview-data"

/**
 * Client shell for the PTC route. Renders the selected tenderers and
 * a placeholder action surface. Generation itself isn't implemented
 * yet — when the PTC pack writer lands, the CTA below will call it
 * and stream progress per tenderer.
 */
export function PtcPageClient({
  projectId,
  projectName,
  selectedBidders,
}: {
  projectId: string
  projectName: string
  selectedBidders: ProjectBidderOverviewRow[]
}) {
  const router = useRouter()
  const backToStep6 = () =>
    router.push(`/procurex/projects/${projectId}/setup?step=6`)

  return (
    <div className="bg-[#f8f8f8] min-h-screen pb-[96px]">
      <div className="max-w-[1400px] mx-auto px-[16px] pt-[24px] flex flex-col gap-[24px]">
        <button
          type="button"
          onClick={backToStep6}
          className="flex items-center gap-[6px] text-[#142845] text-[12px] leading-[16px] w-fit hover:underline"
        >
          <ArrowLeft className="size-[14px]" />
          Back to Reports
        </button>

        <header className="flex flex-col gap-[8px]">
          <h1
            className="font-bold text-[#142845] text-[28px] leading-[40px]"
            style={{ fontFamily: "Poppins, sans-serif" }}
          >
            PTC Packs — {projectName}
          </h1>
          <p className="font-light text-[#142845] text-[12px] leading-[16px]">
            Tenderer-specific clarification requests. PTCs will not disclose
            PTE values or internal budget assumptions to tenderers.
          </p>
        </header>

        <section className="bg-white border border-[rgba(226,237,247,0.5)] flex flex-col gap-[24px] p-[24px] rounded-[16px]">
          <div className="flex items-center gap-[8px]">
            <div className="bg-[rgba(226,237,247,0.5)] flex items-center justify-center rounded-[8px] size-[40px]">
              <Send className="size-[16px] text-[#142845]" />
            </div>
            <h2 className="font-semibold text-[#141414] text-[18px] leading-[24px]">
              Selected tenderers ({selectedBidders.length})
            </h2>
          </div>

          {selectedBidders.length === 0 ? (
            <div className="py-[24px] text-center text-[12px] text-[#888]">
              No tenderers selected. Return to Reports and pick at least one.
            </div>
          ) : (
            <ul className="flex flex-col gap-[8px]">
              {selectedBidders.map((b) => (
                <li
                  key={b.id}
                  className="bg-white border-[0.5px] border-[#e2edf7] flex h-[56px] items-center justify-between px-[16px] rounded-[8px]"
                >
                  <div className="flex gap-[16px] items-center">
                    <span className="font-mono text-[#555] text-[12px]">
                      {b.code}
                    </span>
                    <span className="text-black text-[14px] leading-[24px]">
                      {b.name}
                    </span>
                  </div>
                  <span className="text-[#888] text-[12px] leading-[16px]">
                    Queued
                  </span>
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            disabled={selectedBidders.length === 0}
            className="bg-[#142845] disabled:bg-[#c4c4c4] flex gap-[8px] h-[40px] items-center justify-center px-[24px] py-[8px] rounded-[16px] w-full"
          >
            <Send className="size-[14px] text-white" />
            <span className="text-white text-[14px] leading-[24px]">
              Generate PTC Packs ({selectedBidders.length})
            </span>
          </button>
        </section>
      </div>
    </div>
  )
}
