import "server-only"

import { randomUUID } from "node:crypto"

import { db } from "@/modules/core/db"
import { prisma } from "@/lib/prisma"
import { ratesMessage } from "@/modules/identity/schema"

export interface LogMessageInput {
  userId: string | null
  userEmail: string | null
  question: string
  answer: string
  tokensIn: number
  tokensOut: number
  toolCalls: { name: string; noData: boolean }[]
  latencyMs: number
  error: boolean
}

/** Record one assistant turn. Returns the message id (for feedback linkage). */
export async function logRatesMessage(input: LogMessageInput): Promise<string> {
  const id = randomUUID()
  await db.insert(ratesMessage).values({
    id,
    userId: input.userId,
    userEmail: input.userEmail,
    question: input.question.slice(0, 4000),
    answer: input.answer.slice(0, 12000),
    tokensIn: Math.round(input.tokensIn) || 0,
    tokensOut: Math.round(input.tokensOut) || 0,
    toolCalls: input.toolCalls,
    toolCount: input.toolCalls.length,
    latencyMs: Math.round(input.latencyMs) || 0,
    error: input.error,
  })
  return id
}

const n = (v: unknown) => (v == null ? 0 : Number(v))

export interface ExperimentDashboard {
  totals: {
    messages: number
    users: number
    tokensIn: number
    tokensOut: number
    avgLatency: number
    errors: number
    toolCalls: number
  }
  feedback: { total: number; up: number; down: number; rated: number; coverage: number }
  perUser: Array<{
    email: string
    messages: number
    tokensIn: number
    tokensOut: number
    avgLatency: number
    lastActive: string
    feedback: number
    up: number
    down: number
    noFeedback: number
  }>
  timeseries: Array<{ day: string; messages: number; tokens: number }>
  tools: Array<{ name: string; calls: number; noData: number }>
  recent: Array<{
    id: string
    email: string | null
    question: string | null
    tokensIn: number
    tokensOut: number
    toolCount: number
    latencyMs: number
    error: boolean
    createdAt: string
    vote: string | null
    reason: string | null
  }>
}

export async function getExperimentDashboard(): Promise<ExperimentDashboard> {
  const [totalsRow] = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT count(*)::int messages,
            count(DISTINCT user_email)::int users,
            COALESCE(sum(tokens_in),0)::int tokens_in,
            COALESCE(sum(tokens_out),0)::int tokens_out,
            COALESCE(round(avg(latency_ms)),0)::int avg_latency,
            count(*) FILTER (WHERE error)::int errors,
            COALESCE(sum(tool_count),0)::int tool_calls
     FROM px_rates_message`,
  )

  const [fbRow] = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT count(*)::int total,
            count(*) FILTER (WHERE vote='up')::int up,
            count(*) FILTER (WHERE vote='down')::int down,
            count(DISTINCT message_id) FILTER (WHERE message_id IS NOT NULL)::int rated
     FROM px_rates_feedback`,
  )

  const perUser = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    // LATERAL → at most one (latest) feedback per message, so message/token
    // counts aren't multiplied when a turn was rated more than once.
    `SELECT m.user_email email,
            count(*)::int messages,
            COALESCE(sum(m.tokens_in),0)::int tokens_in,
            COALESCE(sum(m.tokens_out),0)::int tokens_out,
            COALESCE(round(avg(m.latency_ms)),0)::int avg_latency,
            to_char(max(m.created_at),'YYYY-MM-DD HH24:MI') last_active,
            count(*) FILTER (WHERE f.vote IS NOT NULL)::int feedback,
            count(*) FILTER (WHERE f.vote='up')::int up,
            count(*) FILTER (WHERE f.vote='down')::int down,
            count(*) FILTER (WHERE f.vote IS NULL)::int no_feedback
     FROM px_rates_message m
     LEFT JOIN LATERAL (
       SELECT vote FROM px_rates_feedback
       WHERE message_id = m.id ORDER BY created_at DESC LIMIT 1
     ) f ON true
     GROUP BY m.user_email
     ORDER BY messages DESC`,
  )

  const timeseries = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT to_char(date_trunc('day', created_at),'YYYY-MM-DD') AS "day",
            count(*)::int messages,
            COALESCE(sum(tokens_in + tokens_out),0)::int tokens
     FROM px_rates_message
     WHERE created_at > now() - interval '30 days'
     GROUP BY 1 ORDER BY 1`,
  )

  const tools = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT t->>'name' name,
            count(*)::int calls,
            count(*) FILTER (WHERE (t->>'noData')::boolean)::int no_data
     FROM px_rates_message m,
          jsonb_array_elements(COALESCE(m.tool_calls,'[]'::jsonb)) t
     GROUP BY 1 ORDER BY 2 DESC`,
  )

  const recent = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT m.id, m.user_email email, m.question,
            m.tokens_in, m.tokens_out, m.tool_count, m.latency_ms, m.error,
            to_char(m.created_at,'YYYY-MM-DD HH24:MI') created_at,
            f.vote, f.reason
     FROM px_rates_message m
     LEFT JOIN LATERAL (
       SELECT vote, reason FROM px_rates_feedback
       WHERE message_id = m.id ORDER BY created_at DESC LIMIT 1
     ) f ON true
     ORDER BY m.created_at DESC LIMIT 80`,
  )

  const messages = n(totalsRow?.messages)
  const rated = n(fbRow?.rated)

  return {
    totals: {
      messages,
      users: n(totalsRow?.users),
      tokensIn: n(totalsRow?.tokens_in),
      tokensOut: n(totalsRow?.tokens_out),
      avgLatency: n(totalsRow?.avg_latency),
      errors: n(totalsRow?.errors),
      toolCalls: n(totalsRow?.tool_calls),
    },
    feedback: {
      total: n(fbRow?.total),
      up: n(fbRow?.up),
      down: n(fbRow?.down),
      rated,
      coverage: messages ? Math.round((rated / messages) * 100) : 0,
    },
    perUser: perUser.map((r) => ({
      email: (r.email as string) ?? "(unknown)",
      messages: n(r.messages),
      tokensIn: n(r.tokens_in),
      tokensOut: n(r.tokens_out),
      avgLatency: n(r.avg_latency),
      lastActive: (r.last_active as string) ?? "",
      feedback: n(r.feedback),
      up: n(r.up),
      down: n(r.down),
      noFeedback: n(r.no_feedback),
    })),
    timeseries: timeseries.map((r) => ({
      day: r.day as string,
      messages: n(r.messages),
      tokens: n(r.tokens),
    })),
    tools: tools.map((r) => ({
      name: (r.name as string) ?? "(none)",
      calls: n(r.calls),
      noData: n(r.no_data),
    })),
    recent: recent.map((r) => ({
      id: r.id as string,
      email: (r.email as string) ?? null,
      question: (r.question as string) ?? null,
      tokensIn: n(r.tokens_in),
      tokensOut: n(r.tokens_out),
      toolCount: n(r.tool_count),
      latencyMs: n(r.latency_ms),
      error: Boolean(r.error),
      createdAt: (r.created_at as string) ?? "",
      vote: (r.vote as string) ?? null,
      reason: (r.reason as string) ?? null,
    })),
  }
}
