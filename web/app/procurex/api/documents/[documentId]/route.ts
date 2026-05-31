import { and, eq, isNull } from "drizzle-orm"
import { NextResponse } from "next/server"

import { requireUserId } from "@/modules/core/auth"
import { db } from "@/modules/core/db"
import { documents } from "@/modules/documents/schema"
import { workspaceMembers } from "@/modules/workspace/schema"

/**
 * GET /api/documents/[id] — authorise then 307 redirect to the Blob URL.
 * Blob URLs are public-with-random-path; gating is enforced here at the
 * application edge.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ documentId: string }> },
): Promise<NextResponse> {
  const userId = await requireUserId()
  const { documentId } = await context.params

  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, documentId), isNull(documents.deletedAt)))
    .limit(1)
  if (!doc) return new NextResponse("Not found", { status: 404 })
  if (!doc.blobUrl) {
    return new NextResponse("Document upload incomplete", { status: 409 })
  }

  // Authorise: caller must be a member of the owning workspace.
  const member = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaceMembers.workspaceId, doc.workspaceId),
      ),
    )
    .limit(1)
  if (member.length === 0) {
    return new NextResponse("Forbidden", { status: 403 })
  }

  return NextResponse.redirect(doc.blobUrl, 307)
}
