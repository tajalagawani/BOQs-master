"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { Step5Sidebar } from "./step5/sidebar"
import { RoundTabs } from "./step5/round-tabs"
import { ProjectTitle } from "./step5/project-title"
import { PtcReadinessPill } from "./step5/readiness-pill"
import { ExecutiveSummary } from "./step5/executive-summary"
import { TenderReturns } from "./step5/tender-returns"
import { ComplianceRequirements } from "./step5/compliance"
import { BidderSummaries } from "./step5/bidder-summaries"
import { ReviewPanel } from "./step5/review-panel"
import { AppendixAPage } from "./step5/appendix-a"
import type { RoundKey } from "./step5/types"
import {
  getProjectBidderOverview,
  getProjectComplianceRows,
  type ProjectBidderOverviewRow,
  type ProjectComplianceRow,
} from "@/modules/procurex/review/overview-data"

export function Step5ResultsOverview() {
  const router = useRouter()
  const params = useParams<{ projectId?: string }>()
  const projectId = params?.projectId ?? ""

  const [round, setRound] = useState<RoundKey>("initial")
  const [activeSection, setActiveSection] = useState("exec")
  const [ptePresent, setPtePresent] = useState(true)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [appendixOpen, setAppendixOpen] = useState(false)

  /** Real bidders fetched from the server. `null` = loading; empty
   *  array = no tenderers yet. NEVER a mock list. */
  const [bidders, setBidders] = useState<ProjectBidderOverviewRow[] | null>(null)
  const [complianceRows, setComplianceRows] = useState<
    ProjectComplianceRow[] | null
  >(null)

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    void (async () => {
      const [b, c] = await Promise.all([
        getProjectBidderOverview(projectId),
        getProjectComplianceRows(projectId),
      ])
      if (!cancelled) {
        setBidders(b)
        setComplianceRows(c)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [projectId])

  /** "Prepare and review PTC" now navigates to a dedicated route so
   *  the per-bidder review is shareable + back-buttonable. The earlier
   *  in-page swap (setReviewBidderId → early return) is gone. */
  const goToBidderReview = (bidderId: string) => {
    if (!projectId) return
    router.push(`/procurex/projects/${projectId}/review/${bidderId}`)
  }

  if (appendixOpen) {
    return (
      <AppendixAPage
        ptePresent={ptePresent}
        onPtePresentChange={setPtePresent}
        onBack={() => setAppendixOpen(false)}
      />
    )
  }

  const handleSectionClick = (id: string) => {
    setActiveSection(id)
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <>
      <div className="w-[1400px] mx-auto flex items-start gap-[24px]">
        <Step5Sidebar
          activeSectionId={activeSection}
          onSectionClick={handleSectionClick}
          ptePresent={ptePresent}
          onPtePresentChange={setPtePresent}
          onReviewPtcClick={() => setReviewOpen(true)}
          onBidderReview={goToBidderReview}
        />
        <main className="flex-1 flex flex-col gap-[16px]">
          <RoundTabs active={round} onChange={setRound} />
          <PtcReadinessPill />
          <div className="flex items-center justify-between">
            <ProjectTitle />
            <button
              type="button"
              onClick={() => setAppendixOpen(true)}
              className="font-normal text-[#142845] text-[12px] leading-[16px] underline underline-offset-2 hover:text-black whitespace-nowrap shrink-0 ml-[16px]"
            >
              View Comparison Summary Appendix A
            </button>
          </div>
          <ExecutiveSummary id="exec" ptePresent={ptePresent} />
          <TenderReturns id="tender-returns" ptePresent={ptePresent} />
          <ComplianceRequirements id="compliance" rows={complianceRows} />
          <BidderSummaries
            id="bidder-summaries"
            ptePresent={ptePresent}
            bidders={bidders}
            onPrepareReview={goToBidderReview}
          />
        </main>
      </div>
      <ReviewPanel open={reviewOpen} onClose={() => setReviewOpen(false)} />
    </>
  )
}
