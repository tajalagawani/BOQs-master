import "server-only"

import { and, desc, eq, isNull } from "drizzle-orm"

import { db } from "@/modules/core/db"
import { documents } from "@/modules/documents/schema"
import { workflowRuns } from "@/modules/workflows/schema"

import type { CocGrouped, ProjectCocRequirements } from "../types"

/**
 * Project-side COC requirements — the Conditions-of-Contract baseline
 * every bidder must comply against. Pulled from the project's own COC
 * doc (scope=required, target_kind=project, category="Conditions of
 * Contract") via its most recent successful `ai.extract:coc` run.
 *
 * Returns null when no project COC has been extracted yet.
 *
 * Grouped to match Section B's two criteria columns:
 *   - termsAndConditions → contract form, governing law, dispute forum,
 *                          language, DLP, decennial, fixed price
 *   - paymentTerms       → advance, performance bond, retention, LDs
 */

interface RawCocVerdict {
  contractForm?: string | null
  contractFormCode?: string | null
  contractFormVersion?: string | null
  governingLaw?: string | null
  disputeForum?: string | null
  language?: string | null
  engineerName?: string | null
  dlpMonths?: number | null
  decennialLiabilityYears?: number | null
  fixedPrice?: boolean | null
  documentPriorityOrder?: string[] | null
  advancePaymentPercent?: number | string | null
  advancePaymentBondPercent?: number | string | null
  performanceBondPercent?: number | string | null
  retentionPercent?: number | string | null
  retentionCapCents?: string | number | bigint | null
  retentionCapPercent?: number | string | null
  ldPerDayCents?: string | number | bigint | null
  ldCapCents?: string | number | bigint | null
  ldCapPercent?: number | string | null
}

function asNum(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v === "string") {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function asCents(v: unknown): string | null {
  if (v == null) return null
  if (typeof v === "bigint") return v.toString()
  if (typeof v === "number") return String(Math.trunc(v))
  if (typeof v === "string") return v.replace(/n$/, "")
  return null
}

export function mapCocVerdictToGrouped(input: unknown): CocGrouped | null {
  if (!input || typeof input !== "object") return null
  const v = input as RawCocVerdict
  return {
    termsAndConditions: {
      contractForm: v.contractForm ?? null,
      contractFormCode: v.contractFormCode ?? null,
      contractFormVersion: v.contractFormVersion ?? null,
      governingLaw: v.governingLaw ?? null,
      disputeForum: v.disputeForum ?? null,
      language: v.language ?? null,
      engineerName: v.engineerName ?? null,
      dlpMonths: asNum(v.dlpMonths),
      decennialLiabilityYears: asNum(v.decennialLiabilityYears),
      fixedPrice: typeof v.fixedPrice === "boolean" ? v.fixedPrice : null,
      documentPriorityOrder: Array.isArray(v.documentPriorityOrder)
        ? v.documentPriorityOrder.filter((s): s is string => typeof s === "string")
        : [],
    },
    paymentTerms: {
      advancePaymentPercent: asNum(v.advancePaymentPercent),
      advancePaymentBondPercent: asNum(v.advancePaymentBondPercent),
      performanceBondPercent: asNum(v.performanceBondPercent),
      retentionPercent: asNum(v.retentionPercent),
      retentionCapCents: asCents(v.retentionCapCents),
      retentionCapPercent: asNum(v.retentionCapPercent),
      ldPerDayCents: asCents(v.ldPerDayCents),
      ldCapCents: asCents(v.ldCapCents),
      ldCapPercent: asNum(v.ldCapPercent),
    },
  }
}

export async function getProjectCocRequirements(
  projectId: string,
): Promise<ProjectCocRequirements | null> {
  const docRows = await db
    .select({ id: documents.id })
    .from(documents)
    .where(
      and(
        eq(documents.projectId, projectId),
        eq(documents.scope, "required"),
        eq(documents.targetKind, "project"),
        eq(documents.category, "Conditions of Contract"),
        isNull(documents.deletedAt),
      ),
    )
  if (docRows.length === 0) return null
  const docIds = new Set(docRows.map((d) => d.id))

  const runs = await db
    .select({
      output: workflowRuns.output,
      input: workflowRuns.input,
      finishedAt: workflowRuns.finishedAt,
    })
    .from(workflowRuns)
    .where(
      and(
        eq(workflowRuns.kind, "ai.extract:coc"),
        eq(workflowRuns.status, "succeeded"),
      ),
    )
    .orderBy(desc(workflowRuns.finishedAt))

  const latest = runs.find((r) => {
    const docId = (r.input as { documentId?: string } | null)?.documentId
    return docId ? docIds.has(docId) : false
  })
  if (!latest) return null

  const verdict = (latest.output as { verdict?: unknown } | null)?.verdict
  return mapCocVerdictToGrouped(verdict)
}
