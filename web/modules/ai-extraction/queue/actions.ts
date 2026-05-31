"use server"

import { and, desc, eq, inArray, isNull } from "drizzle-orm"

import { requireUserId } from "@/modules/core/auth"
import { db } from "@/modules/core/db"
import { documents } from "@/modules/documents/schema"
import { workspaceMembers } from "@/modules/workspace/schema"

import { getLatestJobsForDocuments } from "./reads"
import { extractionJobs, type ExtractionJob } from "./schema"

export interface ExtractionProgress {
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

export interface ExtractionStatusEntry {
  documentId: string
  jobId: string | null
  status: ExtractionJob["status"] | "none"
  attempts: number
  maxAttempts: number
  lastError: string | null
  startedAt: Date | null
  finishedAt: Date | null
  workflowRunId: string | null
  progress: ExtractionProgress | null
}

/**
 * Read the latest extraction-job state for a set of documents. The UI
 * polls this (every ~2s while jobs are in flight) so the per-document
 * status badge stays live without a websocket.
 */
export async function getExtractionStatus(
  documentIds: string[],
): Promise<ExtractionStatusEntry[]> {
  await requireUserId()
  if (documentIds.length === 0) return []

  const jobs = await getLatestJobsForDocuments(documentIds)

  return documentIds.map((id) => {
    const j = jobs[id]
    if (!j) {
      return {
        documentId: id,
        jobId: null,
        status: "none",
        attempts: 0,
        maxAttempts: 0,
        lastError: null,
        startedAt: null,
        finishedAt: null,
        workflowRunId: null,
        progress: null,
      }
    }
    return {
      documentId: id,
      jobId: j.id,
      status: j.status,
      attempts: j.attempts,
      maxAttempts: j.maxAttempts,
      lastError: j.lastError,
      startedAt: j.startedAt,
      finishedAt: j.finishedAt,
      workflowRunId: j.workflowRunId,
      progress: (j.progress as ExtractionProgress | null) ?? null,
    }
  })
}

export interface InFlightUpload {
  documentId: string
  filename: string
  category: string
  /** Best human guess at agent state. */
  jobStatus: ExtractionJob["status"]
  lastError: string | null
  progress: ExtractionProgress | null
  createdAt: Date
}

/**
 * Return every document in this project whose extraction is currently
 * in flight (queued / claimed / running). Used to repopulate the bulk
 * uploader on page reload so the user doesn't think their work was
 * lost.
 */
export async function getInFlightUploads(
  projectId: string,
): Promise<InFlightUpload[]> {
  await requireUserId()
  if (!projectId) return []

  const docs = await db
    .select({
      id: documents.id,
      filename: documents.filename,
      category: documents.category,
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
    .orderBy(desc(documents.createdAt))
    .limit(50)

  if (docs.length === 0) return []

  const docIds = docs.map((d) => d.id)
  const jobs = await db
    .select()
    .from(extractionJobs)
    .where(
      and(
        inArray(extractionJobs.documentId, docIds),
        inArray(extractionJobs.status, ["queued", "claimed", "running"]),
      ),
    )
  // Map: latest in-flight job per documentId.
  const jobByDoc = new Map<string, (typeof jobs)[number]>()
  for (const j of jobs) {
    const existing = jobByDoc.get(j.documentId)
    if (!existing || existing.createdAt < j.createdAt) {
      jobByDoc.set(j.documentId, j)
    }
  }

  const out: InFlightUpload[] = []
  for (const d of docs) {
    const j = jobByDoc.get(d.id)
    if (!j) continue
    out.push({
      documentId: d.id,
      filename: d.filename,
      category: d.category,
      jobStatus: j.status,
      lastError: j.lastError,
      progress: (j.progress as ExtractionProgress | null) ?? null,
      createdAt: d.createdAt,
    })
  }
  return out
}

async function assertJobOwnership(jobId: string, userId: string): Promise<ExtractionJob> {
  const [job] = await db
    .select()
    .from(extractionJobs)
    .where(eq(extractionJobs.id, jobId))
    .limit(1)
  if (!job) throw new Error("Job not found")

  const [member] = await db
    .select({ id: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaceMembers.workspaceId, job.workspaceId),
      ),
    )
    .limit(1)
  if (!member) throw new Error("FORBIDDEN")

  return job
}

/**
 * Requeue a failed job — resets status to 'queued', clears lastError,
 * resets attempts to 0 so the worker picks it up fresh.
 */
export async function retryExtractionJob(jobId: string): Promise<{ ok: boolean }> {
  const userId = await requireUserId()
  const job = await assertJobOwnership(jobId, userId)

  if (job.status !== "failed" && job.status !== "succeeded") {
    throw new Error(`Cannot retry job in status '${job.status}'`)
  }

  await db
    .update(extractionJobs)
    .set({
      status: "queued",
      attempts: 0,
      claimedBy: null,
      claimedAt: null,
      startedAt: null,
      finishedAt: null,
      nextAttemptAt: null,
      lastError: null,
      updatedAt: new Date(),
    })
    .where(eq(extractionJobs.id, jobId))

  await db
    .update(documents)
    .set({ status: "uploaded" })
    .where(eq(documents.id, job.documentId))

  return { ok: true }
}

/**
 * Cancel a queued (or stuck) job. Use when the user wants to abort an
 * extraction before it picks up.
 */
/**
 * Reset a category for a project — soft-deletes every document attached
 * to that category, cancels any in-flight extraction jobs, and clears
 * the persisted workflow_run output. After this the accordion shows
 * "Empty" and the user can upload a fresh file.
 *
 * Workspace membership is verified through the project lookup.
 */
export async function resetCategoryForProject(input: {
  projectId: string
  category: string
}): Promise<{ ok: boolean; documentsAffected: number; jobsCancelled: number }> {
  const userId = await requireUserId()
  // Workspace check via the project's workspace
  const docs = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.projectId, input.projectId),
        eq(documents.category, input.category),
        eq(documents.targetKind, "project"),
      ),
    )
  if (docs.length === 0) {
    return { ok: true, documentsAffected: 0, jobsCancelled: 0 }
  }

  const workspaceId = docs[0]!.workspaceId
  const [member] = await db
    .select({ id: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaceMembers.workspaceId, workspaceId),
      ),
    )
    .limit(1)
  if (!member) throw new Error("FORBIDDEN")

  const docIds = docs.map((d) => d.id)
  // Cancel in-flight jobs for these docs.
  const cancelled = await db
    .update(extractionJobs)
    .set({
      status: "failed",
      lastError: "cancelled by user (reset)",
      finishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(inArray(extractionJobs.documentId, docIds))
    .returning({ id: extractionJobs.id })

  // Soft-delete the documents so they no longer surface in the
  // accordion / category-status read paths.
  await db
    .update(documents)
    .set({ deletedAt: new Date(), status: "rejected" })
    .where(inArray(documents.id, docIds))

  return {
    ok: true,
    documentsAffected: docIds.length,
    jobsCancelled: cancelled.length,
  }
}

export async function cancelExtractionJob(jobId: string): Promise<{ ok: boolean }> {
  const userId = await requireUserId()
  const job = await assertJobOwnership(jobId, userId)

  if (job.status === "succeeded" || job.status === "failed") {
    return { ok: true } // already terminal
  }

  await db
    .update(extractionJobs)
    .set({
      status: "failed",
      lastError: "cancelled by user",
      finishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(extractionJobs.id, jobId))

  return { ok: true }
}

/**
 * Kill all in-flight extraction jobs for a category in a project — no
 * soft-delete of the documents (unlike reset). The document row stays;
 * its extraction can be re-queued later.
 */
export async function killJobsForCategory(input: {
  projectId: string
  category: string
}): Promise<{ ok: boolean; jobsKilled: number }> {
  const userId = await requireUserId()
  const docs = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.projectId, input.projectId),
        eq(documents.category, input.category),
        eq(documents.targetKind, "project"),
      ),
    )
  if (docs.length === 0) return { ok: true, jobsKilled: 0 }

  const workspaceId = docs[0]!.workspaceId
  const [member] = await db
    .select({ id: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaceMembers.workspaceId, workspaceId),
      ),
    )
    .limit(1)
  if (!member) throw new Error("FORBIDDEN")

  const killed = await db
    .update(extractionJobs)
    .set({
      status: "failed",
      lastError: "killed by user",
      finishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        inArray(
          extractionJobs.documentId,
          docs.map((d) => d.id),
        ),
        inArray(extractionJobs.status, ["queued", "claimed", "running"]),
      ),
    )
    .returning({ id: extractionJobs.id })

  return { ok: true, jobsKilled: killed.length }
}

/**
 * Kill EVERY in-flight extraction job in the project. One query.
 */
export async function killAllJobsForProject(input: {
  projectId: string
}): Promise<{ ok: boolean; jobsKilled: number }> {
  const userId = await requireUserId()

  const [proj] = await db
    .select({ workspaceId: documents.workspaceId })
    .from(documents)
    .where(eq(documents.projectId, input.projectId))
    .limit(1)
  if (!proj) return { ok: true, jobsKilled: 0 }

  const [member] = await db
    .select({ id: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaceMembers.workspaceId, proj.workspaceId),
      ),
    )
    .limit(1)
  if (!member) throw new Error("FORBIDDEN")

  const killed = await db
    .update(extractionJobs)
    .set({
      status: "failed",
      lastError: "killed by user (kill all)",
      finishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(extractionJobs.projectId, input.projectId),
        inArray(extractionJobs.status, ["queued", "claimed", "running"]),
      ),
    )
    .returning({ id: extractionJobs.id })

  return { ok: true, jobsKilled: killed.length }
}
