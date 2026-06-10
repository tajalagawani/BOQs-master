import "server-only"

import { randomUUID } from "node:crypto"
import { asc, eq } from "drizzle-orm"

import { db } from "@/modules/core/db"
import { ratesAiRule, type RatesAiRule } from "@/modules/identity/schema"

const MAX_ENABLED = 25
const MAX_BODY = 500

export async function listRatesAiRules(): Promise<RatesAiRule[]> {
  return db.select().from(ratesAiRule).orderBy(asc(ratesAiRule.createdAt))
}

export async function getRuleById(id: string): Promise<RatesAiRule | null> {
  const rows = await db.select().from(ratesAiRule).where(eq(ratesAiRule.id, id)).limit(1)
  return rows[0] ?? null
}

/** Enabled rules as a prompt block (capped) — appended to the agent system prompt. */
export async function getEnabledRulesText(): Promise<string> {
  const rows = await db
    .select()
    .from(ratesAiRule)
    .where(eq(ratesAiRule.enabled, true))
    .orderBy(asc(ratesAiRule.createdAt))
  return rows
    .slice(0, MAX_ENABLED)
    .map((r) => `- ${r.title}: ${r.body}`)
    .join("\n")
}

export async function createRule(input: {
  title: string
  body: string
  category?: string | null
  createdBy: string | null
  createdByEmail: string | null
}): Promise<RatesAiRule> {
  const id = randomUUID()
  const row = {
    id,
    title: input.title.trim().slice(0, 160),
    body: input.body.trim().slice(0, MAX_BODY),
    category: input.category?.trim() || null,
    enabled: true,
    createdBy: input.createdBy,
    createdByEmail: input.createdByEmail,
  }
  await db.insert(ratesAiRule).values(row)
  return (await getRuleById(id))!
}

export async function updateRule(
  id: string,
  patch: { title?: string; body?: string; category?: string | null; enabled?: boolean },
): Promise<void> {
  const set: Record<string, unknown> = { updatedAt: new Date() }
  if (patch.title !== undefined) set.title = patch.title.trim().slice(0, 160)
  if (patch.body !== undefined) set.body = patch.body.trim().slice(0, MAX_BODY)
  if (patch.category !== undefined) set.category = patch.category?.trim() || null
  if (patch.enabled !== undefined) set.enabled = patch.enabled
  await db.update(ratesAiRule).set(set).where(eq(ratesAiRule.id, id))
}

export async function deleteRule(id: string): Promise<void> {
  await db.delete(ratesAiRule).where(eq(ratesAiRule.id, id))
}
