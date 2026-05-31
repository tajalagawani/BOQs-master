import { notFound, redirect } from "next/navigation"

import { getProjectBoq } from "@/modules/procurex/boq/actions"
import { requireUserId } from "@/modules/core/auth"
import { getProjectById } from "@/modules/procurex/projects"
import { getMyWorkspaces } from "@/modules/workspace/actions"

import { BoqViewer } from "./boq-viewer"

export default async function ProjectBoqPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const userId = await requireUserId()
  const { projectId } = await params

  const project = await getProjectById(projectId)
  if (!project) notFound()

  const myWorkspaces = await getMyWorkspaces(userId)
  if (!myWorkspaces.some((w) => w.id === project.workspaceId)) {
    redirect("/")
  }

  const result = await getProjectBoq(projectId)
  if (!result.ok) {
    return (
      <div className="min-h-screen bg-[#f8f8f8] flex items-center justify-center">
        <p className="text-sm text-red-700">{result.error}</p>
      </div>
    )
  }

  return (
    <BoqViewer
      projectId={projectId}
      projectName={project.name}
      data={result.data}
    />
  )
}
