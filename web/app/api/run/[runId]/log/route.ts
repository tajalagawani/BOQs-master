import fs from "node:fs";
import { logPath, metaPath } from "@/lib/paths";

export const runtime = "nodejs";

/**
 * GET /api/run/[runId]/log
 * Server-Sent Events: streams new lines appended to run.log.
 * Closes when meta.status flips to 'complete' or 'failed'.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;
  const file = logPath(runId);
  const meta = metaPath(runId);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let pos = 0;
      let lastStatus = "";
      let closed = false;

      const send = (event: string, data: string) => {
        if (closed) return;
        const lines = data.split("\n");
        for (const line of lines) {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${line}\n\n`));
        }
      };

      const readChunk = async () => {
        try {
          const stat = await fs.promises.stat(file);
          if (stat.size > pos) {
            const fh = await fs.promises.open(file, "r");
            const buf = Buffer.alloc(stat.size - pos);
            await fh.read(buf, 0, buf.length, pos);
            await fh.close();
            pos = stat.size;
            send("log", buf.toString("utf-8"));
          }
        } catch {
          /* file might not exist yet — keep polling */
        }
      };

      const readStatus = async () => {
        try {
          const raw = await fs.promises.readFile(meta, "utf-8");
          const j = JSON.parse(raw);
          if (j.status && j.status !== lastStatus) {
            lastStatus = j.status;
            send("status", JSON.stringify({ status: j.status, exitCode: j.exitCode }));
          }
          return j.status as string;
        } catch {
          return "";
        }
      };

      // Tail loop — ~500ms polling
      const tick = async () => {
        if (closed) return;
        await readChunk();
        const status = await readStatus();
        if (status === "complete" || status === "failed") {
          await readChunk(); // final flush
          send("done", JSON.stringify({ status }));
          closed = true;
          controller.close();
          return;
        }
        setTimeout(tick, 500);
      };
      tick();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
