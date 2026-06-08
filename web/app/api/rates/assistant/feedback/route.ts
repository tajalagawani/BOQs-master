// POST /api/rates/assistant/feedback — record a thumbs up/down (with an
// optional reason for downvotes) on a RatesX AI answer. Any signed-in user who
// can reach the chat may submit; superadmins review at /platform/feedback.
import { canUseRatesAssistant, getCurrentUser } from "@/modules/core/authz"
import { saveRatesFeedback } from "@/modules/rates/lib/feedback"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const me = await getCurrentUser()
  if (!me) return Response.json({ error: "Not signed in." }, { status: 401 })
  if (!canUseRatesAssistant(me)) {
    return Response.json({ error: "No access to the assistant." }, { status: 403 })
  }

  let body: {
    vote?: string
    reason?: string
    question?: string
    answer?: string
    messageId?: string
  }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const vote = body.vote === "up" ? "up" : body.vote === "down" ? "down" : null
  if (!vote) return Response.json({ error: "vote must be up or down." }, { status: 400 })

  try {
    await saveRatesFeedback({
      userId: me.id,
      userEmail: me.email,
      vote,
      reason: body.reason ?? null,
      question: body.question ?? null,
      answer: body.answer ?? null,
      messageId: body.messageId ?? null,
    })
    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 })
  }
}
