import { streamRatesAssistant, type AssistantTurn } from "@/modules/rates/lib/ai/agent";
import { isAiConfigured } from "@/modules/ai-extraction/client";
import { canUseRatesAssistant, getCurrentUser } from "@/modules/core/authz";
import { logRatesMessage } from "@/modules/rates/lib/ai-analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  // Restricted to super admins and the testers a super admin has enabled.
  const me = await getCurrentUser();
  if (!me) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }
  if (!canUseRatesAssistant(me)) {
    return Response.json(
      { error: "The RatesX AI assistant is in limited testing. Ask a super admin for access." },
      { status: 403 },
    );
  }
  if (!isAiConfigured()) {
    return Response.json({ error: "AI is not configured (ANTHROPIC_API_KEY missing)." }, { status: 503 });
  }
  let body: { question?: string; history?: AssistantTurn[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const question = (body.question ?? "").toString().trim();
  if (!question) return Response.json({ error: "Empty question." }, { status: 400 });
  const history = Array.isArray(body.history) ? body.history.slice(-8) : [];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      const startedAt = Date.now();
      let stats: import("@/modules/rates/lib/ai/agent").AssistantTurnStats | null = null;
      let errored = false;
      try {
        for await (const ev of streamRatesAssistant(question, history)) {
          if (ev.type === "done") {
            stats = ev.stats; // capture, but don't forward yet — add the id first
            continue;
          }
          if (ev.type === "error") errored = true;
          send(ev);
        }
      } catch (e) {
        errored = true;
        send({ type: "error", message: e instanceof Error ? e.message : "Assistant failed." });
      }

      // Log every turn (regardless of feedback) for the experiment dashboard.
      let messageId: string | null = null;
      try {
        messageId = await logRatesMessage({
          userId: me.id,
          userEmail: me.email,
          question,
          answer: stats?.answer ?? "",
          tokensIn: stats?.tokensIn ?? 0,
          tokensOut: stats?.tokensOut ?? 0,
          toolCalls: stats?.tools ?? [],
          latencyMs: Date.now() - startedAt,
          error: errored,
        });
      } catch (err) {
        console.error("[assistant] message log failed", err);
      }

      send({ type: "done", messageId });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
