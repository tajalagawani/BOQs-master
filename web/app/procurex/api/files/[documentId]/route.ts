import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

import { db } from "@/modules/core/db"
import { documents } from "@/modules/documents/schema"
import { readLocalFile } from "@/modules/documents/local-storage"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Serve files that were uploaded via the local-storage path.
 *
 * Public route — no auth gate — because:
 *   - URLs include a UUID document id (unguessable).
 *   - The extraction worker (running outside any user session) needs to
 *     fetch via this endpoint.
 *   - In production we'd front this with signed URLs; for dev it's fine.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ documentId: string }> },
): Promise<Response> {
  const { documentId } = await context.params

  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1)
  if (!doc) {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }
  if (doc.status === "pending") {
    return NextResponse.json({ error: "not uploaded yet" }, { status: 404 })
  }
  if (!doc.blobPathname) {
    return NextResponse.json({ error: "no file path" }, { status: 404 })
  }

  try {
    const bytes = await readLocalFile(doc.blobPathname)
    return new Response(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "content-type": doc.mimeType ?? "application/octet-stream",
        "content-length": String(bytes.length),
        "content-disposition": `inline; filename="${doc.filename.replace(/"/g, "")}"`,
        "cache-control": "private, max-age=0, no-store",
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "read failed" },
      { status: 500 },
    )
  }
}
