"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Upload } from "lucide-react"

import { Step5ReviewTenderer } from "@/app/procurex/projects/new/step5/review"
import { BidderUploadModal } from "@/components/procurex/docs/bidder-upload-modal"
import type { BidderReviewData } from "@/modules/procurex/review/types"

/**
 * Client wrapper for the per-bidder PTC review. Hosts the same
 * `Step5ReviewTenderer` component that used to live inside
 * `Step5ResultsOverview`'s in-page swap, but now driven by the route
 * params:
 *   - `bidderId`   → URL segment
 *   - `reviewData` → fetched server-side in `page.tsx` and threaded
 *                    down to each compliance section. Until the
 *                    backing extractors land, every cell shows the
 *                    slate "Not implemented" pill.
 *   - `onBack`     → navigate back to the Step 5 overview
 *   - PTE toggle   → local state (TODO: persist with the project later)
 *   - Appendix A   → still a same-page swap for now; can be promoted
 *                    to its own route in a follow-up.
 */
export function ReviewTendererClient({
  projectId,
  bidderId,
  workspaceId,
  reviewData,
}: {
  projectId: string
  bidderId: string
  /** Workspace id for upload calls. Comes from the server-rendered
   *  page after the project lookup. */
  workspaceId: string
  reviewData: BidderReviewData | null
}) {
  const router = useRouter()
  const [ptePresent, setPtePresent] = useState(true)
  const [uploadOpen, setUploadOpen] = useState(false)

  const goBackToStep5 = () => {
    router.push(`/procurex/projects/${projectId}/setup?step=5`)
  }

  // Bidder switcher in the sidebar — navigate to the new bidder's URL
  // so the server re-runs `getBidderReviewData` for that tenderer.
  // Without this, picking a different bidder only flipped local state
  // and the rest of the page kept showing the previous bidder's data.
  const goToBidder = (nextBidderId: string) => {
    if (nextBidderId === bidderId) return
    router.push(`/procurex/projects/${projectId}/review/${nextBidderId}`)
  }

  // Re-fetch the page when the upload modal mutates server state
  // (apply / discard / re-upload). `router.refresh()` runs the route's
  // server load again without losing client state — perfect for
  // re-pulling `getBidderReviewData`.
  const handleUploadChanged = () => router.refresh()

  const tendererName = reviewData?.currentBidder?.name ?? "Bidder"

  return (
    <>
      {/* Floating CTA — bottom-right above page content. Doesn't push
          the layout; sits at z-40 so the upload modal (z-50) overlays. */}
      <button
        type="button"
        onClick={() => setUploadOpen(true)}
        className="fixed bottom-[24px] right-[24px] z-40 bg-[#142845] hover:bg-[#0e1d34] text-white flex items-center gap-[8px] rounded-[24px] px-[20px] py-[12px] shadow-[0_8px_24px_rgba(20,40,69,0.25)]"
        title="Upload bidder documents"
      >
        <Upload className="size-[16px]" />
        <span className="text-[13px] font-medium">Upload bidder documents</span>
      </button>

      <Step5ReviewTenderer
        bidderId={bidderId}
        onBack={goBackToStep5}
        ptePresent={ptePresent}
        onPtePresentChange={setPtePresent}
        onAppendixAClick={goBackToStep5}
        reviewData={reviewData}
        onBidderChange={goToBidder}
      />

      {uploadOpen && (
        <BidderUploadModal
          workspaceId={workspaceId}
          projectId={projectId}
          tendererId={bidderId}
          tendererName={tendererName}
          onClose={() => setUploadOpen(false)}
          onChanged={handleUploadChanged}
        />
      )}
    </>
  )
}
