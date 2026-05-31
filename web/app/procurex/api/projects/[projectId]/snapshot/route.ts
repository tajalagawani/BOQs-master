import { NextResponse } from "next/server"

import { requireUserId } from "@/modules/core/auth"
import { getProjectById } from "@/modules/procurex/projects"
import { getProjectSnapshot } from "@/modules/procurex/report/project-snapshot"
import { getMyWorkspaces } from "@/modules/workspace/actions"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/projects/[projectId]/snapshot
 *
 * Single comprehensive snapshot of a project — every section, every
 * BoQ item, every tenderer's pricing, every comparison (item /
 * section / bidder vs PTE), plus event log + raw payloads.
 *
 * Authorised via workspace membership. Returns 401 / 403 / 404 on
 * failures and `{ ok, data }` on success so the response is
 * self-describing for clients (UI, AI agents, exports).
 *
 * The payload is heavy on large projects: a 5-tenderer project with
 * 2,000 BoQ items returns ~10 MB of JSON. Reach for the route
 * sparingly — it's designed for offline AI processing, audit
 * exports, and full-project dumps, not per-page rendering.
 */

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  let userId: string
  try {
    userId = await requireUserId()
  } catch {
    return NextResponse.json(
      { ok: false, error: "UNAUTHENTICATED" },
      { status: 401 },
    )
  }

  const { projectId } = await params
  const project = await getProjectById(projectId)
  if (!project) {
    return NextResponse.json(
      { ok: false, error: "NOT_FOUND" },
      { status: 404 },
    )
  }

  const workspaces = await getMyWorkspaces(userId)
  if (!workspaces.some((w) => w.id === project.workspaceId)) {
    return NextResponse.json(
      { ok: false, error: "FORBIDDEN" },
      { status: 403 },
    )
  }

  try {
    const data = await getProjectSnapshot(projectId)
    if (!data) {
      return NextResponse.json(
        { ok: false, error: "NOT_FOUND" },
        { status: 404 },
      )
    }
    return NextResponse.json({ ok: true, data })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    )
  }
}
