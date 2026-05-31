import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

import { recordAudit } from "@/modules/audit"
import { requireUserId } from "@/modules/core/auth"
import { db } from "@/modules/core/db"
import { documents } from "@/modules/documents/schema"
import { enqueueExtraction } from "@/modules/ai-extraction/queue/enqueue"

/**
 * Bidder-doc categories whose contents may carry commercial /
 * technical / contractual deviation clauses. Uploading any of these
 * triggers a secondary `deviations` extraction job in addition to the
 * primary category-specific one. Categories not in this set are
 * processed only by their primary spec (e.g. priced BoQ → boq-priceset).
 */
const DEVIATIONS_TRIGGER_CATEGORIES = new Set<string>([
  "Cover Letter",
  "Form of Tender",
  "Technical Submittal",
  "Commercial Proposal",
])

/**
 * Client-direct Blob upload. The client calls `upload()` from
 * `@vercel/blob/client` pointing at this route; we mint a signed token
 * scoped to the requested pathname, then enqueue the AI extraction job
 * when the client reports completion.
 *
 * Auth model:
 *  - The route is in PUBLIC_PATHS — the auth middleware doesn't enforce
 *    a session here because the upload-completion webhook (called by
 *    Vercel Blob's CDN) has no user cookies.
 *  - The FIRST call from the browser is authenticated inside
 *    `onBeforeGenerateToken` via `requireUserId()` — that still uses
 *    the user's cookies and binds the upload to the right user.
 *  - The SECOND call (upload-completed webhook) carries a signed bearer
 *    that `handleUpload` validates internally. Trust is established by
 *    the token, not the session.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        // This branch only runs on the FIRST POST (from the browser), which
        // carries the user session cookies — so requireUserId() is valid here.
        const userId = await requireUserId()

        const documentId = clientPayload ?? ""
        const [doc] = await db
          .select()
          .from(documents)
          .where(eq(documents.id, documentId))
          .limit(1)
        if (!doc) throw new Error("Unknown document id")
        if (doc.uploadedByUserId !== userId) throw new Error("FORBIDDEN")
        if (doc.blobPathname !== pathname) throw new Error("Pathname mismatch")
        if (doc.status !== "pending") throw new Error("Already uploaded")

        return {
          allowedContentTypes: undefined,
          tokenPayload: JSON.stringify({ documentId, userId }),
          addRandomSuffix: false,
        }
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const { documentId, userId: tokenUserId } = JSON.parse(
          tokenPayload ?? "{}",
        ) as { documentId?: string; userId?: string }
        if (!documentId) return

        const [doc] = await db
          .select()
          .from(documents)
          .where(eq(documents.id, documentId))
          .limit(1)
        if (!doc) return

        await db
          .update(documents)
          .set({
            blobUrl: blob.url,
            status: "uploaded",
            uploadedAt: new Date(),
          })
          .where(eq(documents.id, documentId))

        await recordAudit({
          workspaceId: doc.workspaceId,
          projectId: doc.projectId,
          actorUserId: tokenUserId ?? null,
          actorKind: "user",
          action: "document.upload",
          targetKind: "document",
          targetId: doc.id,
          payload: { filename: doc.filename, scope: doc.scope },
        })

        try {
          await enqueueExtraction({
            payload: {
              documentId: doc.id,
              blobUrl: blob.url,
              filename: doc.filename,
              mimeType: doc.mimeType,
              workspaceId: doc.workspaceId,
              projectId: doc.projectId ?? "",
              userId: tokenUserId ?? "",
              tendererId:
                doc.targetKind === "tenderer" ? doc.targetId : undefined,
            },
          })
        } catch (err) {
          console.error("[upload.extract] failed to enqueue", err)
        }

        // Secondary deviations agent — kicks off when the doc is a
        // bidder submission whose category is likely to contain
        // commercial / technical / contractual deviations clauses. The
        // queue's de-dupe key includes specOverride, so this happily
        // coexists with the primary (category-derived) job above.
        if (
          doc.scope === "bidder_submission" &&
          DEVIATIONS_TRIGGER_CATEGORIES.has(doc.category)
        ) {
          try {
            await enqueueExtraction({
              payload: {
                documentId: doc.id,
                blobUrl: blob.url,
                filename: doc.filename,
                mimeType: doc.mimeType,
                workspaceId: doc.workspaceId,
                projectId: doc.projectId ?? "",
                userId: tokenUserId ?? "",
                specOverride: "deviations",
                tendererId:
                  doc.targetKind === "tenderer" ? doc.targetId : undefined,
              },
            })
          } catch (err) {
            console.error("[upload.deviations.extract] failed to enqueue", err)
          }
        }

        // Best-effort: kick the worker drain so the job starts now instead
        // of waiting for the next cron tick. Fully fire-and-forget.
        const proto = request.headers.get("x-forwarded-proto") ?? "http"
        const host = request.headers.get("host")
        if (host) {
          const headers: Record<string, string> = {}
          if (process.env.CRON_SECRET) {
            headers.authorization = `Bearer ${process.env.CRON_SECRET}`
          }
          fetch(`${proto}://${host}/api/worker/extraction`, {
            method: "POST",
            headers,
          }).catch(() => {
            /* noop — cron will catch this */
          })
        }
      },
    })

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed"
    console.error("[upload.handle] failed:", message)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
