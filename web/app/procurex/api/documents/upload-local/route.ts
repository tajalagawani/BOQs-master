import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

import { recordAudit } from "@/modules/audit"
import { requireUserId } from "@/modules/core/auth"
import { db } from "@/modules/core/db"
import { documents } from "@/modules/documents/schema"
import { writeLocalFile } from "@/modules/documents/local-storage"
import { enqueueExtraction } from "@/modules/ai-extraction/queue/enqueue"
import { getDocSpec } from "@/modules/ai-extraction/specs/registry"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * Local-disk upload route — used when Vercel Blob isn't provisioned.
 *
 * Accepts multipart/form-data with:
 *   - file:       the binary file
 *   - documentId: the pre-reserved document row id
 *
 * Writes the file under `<repoRoot>/uploads/...`, sets
 * `documents.blobUrl` to a host-qualified `/procurex/api/files/<id>` URL, then
 * enqueues the extraction job (same downstream pipeline as Blob).
 */
export async function POST(request: Request): Promise<NextResponse> {
  const userId = await requireUserId()

  let form: FormData
  try {
    form = await request.formData()
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "bad form" },
      { status: 400 },
    )
  }

  const file = form.get("file")
  const documentId = String(form.get("documentId") ?? "")
  if (!documentId) {
    return NextResponse.json({ error: "missing documentId" }, { status: 400 })
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing file" }, { status: 400 })
  }

  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1)
  if (!doc) {
    return NextResponse.json({ error: "unknown document" }, { status: 404 })
  }
  if (doc.uploadedByUserId !== userId) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 })
  }
  if (doc.status !== "pending") {
    return NextResponse.json(
      { error: `already in status '${doc.status}'` },
      { status: 409 },
    )
  }

  const bytes = Buffer.from(await file.arrayBuffer())
  const stored = await writeLocalFile({
    workspaceId: doc.workspaceId,
    documentId: doc.id,
    filename: doc.filename,
    bytes,
  })

  const proto = request.headers.get("x-forwarded-proto") ?? "http"
  const host = request.headers.get("host") ?? "localhost:3000"
  const absoluteUrl = `${proto}://${host}${stored.servePath}`

  await db
    .update(documents)
    .set({
      blobUrl: absoluteUrl,
      blobPathname: stored.absolutePath, // local-mode: store the file's on-disk path
      sizeBytes: BigInt(bytes.length),
      mimeType: file.type || doc.mimeType,
      status: "uploaded",
      uploadedAt: new Date(),
    })
    .where(eq(documents.id, doc.id))

  await recordAudit({
    workspaceId: doc.workspaceId,
    projectId: doc.projectId,
    actorUserId: userId,
    actorKind: "user",
    action: "document.upload.local",
    targetKind: "document",
    targetId: doc.id,
    payload: { filename: doc.filename, scope: doc.scope, sizeBytes: bytes.length },
  })

  // BoQ templates, PTE, and Tender Addenda all go through deterministic
  // parsers (modules/procurex/boq/parser.ts for xlsx,
  // modules/procurex/addenda/* for the zip), not the AI extraction queue.
  // Queuing an extraction job for these would burn tokens on no-op
  // persistors.
  const specForCategory = getDocSpec(doc.category)
  const skipExtraction =
    specForCategory?.id === "boq-template" ||
    specForCategory?.id === "pte" ||
    specForCategory?.id === "addenda"

  if (!skipExtraction) {
    try {
      await enqueueExtraction({
        payload: {
          documentId: doc.id,
          blobUrl: absoluteUrl,
          filename: doc.filename,
          mimeType: file.type || doc.mimeType,
          workspaceId: doc.workspaceId,
          projectId: doc.projectId ?? "",
          userId,
        },
      })
    } catch (err) {
      console.error("[upload-local.enqueue] failed", err)
    }
  }

  // Kick the worker drain immediately.
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

  return NextResponse.json({ ok: true, documentId: doc.id, url: absoluteUrl })
}
