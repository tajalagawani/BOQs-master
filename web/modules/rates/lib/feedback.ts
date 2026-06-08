import "server-only"

import { randomUUID } from "node:crypto"
import { desc } from "drizzle-orm"

import { db } from "@/modules/core/db"
import { ratesFeedback, type RatesFeedback } from "@/modules/identity/schema"

export interface SaveFeedbackInput {
  userId: string | null
  userEmail: string | null
  vote: "up" | "down"
  reason?: string | null
  question?: string | null
  answer?: string | null
  messageId?: string | null
}

/** Persist one feedback row from the RatesX AI chat. */
export async function saveRatesFeedback(input: SaveFeedbackInput): Promise<void> {
  await db.insert(ratesFeedback).values({
    id: randomUUID(),
    messageId: input.messageId ?? null,
    userId: input.userId,
    userEmail: input.userEmail,
    vote: input.vote,
    reason: input.reason?.trim() || null,
    question: input.question?.slice(0, 4000) ?? null,
    answer: input.answer?.slice(0, 8000) ?? null,
  })
}

/** Most recent feedback first, for the superadmin review page. */
export async function listRatesFeedback(limit = 500): Promise<RatesFeedback[]> {
  return db
    .select()
    .from(ratesFeedback)
    .orderBy(desc(ratesFeedback.createdAt))
    .limit(limit)
}
