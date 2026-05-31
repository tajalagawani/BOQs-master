import { and, eq, isNull, like } from "drizzle-orm"
import { NextResponse } from "next/server"

import { auditLog } from "@/modules/audit/schema"
import { companies } from "@/modules/companies/schema"
import { db } from "@/modules/core/db"
import { documents } from "@/modules/documents/schema"
import { extractionJobs } from "@/modules/ai-extraction/queue/schema"
import { projects, projectMembers } from "@/modules/procurex/projects/schema"
import {
  complianceRecordTemplates,
  projectPhases,
  responsibilityMatrixRows,
} from "@/modules/procurex/sopr/schema"
import { tendererInvites } from "@/modules/procurex/portal/schema"
import { workflowRuns } from "@/modules/workflows/schema"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/projects/[projectId]/full
 *
 * Read-only export of EVERYTHING the system knows about a project.
 * No auth (read-only diagnostic for now). Returns:
 *
 *   {
 *     project: <projects.row + every persistor-written column>,
 *     members: [{ userId, role, joinedAt }],
 *     documents: [
 *       {
 *         id, category, scope, status, filename, mimeType, sizeBytes,
 *         uploadedAt, blobUrl, blobPathname,
 *         extraction: {
 *           jobId, jobStatus, attempts, maxAttempts, lastError,
 *           workflowRunId, workflowRunStatus, workflowFinishedAt,
 *           verdict, rawAgentVerdict, ledger,
 *           tokens, estimatedCostUsd,
 *           runMeta, cacheHit, cachedFrom, cacheEligible,
 *         } | null
 *       }
 *     ],
 *     tenderers: { count, raw: [] },          // placeholder — table doesn't exist yet
 *     invites: [{ companyId, sentAt, openedAt, acceptedAt, resentCount, revokedAt }],
 *     companies: [<every company referenced by an invite>],
 *     sopr: {
 *       phases: [...], responsibilityMatrixRows: [...],
 *       complianceRecordTemplates: [...],
 *     },
 *     auditLog: [{ action, payload, createdAt, actorUserId }],   // last 200 events
 *     summary: {
 *       documentCount, extractedCount, savedCount,
 *       totalTokens, totalEstimatedCostUsd,
 *     }
 *   }
 *
 * BigInts are serialised as "<digits>n" strings so JSON.stringify doesn't throw.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
): Promise<NextResponse> {
  const { projectId } = await context.params

  // 1. Project row (the persistor target for FOT / ITT / COC)
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)
  if (!project) {
    return jsonRes({ error: `Project ${projectId} not found` }, 404)
  }

  // 2. Members
  const members = await db
    .select({
      userId: projectMembers.userId,
      role: projectMembers.role,
      joinedAt: projectMembers.joinedAt,
    })
    .from(projectMembers)
    .where(eq(projectMembers.projectId, projectId))

  // 3. Documents + extraction state (latest job per doc)
  const docs = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.projectId, projectId),
        isNull(documents.deletedAt),
      ),
    )
    .orderBy(documents.createdAt)

  const docIds = docs.map((d) => d.id)
  const jobs = docIds.length
    ? await db
        .select()
        .from(extractionJobs)
        .where(
          // For each doc, take ALL jobs and pick latest in JS
          // (avoids needing distinct on which the neon-http driver dislikes).
          eq(extractionJobs.projectId, projectId),
        )
    : []
  const latestJobByDoc = new Map<string, (typeof jobs)[number]>()
  for (const j of jobs) {
    const prev = latestJobByDoc.get(j.documentId)
    if (!prev || (j.createdAt && prev.createdAt && j.createdAt > prev.createdAt)) {
      latestJobByDoc.set(j.documentId, j)
    }
  }

  // Resolve the workflow_runs for those jobs
  const runIds = Array.from(
    new Set(
      Array.from(latestJobByDoc.values())
        .map((j) => j.workflowRunId)
        .filter((id): id is string => Boolean(id)),
    ),
  )
  const runMap = new Map<string, (typeof workflowRuns.$inferSelect)>()
  if (runIds.length > 0) {
    const runs = await db
      .select()
      .from(workflowRuns)
      .where(eq(workflowRuns.workspaceId, project.workspaceId))
    for (const r of runs) if (runIds.includes(r.id)) runMap.set(r.id, r)
  }

  // 4. SOPR-derived child tables
  const phases = await db
    .select()
    .from(projectPhases)
    .where(eq(projectPhases.projectId, projectId))
    .orderBy(projectPhases.position)
  const respRows = await db
    .select()
    .from(responsibilityMatrixRows)
    .where(eq(responsibilityMatrixRows.projectId, projectId))
    .orderBy(responsibilityMatrixRows.position)
  const compTemplates = await db
    .select()
    .from(complianceRecordTemplates)
    .where(eq(complianceRecordTemplates.projectId, projectId))
    .orderBy(complianceRecordTemplates.position)

  // 5. Tenderer invites + companies referenced
  const invites = await db
    .select()
    .from(tendererInvites)
    .where(eq(tendererInvites.projectId, projectId))
  const inviteCompanyIds = Array.from(new Set(invites.map((i) => i.companyId)))
  const companiesUsed = inviteCompanyIds.length
    ? await db
        .select()
        .from(companies)
        .where(eq(companies.workspaceId, project.workspaceId))
    : []
  const filteredCompanies = companiesUsed.filter((c) =>
    inviteCompanyIds.includes(c.id),
  )

  // 6. Audit trail (last 200 events for this project)
  const audit = await db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      targetKind: auditLog.targetKind,
      targetId: auditLog.targetId,
      actorUserId: auditLog.actorUserId,
      payload: auditLog.payload,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .where(eq(auditLog.projectId, projectId))
    .orderBy(auditLog.createdAt)
    .limit(200)

  // 7. Compute extraction state per doc + roll-up summary
  type DocOut = (typeof docs)[number] & {
    extraction: ReturnType<typeof buildExtractionView> | null
  }
  const docsOut: DocOut[] = []
  let extractedCount = 0
  let totalInputTokens = 0
  let totalOutputTokens = 0
  let totalCacheRead = 0
  let totalCacheCreate = 0

  // saved categories — `doc.save:<categoryId>` audit entries
  const savedCategoryIds = new Set<string>()
  for (const a of audit) {
    if (a.action.startsWith("doc.save:")) {
      savedCategoryIds.add(a.action.replace(/^doc\.save:/, ""))
    }
  }

  for (const d of docs) {
    const job = latestJobByDoc.get(d.id) ?? null
    const run = job?.workflowRunId ? runMap.get(job.workflowRunId) ?? null : null
    const extraction = buildExtractionView(job, run)
    if (extraction?.workflowRunStatus === "succeeded") extractedCount += 1
    if (extraction?.tokens) {
      totalInputTokens += extraction.tokens.input ?? 0
      totalOutputTokens += extraction.tokens.output ?? 0
      totalCacheRead += extraction.tokens.cacheRead ?? 0
      totalCacheCreate += extraction.tokens.cacheCreate ?? 0
    }
    docsOut.push({ ...d, extraction })
  }

  const sonnetCost =
    (totalInputTokens * 3 +
      totalOutputTokens * 15 +
      totalCacheRead * 0.3 +
      totalCacheCreate * 3.75) /
    1_000_000

  return jsonRes({
    project,
    members,
    documents: docsOut,
    tenderers: {
      count: 0,
      note:
        "The `tenderer` table does not exist yet (see docs/STEP3_PLAN.md). " +
        "Once the Phase-A migration ships, this section will list every tenderer joined with " +
        "their company and per-document upload state.",
      raw: [] as never[],
    },
    invites,
    companies: filteredCompanies,
    sopr: {
      phases,
      responsibilityMatrixRows: respRows,
      complianceRecordTemplates: compTemplates,
    },
    auditLog: audit,
    summary: {
      documentCount: docs.length,
      extractedCount,
      savedCount: savedCategoryIds.size,
      savedCategoryIds: Array.from(savedCategoryIds),
      tokens: {
        input: totalInputTokens,
        output: totalOutputTokens,
        cacheRead: totalCacheRead,
        cacheCreate: totalCacheCreate,
      },
      estimatedCostUsd: Number(sonnetCost.toFixed(4)),
      costNote:
        "Estimated cost assumes Sonnet 4.6 list prices ($3/MTok in, $15/MTok out, $0.30 cache_read, $3.75 cache_create). " +
        "If `AI_CHUNKED_MODEL=claude-haiku-4-5` is in effect, divide by ~5 for chunked runs.",
    },
  })
}

// -----------------------------------------------------------------------------

function buildExtractionView(
  job: typeof extractionJobs.$inferSelect | null,
  run: typeof workflowRuns.$inferSelect | null,
) {
  if (!job && !run) return null
  const output = (run?.output ?? null) as Record<string, unknown> | null
  const totals =
    (output?.totals as Record<string, number> | undefined) ?? undefined
  const runMeta =
    (output?.runMeta as Record<string, unknown> | undefined) ?? undefined
  const verdict = output?.verdict ?? null
  const rawAgentVerdict = output?.rawAgentVerdict ?? null
  const ledger =
    (output?.ledger as Record<string, unknown> | undefined) ??
    ((verdict as { _coverage_ledger?: unknown } | null)?._coverage_ledger ?? null)

  return {
    jobId: job?.id ?? null,
    jobStatus: job?.status ?? null,
    attempts: job?.attempts ?? null,
    maxAttempts: job?.maxAttempts ?? null,
    lastError: job?.lastError ?? null,
    workflowRunId: run?.id ?? job?.workflowRunId ?? null,
    workflowRunStatus: run?.status ?? null,
    workflowFinishedAt: run?.finishedAt ?? null,
    cacheHit: (output?.cache_hit as boolean | undefined) ?? null,
    cachedFrom: (output?.cached_from as string | undefined) ?? null,
    cacheEligible: (output?.cache_eligible as boolean | undefined) ?? null,
    runMeta,
    tokens: totals
      ? {
          input: Number(totals.input_tokens ?? 0),
          output: Number(totals.output_tokens ?? 0),
          cacheRead: Number(totals.cache_read_tokens ?? 0),
          cacheCreate: Number(totals.cache_create_tokens ?? 0),
        }
      : null,
    verdict,
    rawAgentVerdict,
    ledger,
    progress: (job?.progress as Record<string, unknown> | null) ?? null,
  }
}

// Stringify with BigInts as "<digits>n" so the response never throws.
function jsonRes(payload: unknown, status = 200): NextResponse {
  const body = JSON.stringify(
    payload,
    (_k, v) => (typeof v === "bigint" ? `${v.toString()}n` : v),
    2,
  )
  return new NextResponse(body, {
    status,
    headers: { "content-type": "application/json" },
  })
}

// Suppress unused-import warnings for like/isNull when only some of them
// are actively used (drizzle's tree-shaking complains otherwise).
void like
void isNull
