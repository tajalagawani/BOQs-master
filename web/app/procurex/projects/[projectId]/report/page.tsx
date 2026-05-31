import { notFound, redirect } from "next/navigation"

import { requireUserId } from "@/modules/core/auth"
import { getProjectById } from "@/modules/procurex/projects"
import { getAppendixCData } from "@/modules/procurex/report/appendix-c-data"
import {
  getTenderReportData,
  type ReportOptions,
  type ReportRound,
  type ReportType,
} from "@/modules/procurex/report/report-data"
import { getMyWorkspaces } from "@/modules/workspace/actions"

import { ReportClient } from "./report-client"

/**
 * Tender Evaluation Report route. Reached from Step 6 →
 * "Generate Tender Report". The radios on that card become URL
 * params so the rendered page is shareable + bookmarkable:
 *
 *   /projects/[id]/report?type=full&appendices=1&round=initial
 *
 * Server-side we fetch everything in one orchestrator
 * (`getTenderReportData`) and hand the result to the client shell.
 */

const VALID_TYPES: ReportType[] = ["executive", "full"]
const VALID_ROUNDS: ReportRound[] = ["initial", "ptc1", "ptc2", "ptc3"]

function parseOptions(sp: {
  type?: string
  appendices?: string
  round?: string
}): ReportOptions {
  const type = (VALID_TYPES as string[]).includes(sp.type ?? "")
    ? (sp.type as ReportType)
    : "full"
  const round = (VALID_ROUNDS as string[]).includes(sp.round ?? "")
    ? (sp.round as ReportRound)
    : "initial"
  const appendices = sp.appendices !== "0"
  return { type, appendices, round }
}

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>
  searchParams: Promise<{
    type?: string
    appendices?: string
    round?: string
  }>
}) {
  const userId = await requireUserId()
  const { projectId } = await params
  const sp = await searchParams
  const options = parseOptions(sp)

  const project = await getProjectById(projectId)
  if (!project) notFound()

  const myWorkspaces = await getMyWorkspaces(userId)
  if (!myWorkspaces.some((w) => w.id === project.workspaceId)) {
    redirect("/")
  }

  const [data, appendixC] = await Promise.all([
    getTenderReportData(projectId, options),
    getAppendixCData(projectId),
  ])
  if (!data) notFound()

  return <ReportClient data={data} appendixC={appendixC} />
}
