import { notFound, redirect } from "next/navigation"

import { requireUserId } from "@/modules/core/auth"
import { getProjectById } from "@/modules/procurex/projects"
import { getMyWorkspaces } from "@/modules/workspace/actions"

import { TenderSetup } from "../../new/tender-setup"

export default async function ProjectSetupPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>
  searchParams: Promise<{ step?: string }>
}) {
  const userId = await requireUserId()
  const { projectId } = await params
  const sp = await searchParams

  const project = await getProjectById(projectId)
  if (!project) notFound()

  // Access check: project's workspace must be one the user belongs to.
  const myWorkspaces = await getMyWorkspaces(userId)
  if (!myWorkspaces.some((w) => w.id === project.workspaceId)) {
    redirect("/")
  }

  const step = Math.max(1, Math.min(6, Number(sp.step ?? "1") || 1))

  return <TenderSetup project={project} initialStep={step} />
}
