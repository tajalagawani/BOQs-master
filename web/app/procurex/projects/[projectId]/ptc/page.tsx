import { notFound, redirect } from "next/navigation"

import { requireUserId } from "@/modules/core/auth"
import { getProjectById } from "@/modules/procurex/projects"
import { getProjectBidderOverview } from "@/modules/procurex/review/overview-data"
import { getMyWorkspaces } from "@/modules/workspace/actions"

import { PtcPageClient } from "./ptc-client"

/**
 * PTC generation route. Reached from Step 6 → "Generate PTC Packs".
 *
 * The selected tenderers come in via the `?bidders=` query string
 * (comma-separated IDs). We fetch the full tenderer list server-side
 * so the page can show names + codes immediately without a client
 * round-trip, then filter to the selection.
 */
export default async function PtcPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>
  searchParams: Promise<{ bidders?: string }>
}) {
  const userId = await requireUserId()
  const { projectId } = await params
  const { bidders: bidderQuery } = await searchParams

  const project = await getProjectById(projectId)
  if (!project) notFound()

  const myWorkspaces = await getMyWorkspaces(userId)
  if (!myWorkspaces.some((w) => w.id === project.workspaceId)) {
    redirect("/")
  }

  const allBidders = await getProjectBidderOverview(projectId)
  const selectedIds = new Set(
    (bidderQuery ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  )
  // If no `?bidders=` was supplied, fall back to every tenderer on the
  // project — landing on /ptc directly should still show something
  // useful rather than an empty list.
  const selected =
    selectedIds.size === 0
      ? allBidders
      : allBidders.filter((b) => selectedIds.has(b.id))

  return (
    <PtcPageClient
      projectId={projectId}
      projectName={project.name}
      selectedBidders={selected}
    />
  )
}
