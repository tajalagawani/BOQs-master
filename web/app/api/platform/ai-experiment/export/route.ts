// GET /api/platform/ai-experiment/export — CSV of every logged AI message
// (with any feedback), for offline analysis. Superadmin-only.
import { requireSuperadmin } from "@/modules/core/authz"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const csvCell = (v: unknown) => {
  const s = v == null ? "" : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export async function GET() {
  await requireSuperadmin()

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT to_char(m.created_at,'YYYY-MM-DD HH24:MI:SS') created_at,
            m.user_email, m.question, m.answer,
            m.tokens_in, m.tokens_out, m.tool_count, m.latency_ms, m.error,
            f.vote, f.reason
     FROM px_rates_message m
     LEFT JOIN px_rates_feedback f ON f.message_id = m.id
     ORDER BY m.created_at DESC`,
  )

  const headers = [
    "created_at", "user_email", "question", "answer",
    "tokens_in", "tokens_out", "tool_count", "latency_ms", "error",
    "vote", "reason",
  ]
  const lines = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => csvCell(r[h])).join(",")),
  ]

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ai-experiment.csv"`,
    },
  })
}
