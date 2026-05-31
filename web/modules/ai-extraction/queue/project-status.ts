"use server"

import { and, desc, eq, inArray, isNull, like, sql } from "drizzle-orm"

import { boqItems, boqTemplates } from "@/modules/boq/schema"
import { tenderAddenda } from "@/modules/procurex/addenda/schema"
import { tenderItemEvents } from "@/modules/procurex/boq/events-schema"
import { requireUserId } from "@/modules/core/auth"
import { db } from "@/modules/core/db"
import { auditLog } from "@/modules/audit/schema"
import { documents } from "@/modules/documents/schema"
import { workflowRuns } from "@/modules/workflows/schema"
import { workspaceMembers } from "@/modules/workspace/schema"
import { projects } from "@/modules/procurex/projects/schema"

import { getDocSpec } from "@/modules/ai-extraction/specs/registry"

import { getLatestJobsForDocuments } from "./reads"

export interface CategoryProgress {
  iteration: number
  maxIterations: number
  lastAction: string
  tools: string[]
  stopReason: string | null
  at: string
  inputTokens?: number
  outputTokens?: number
  cacheReadTokens?: number
  cacheCreateTokens?: number
}

export interface CategoryStatusEntry {
  categoryId: string
  documentId: string | null
  filename: string | null
  /** Final-state job status if any. 'none' when no doc has been uploaded yet. */
  jobStatus:
    | "none"
    | "queued"
    | "claimed"
    | "running"
    | "succeeded"
    | "failed"
  lastError: string | null
  workflowRunId: string | null
  /** Form-shape value persisted by the successful workflow. Pre-fills the manual form. */
  verdict: unknown
  /** True once the user has clicked Save on the Review modal (or saved manually).
   *  Derived from audit_log `doc.save:<spec.id>` entries. */
  isSaved: boolean
  /** V2-15 — final token + cost summary from workflow_run.output.totals.
   *  Surfaced in the accordion footer after the run completes. */
  runTotals: {
    input_tokens: number
    output_tokens: number
    cache_read_tokens: number
    cache_create_tokens: number
    estimated_cost_usd: number
    cached?: boolean
  } | null
  /** Live agent iteration info while a job is in flight. */
  progress: CategoryProgress | null
  /** BoQ-template only: items + sections that landed via the
   *  deterministic importer. Surfaced in the Step 2 BoQ accordion row in
   *  place of the AI-extraction badges. */
  boqImport: {
    itemsCreated: number
    sectionsCreated: number
  } | null
  /** Addenda only: count of applied addenda + total events. Surfaced
   *  on the Tender Addenda row so it doesn't show "Empty" forever. */
  addendaSummary: {
    addendaApplied: number
    eventsApplied: number
    latestNo: string | null
  } | null
}

/**
 * One row per category for a project — what doc lives in that slot
 * (if any) and what state its extraction is in. The Step 2 page polls
 * this every 2s to drive accordion status badges + auto-prefill.
 */
export async function getCategoryStatuses(
  projectId: string,
): Promise<CategoryStatusEntry[]> {
  const userId = await requireUserId()

  // Workspace check
  const [project] = await db
    .select({ workspaceId: projects.workspaceId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)
  if (!project) return []

  const [member] = await db
    .select({ id: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaceMembers.workspaceId, project.workspaceId),
      ),
    )
    .limit(1)
  if (!member) return []

  // Phase 1: docs, audit log, and BoQ templates are independent of each
  // other and of the jobs query — fire them all in parallel so we collapse
  // ~3 sequential round trips into one.
  const [docs, savedRows, allBoqTemplates] = await Promise.all([
    db
      .select({
        id: documents.id,
        category: documents.category,
        filename: documents.filename,
        createdAt: documents.createdAt,
      })
      .from(documents)
      .where(
        and(
          eq(documents.projectId, projectId),
          eq(documents.targetKind, "project"),
          isNull(documents.deletedAt),
        ),
      )
      .orderBy(desc(documents.createdAt)),
    db
      .select({ action: auditLog.action, targetId: auditLog.targetId })
      .from(auditLog)
      .where(
        and(
          eq(auditLog.projectId, projectId),
          like(auditLog.action, "doc.save:%"),
        ),
      ),
    db
      .select({
        id: boqTemplates.id,
        sourceDocId: boqTemplates.sourceDocumentId,
        docCategory: documents.category,
      })
      .from(boqTemplates)
      .leftJoin(documents, eq(documents.id, boqTemplates.sourceDocumentId))
      .where(
        and(
          eq(boqTemplates.workspaceId, project.workspaceId),
          eq(boqTemplates.ownerKind, "project"),
          eq(boqTemplates.ownerId, projectId),
        ),
      ),
  ])

  const byCategory = new Map<string, (typeof docs)[number]>()
  for (const d of docs) {
    if (!byCategory.has(d.category)) byCategory.set(d.category, d)
  }

  const docIds = Array.from(byCategory.values()).map((d) => d.id)
  const jobs = await getLatestJobsForDocuments(docIds)

  // Look up the workflow_run.output for any succeeded job so we can hand back
  // the verdict for form prefill.
  const runIds = Array.from(
    new Set(
      Object.values(jobs)
        .map((j) => j.workflowRunId)
        .filter((id): id is string => Boolean(id)),
    ),
  )
  // Only pull the specific runs we'll show in the UI. Without the
  // inArray filter this scans every workflow_run in the workspace and
  // hydrates the (sometimes huge) output JSON for each — the page got
  // slower with every extraction the workspace accumulated.
  const runMap = new Map<string, Record<string, unknown>>()
  if (runIds.length > 0) {
    const rows = await db
      .select({
        id: workflowRuns.id,
        output: workflowRuns.output,
      })
      .from(workflowRuns)
      .where(
        and(
          eq(workflowRuns.workspaceId, project.workspaceId),
          inArray(workflowRuns.id, runIds),
        ),
      )
    for (const r of rows) {
      if (r.output) runMap.set(r.id, r.output as Record<string, unknown>)
    }
  }

  // savedRows + allBoqTemplates were fetched in the parallel batch above.
  // The "is this category saved?" map is keyed by spec.id; targetId is
  // the documentId — matching by document means new uploads correctly
  // re-surface the Review pill without time-based comparisons.
  const savedDocIdsByCategory = new Map<string, Set<string>>()
  for (const r of savedRows) {
    if (!r.targetId) continue
    const id = r.action.replace(/^doc\.save:/, "")
    let set = savedDocIdsByCategory.get(id)
    if (!set) {
      set = new Set()
      savedDocIdsByCategory.set(id, set)
    }
    set.add(r.targetId)
  }

  // BoQ + PTE live outside the AI extraction pipeline; tell them apart
  // via the joined document.category on each template's source doc.
  const boqTemplateRow = allBoqTemplates.find(
    (r) => r.docCategory === "Blank BOQ / Pricing Schedule",
  )
  const pteTemplateRow = allBoqTemplates.find(
    (r) => r.docCategory === "Pre-Tender Estimate",
  )

  async function summariseTemplate(
    templateId: string,
  ): Promise<{ itemsCreated: number; sectionsCreated: number } | null> {
    const [counts] = await db
      .select({
        items: sql<number>`count(*)::int`,
        sections: sql<number>`count(distinct section_id)::int`,
      })
      .from(boqItems)
      .where(eq(boqItems.templateId, templateId))
    return counts
      ? { itemsCreated: Number(counts.items), sectionsCreated: Number(counts.sections) }
      : null
  }

  const boqSummary = boqTemplateRow
    ? await summariseTemplate(boqTemplateRow.id)
    : null
  const pteSummary = pteTemplateRow
    ? await summariseTemplate(pteTemplateRow.id)
    : null

  // Addenda summary — how many addenda landed + how many events they
  // applied. Used to flip the Tender Addenda row out of "Empty" once
  // the user has run at least one addendum through.
  let addendaSummary: {
    addendaApplied: number
    eventsApplied: number
    latestNo: string | null
  } | null = null
  const addendaRows = await db
    .select({ id: tenderAddenda.id, no: tenderAddenda.no })
    .from(tenderAddenda)
    .where(eq(tenderAddenda.projectId, projectId))
    .orderBy(desc(tenderAddenda.createdAt))
  if (addendaRows.length > 0) {
    const [eventCount] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(tenderItemEvents)
      .where(
        and(
          eq(tenderItemEvents.projectId, projectId),
          eq(tenderItemEvents.sourceKind, "addendum"),
        ),
      )
    addendaSummary = {
      addendaApplied: addendaRows.length,
      eventsApplied: Number(eventCount?.n ?? 0),
      latestNo: addendaRows[0]?.no ?? null,
    }
  }

  const entries: CategoryStatusEntry[] = []
  for (const [rawCategory, doc] of byCategory) {
    // doc.category stores the human label ("Form of Tender"). The UI keys
    // status by spec.id ("fot"), so resolve via the registry.
    const spec = getDocSpec(rawCategory)
    const categoryId = spec ? spec.id : rawCategory
    const job = jobs[doc.id]
    const output = job?.workflowRunId ? runMap.get(job.workflowRunId) : undefined
    // The Review pill goes away once THIS document has been saved.
    // A re-upload creates a new document row, so its id won't be in the
    // saved-set and the pill re-appears automatically.
    const isSaved = Boolean(
      savedDocIdsByCategory.get(categoryId)?.has(doc.id),
    )
    // Compute the run's token totals + estimated cost (Sonnet 4.6 pricing).
    let runTotals: CategoryStatusEntry["runTotals"] = null
    const totals = (output as { totals?: Record<string, unknown> } | undefined)
      ?.totals
    if (totals && typeof totals === "object") {
      const i = Number(totals.input_tokens ?? 0)
      const o = Number(totals.output_tokens ?? 0)
      const cr = Number(totals.cache_read_tokens ?? 0)
      const cc = Number(totals.cache_create_tokens ?? 0)
      runTotals = {
        input_tokens: i,
        output_tokens: o,
        cache_read_tokens: cr,
        cache_create_tokens: cc,
        // Sonnet 4.6: $3 input, $15 output, $0.30 cache_read, $3.75 cache_create per MTok
        estimated_cost_usd: Number(
          ((i * 3 + o * 15 + cr * 0.3 + cc * 3.75) / 1_000_000).toFixed(4),
        ),
        cached: Boolean(
          (output as { cache_hit?: boolean } | undefined)?.cache_hit,
        ),
      }
    }

    // Override for BoQ-template, PTE, and Addenda: the AI pipeline
    // doesn't run for these, so we use template/addenda existence as
    // the "succeeded + saved" signal.
    const isBoq = categoryId === "boq-template"
    const isPte = categoryId === "pte"
    const isAddenda = categoryId === "addenda"
    const ownBoqSummary = isBoq ? boqSummary : isPte ? pteSummary : null
    const ownAddendaSummary = isAddenda ? addendaSummary : null
    const hasOwnState = Boolean(ownBoqSummary || ownAddendaSummary)
    const overrideJobStatus: CategoryStatusEntry["jobStatus"] = hasOwnState
      ? "succeeded"
      : ((job?.status as CategoryStatusEntry["jobStatus"]) ?? "none")
    const overrideIsSaved = hasOwnState ? true : isSaved

    entries.push({
      categoryId,
      documentId: doc.id,
      filename: doc.filename,
      jobStatus: overrideJobStatus,
      lastError: job?.lastError ?? null,
      workflowRunId: job?.workflowRunId ?? null,
      verdict: output?.verdict ?? null,
      isSaved: overrideIsSaved,
      runTotals,
      progress: (job?.progress as CategoryProgress | null) ?? null,
      boqImport: ownBoqSummary,
      addendaSummary: ownAddendaSummary,
    })
  }

  // Defensive synthesis: if state exists but the corresponding document
  // row got cleaned up, still surface the row in the UI.
  for (const [categoryId, summary] of [
    ["boq-template", boqSummary],
    ["pte", pteSummary],
  ] as const) {
    if (summary && !entries.find((e) => e.categoryId === categoryId)) {
      entries.push({
        categoryId,
        documentId: null,
        filename: null,
        jobStatus: "succeeded",
        lastError: null,
        workflowRunId: null,
        verdict: null,
        isSaved: true,
        runTotals: null,
        progress: null,
        boqImport: summary,
        addendaSummary: null,
      })
    }
  }
  if (addendaSummary && !entries.find((e) => e.categoryId === "addenda")) {
    entries.push({
      categoryId: "addenda",
      documentId: null,
      filename: null,
      jobStatus: "succeeded",
      lastError: null,
      workflowRunId: null,
      verdict: null,
      isSaved: true,
      runTotals: null,
      progress: null,
      boqImport: null,
      addendaSummary,
    })
  }
  return entries
}
