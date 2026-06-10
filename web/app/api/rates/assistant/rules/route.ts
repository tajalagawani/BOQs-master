// /api/rates/assistant/rules — expert rules the chatters inject into the AI.
//   GET    list all rules
//   POST   add a rule           (any assistant user)
//   PATCH  edit / toggle a rule  (own or superadmin)
//   DELETE remove a rule         (own or superadmin)
// Lives under /api/rates/assistant so the assistant-only testers can reach it.
import { canUseRatesAssistant, getCurrentUser, isSuperadmin } from "@/modules/core/authz"
import {
  createRule,
  deleteRule,
  getRuleById,
  listRatesAiRules,
  updateRule,
} from "@/modules/rates/lib/ai-rules"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

async function gate() {
  const me = await getCurrentUser()
  if (!me) return { error: "Not signed in.", status: 401 as const, me: null }
  if (!canUseRatesAssistant(me)) return { error: "No access.", status: 403 as const, me: null }
  return { me, error: null, status: 200 as const }
}

export async function GET() {
  const g = await gate()
  if (!g.me) return Response.json({ error: g.error }, { status: g.status })
  const rules = await listRatesAiRules()
  return Response.json({
    rules,
    me: { id: g.me.id, superadmin: isSuperadmin(g.me) },
  })
}

export async function POST(req: Request) {
  const g = await gate()
  if (!g.me) return Response.json({ error: g.error }, { status: g.status })
  const body = await req.json().catch(() => null)
  const title = String(body?.title ?? "").trim()
  const text = String(body?.body ?? "").trim()
  if (!title || !text) return Response.json({ error: "title and body are required." }, { status: 400 })
  const rule = await createRule({
    title,
    body: text,
    category: body?.category ?? null,
    createdBy: g.me.id,
    createdByEmail: g.me.email,
  })
  return Response.json({ ok: true, rule })
}

async function canEdit(meId: string, superadmin: boolean, ruleId: string) {
  const rule = await getRuleById(ruleId)
  if (!rule) return { ok: false as const, status: 404 }
  if (!superadmin && rule.createdBy !== meId) return { ok: false as const, status: 403 }
  return { ok: true as const, status: 200 }
}

export async function PATCH(req: Request) {
  const g = await gate()
  if (!g.me) return Response.json({ error: g.error }, { status: g.status })
  const body = await req.json().catch(() => null)
  const id = String(body?.id ?? "")
  if (!id) return Response.json({ error: "id required." }, { status: 400 })
  const chk = await canEdit(g.me.id, isSuperadmin(g.me), id)
  if (!chk.ok) return Response.json({ error: "Not allowed." }, { status: chk.status })
  await updateRule(id, {
    title: body.title,
    body: body.body,
    category: body.category,
    enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
  })
  return Response.json({ ok: true })
}

export async function DELETE(req: Request) {
  const g = await gate()
  if (!g.me) return Response.json({ error: g.error }, { status: g.status })
  const id = new URL(req.url).searchParams.get("id") ?? ""
  if (!id) return Response.json({ error: "id required." }, { status: 400 })
  const chk = await canEdit(g.me.id, isSuperadmin(g.me), id)
  if (!chk.ok) return Response.json({ error: "Not allowed." }, { status: chk.status })
  await deleteRule(id)
  return Response.json({ ok: true })
}
