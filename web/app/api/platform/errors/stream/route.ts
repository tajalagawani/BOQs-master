import { NextRequest } from "next/server";
import {
  getRecentErrors,
  subscribeToErrors,
  type RuntimeError,
} from "@/lib/platform/error-bus";
import { getPlatformUser } from "@/lib/platform/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Server-Sent Events stream of runtime errors. The client opens an
 * EventSource and receives:
 *
 *   event: hello\n
 *   data: { "buffered": <count> }\n\n
 *
 *   event: error\n
 *   data: <RuntimeError JSON>\n\n
 *
 *   event: ping\n          ← keep-alive every 25s
 *   data: <timestamp>\n\n
 */
export async function GET(_req: NextRequest) {
  const user = await getPlatformUser();
  if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "PLATFORM_ADMIN")) {
    return new Response("Forbidden", { status: 403 });
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let ping: ReturnType<typeof setInterval> | null = null;
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          /* peer gone */
        }
      };

      // Initial replay so the client renders something instantly.
      const buffered = getRecentErrors(100);
      send("hello", { buffered: buffered.length });
      for (const e of buffered.slice().reverse()) send("error", e);

      unsubscribe = subscribeToErrors((e: RuntimeError) => send("error", e));

      ping = setInterval(() => send("ping", Date.now()), 25_000);
    },
    cancel() {
      closed = true;
      unsubscribe?.();
      if (ping) clearInterval(ping);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // disable nginx buffering on prod
    },
  });
}
