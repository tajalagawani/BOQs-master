import { notFound, redirect } from "next/navigation"

import { requireUserId } from "@/modules/core/auth"
import { getProjectById } from "@/modules/procurex/projects"
import { getBidderReviewData } from "@/modules/procurex/review/bidder-review-data"
import { getMyWorkspaces } from "@/modules/workspace/actions"

import { ReviewTendererClient } from "./review-tenderer-client"

/**
 * Dedicated route for the per-bidder PTC review surface — previously
 * lived as an in-page swap inside `Step5ResultsOverview`. Promoting it
 * to its own URL means the page is shareable, the back button works,
 * and the "Prepare and review PTC" action is just navigation.
 *
 * Fetches the per-bidder data server-side so the page renders correct
 * values on first paint, no loading state needed. Until each section
 * is wired, every cell renders as "Not implemented" (slate pill) so
 * the page doubles as a live audit of what's extracted vs. not.
 */
export default async function ReviewTendererPage({
  params,
}: {
  params: Promise<{ projectId: string; bidderId: string }>
}) {
  const userId = await requireUserId()
  const { projectId, bidderId } = await params

  const project = await getProjectById(projectId)
  if (!project) notFound()

  const myWorkspaces = await getMyWorkspaces(userId)
  if (!myWorkspaces.some((w) => w.id === project.workspaceId)) {
    redirect("/")
  }

  const reviewData = await getBidderReviewData(projectId, bidderId)

  // 404 when the bidderId in the URL doesn't belong to any tenderer on
  // this project. Catches stale links + mock-id leftovers from the
  // Step 5 overview before we wired it to real tenderers.
  if (!reviewData || !reviewData.currentBidder) {
    notFound()
  }

  return (
    <ReviewTendererClient
      projectId={projectId}
      bidderId={bidderId}
      workspaceId={project.workspaceId}
      reviewData={reviewData}
    />
  )
}
