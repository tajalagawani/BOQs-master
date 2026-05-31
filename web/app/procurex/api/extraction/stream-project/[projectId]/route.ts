import { and, eq, inArray, isNull } from "drizzle-orm"

import { db } from "@/modules/core/db"
import { documents } from "@/modules/documents/schema"
import {
  getRecentProgress,
  subscribeProjectProgress,
} from "@/modules/ai-extraction/queue/event-bus"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Single SSE channel per project — every in-flight document's progress
 * events flow over this one connection. Replaces N per-document
 * EventSources with one. Client receives `event: progress|done|error`
 * messages carrying `documentId` so it can route to the right row.
 *
 * Public route — UUIDs are unguessable. Move into PUBLIC_PATHS-gated
 * auth if it ever serves cross-project data.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
): Promise<Response> {
  const { projectId } = await context.params

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(
              `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
            ),
          )
        } catch {
          /* controller closed — ignore */
        }
      }

      send("hello", { projectId, at: new Date().toISOString() })

      // Replay: any in-flight docs in this project — read their recent
      // event buffer so a fresh subscriber doesn't start blank.
      try {
        const docs = await db
          .select({ id: documents.id })
          .from(documents)
          .where(
            and(
              eq(documents.projectId, projectId),
              eq(documents.targetKind, "project"),
              isNull(documents.deletedAt),
            ),
          )
          .limit(200)
        for (const d of docs) {
          for (const past of getRecentProgress(d.id)) {
            const event =
              past.type === "done"
                ? "done"
                : past.type === "error"
                  ? "error"
                  : "progress"
            send(event, { ...past, documentId: d.id })
          }
        }
      } catch {
        /* DB error during replay is non-fatal */
      }

      const unsubscribe = subscribeProjectProgress(projectId, (event) => {
        if (event.type === "done") {
          send("done", event)
        } else if (event.type === "error") {
          send("error", event)
        } else {
          send("progress", event)
        }
      })

      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keepalive\n\n`))
        } catch {
          clearInterval(keepalive)
        }
      }, 15_000)

      return () => {
        clearInterval(keepalive)
        unsubscribe()
      }
    },
  })

  return new Response(stream, {
    status: 200,
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-store, no-transform",
      "connection": "keep-alive",
      "x-accel-buffering": "no",
    },
  })
}
