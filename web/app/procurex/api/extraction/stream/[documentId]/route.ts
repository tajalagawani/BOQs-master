import { eq } from "drizzle-orm"

import { db } from "@/modules/core/db"
import { documents } from "@/modules/documents/schema"
import {
  getRecentProgress,
  subscribeProgress,
} from "@/modules/ai-extraction/queue/event-bus"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * SSE stream of live agent progress for a single document.
 *
 * Client:
 *   const es = new EventSource(`/procurex/api/extraction/stream/${documentId}`)
 *   es.addEventListener("progress", (e) => { ... JSON.parse(e.data) ... })
 *
 * Events emitted:
 *   - "progress": iteration / lastAction / tools / tokens
 *   - "done":     terminal — status=succeeded|failed, error if failed
 *   - keepalive comments every 15s so middleboxes don't kill the conn
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ documentId: string }> },
): Promise<Response> {
  const { documentId } = await context.params

  // Best-effort existence check so we don't keep an SSE channel open for
  // a typo'd id. Auth-gating could live here if the route is moved out of
  // PUBLIC_PATHS (UUIDs are unguessable so it's fine for dev).
  const [doc] = await db
    .select({ id: documents.id })
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1)
  if (!doc) {
    return new Response("not found", { status: 404 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
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

      // Initial hello so the client knows the channel is alive.
      send("hello", { documentId, at: new Date().toISOString() })

      // Replay any events the agent has already emitted so the panel
      // doesn't start blank when it mounts mid-run.
      for (const past of getRecentProgress(documentId)) {
        if (past.type === "done") {
          send("done", past)
        } else if (past.type === "error") {
          send("error", past)
        } else {
          send("progress", past)
        }
      }

      const unsubscribe = subscribeProgress(documentId, (event) => {
        if (event.type === "done") {
          send("done", event)
          // Don't close immediately — the client may still want to read
          // recently-buffered events. Close after a short tick.
          setTimeout(() => {
            try {
              controller.close()
            } catch {
              /* already closed */
            }
          }, 200)
        } else if (event.type === "error") {
          send("error", event)
        } else {
          send("progress", event)
        }
      })

      // Keep-alive comment every 15s.
      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keepalive\n\n`))
        } catch {
          clearInterval(keepalive)
        }
      }, 15_000)

      // Client disconnect cleanup. The runtime calls cancel() on the
      // ReadableStream — we restore the bus subscription + timer state.
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
