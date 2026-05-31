import "server-only"

import { eq } from "drizzle-orm"
import { randomUUID } from "node:crypto"
import { hostname } from "node:os"

import { db } from "@/modules/core/db"
import { documents } from "@/modules/documents/schema"

import { extractDocumentWorkflow } from "@/modules/ai-extraction/workflows/extract-document"

import { publishProgress } from "./event-bus"
import { extractionJobs } from "./schema"

import {
  claimNextJob,
  markFailedOrRequeue,
  markRunning,
  markSucceeded,
  reclaimStuck,
  type ExtractionJob,
  type ExtractionJobPayload,
} from "./claim"

export interface DrainOptions {
  /** Max jobs to process in one drain (per HTTP call). */
  maxJobs?: number
  /** Max wall-clock budget for the whole drain. */
  maxDurationMs?: number
  /** Pre-drain: rescue jobs stuck in 'claimed'/'running' for this long. */
  staleAfterMs?: number
}

export interface DrainOutcome {
  drained: number
  succeeded: number
  failed: number
  requeued: number
  reclaimed: number
  results: Array<{
    jobId: string
    documentId: string
    status: "succeeded" | "failed" | "requeued"
    error?: string
    iterations?: number
  }>
}

export function makeWorkerId(): string {
  return `${hostname()}::${process.pid}::${randomUUID().slice(0, 8)}`
}

/**
 * Drain queued extraction jobs.
 *
 * Default behaviour: claim-and-run jobs serially (concurrency=1) until
 * either the queue is empty, `maxJobs` is reached, or `maxDurationMs` is
 * exceeded. Returns a structured summary the caller can log or render.
 *
 * Designed to be invoked from /api/worker/extraction (GET) or a Vercel
 * Cron — every call is idempotent and re-entrant.
 */
export async function drainExtractionQueue(
  options: DrainOptions = {},
): Promise<DrainOutcome> {
  const maxJobs = options.maxJobs ?? 25
  // 12 min leaves ~60s buffer under the route's 13-min Vercel function
  // ceiling. Large chunked docs (specification, big SOPR) need this much
  // to run to completion in one drain without being killed mid-extraction.
  const maxDurationMs = options.maxDurationMs ?? 720_000
  // Bump stale window to 20 min so the reclaimer doesn't yank a
  // legitimate long-running chunked job.
  const staleAfterMs = options.staleAfterMs ?? 20 * 60_000

  const workerId = makeWorkerId()
  const reclaimed = await reclaimStuck(staleAfterMs)

  const outcome: DrainOutcome = {
    drained: 0,
    succeeded: 0,
    failed: 0,
    requeued: 0,
    reclaimed,
    results: [],
  }

  const deadline = Date.now() + maxDurationMs

  while (outcome.drained < maxJobs && Date.now() < deadline) {
    const job = await claimNextJob(workerId)
    if (!job) break // queue empty

    outcome.drained += 1
    const summary = await runOneJob(job)
    outcome.results.push({
      jobId: job.id,
      documentId: job.documentId,
      ...summary,
    })

    if (summary.status === "succeeded") outcome.succeeded += 1
    else if (summary.status === "failed") outcome.failed += 1
    else if (summary.status === "requeued") outcome.requeued += 1
  }

  return outcome
}

interface RunOneJobResult {
  status: "succeeded" | "failed" | "requeued"
  error?: string
  iterations?: number
}

async function runOneJob(job: ExtractionJob): Promise<RunOneJobResult> {
  const payload = job.payload as ExtractionJobPayload

  // 1. Fetch the file bytes from the Blob URL
  if (!payload.blobUrl) {
    const result = await markFailedOrRequeue(job, "Job has no blob URL")
    return { status: result.retry ? "requeued" : "failed", error: "no blob URL" }
  }

  let buffer: Buffer
  try {
    if (payload.blobUrl.startsWith("file://")) {
      const { readFile } = await import("node:fs/promises")
      const localPath = payload.blobUrl.replace(/^file:\/\//, "")
      buffer = await readFile(localPath)
    } else {
      const res = await fetch(payload.blobUrl)
      if (!res.ok) throw new Error(`Blob fetch ${res.status}`)
      buffer = Buffer.from(await res.arrayBuffer())
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const result = await markFailedOrRequeue(job, `Blob fetch failed: ${message}`)
    return {
      status: result.retry ? "requeued" : "failed",
      error: `blob fetch: ${message}`,
    }
  }

  // 2. Run the workflow with a progress callback that updates the
  //    extraction_job row after every agent iteration. Best-effort —
  //    we never let a progress write failure crash the run.
  const writeProgress = async (event: {
    iteration: number
    maxIterations: number
    lastAction: string
    tools: string[]
    stopReason: string | null
    inputTokens?: number
    outputTokens?: number
    cacheReadTokens?: number
    cacheCreateTokens?: number
  }) => {
    const at = new Date().toISOString()
    // Publish to the SSE bus FIRST so subscribers see it without waiting
    // for the DB write to finish.
    publishProgress(
      payload.documentId,
      { type: "progress", ...event, at },
      payload.projectId,
    )
    try {
      await db
        .update(extractionJobs)
        .set({
          progress: { ...event, at },
          updatedAt: new Date(),
        })
        .where(eq(extractionJobs.id, job.id))
    } catch (err) {
      console.warn(`[worker] progress write failed for job ${job.id}`, err)
    }
  }

  try {
    const workflow = await extractDocumentWorkflow({
      documentId: payload.documentId,
      specOverride: payload.specOverride,
      buffer,
      filename: payload.filename,
      mimeType: payload.mimeType,
      context: {
        workspaceId: payload.workspaceId,
        projectId: payload.projectId,
        roundId: `${payload.projectId}::initial`,
        userId: payload.userId,
        documentId: payload.documentId,
        // The persistor needs to know which tenderer this bidder doc
        // belongs to so it can write the right `tender_deviation`
        // rows. Pull it from the document's target_id when scope is
        // bidder_submission — the upload route sets that.
        tendererId: (payload as { tendererId?: string }).tendererId,
      },
      onProgress: writeProgress,
    })

    if (workflow.workflowRunId) {
      await markRunning(job.id, workflow.workflowRunId)
    }

    if (workflow.ok) {
      await markSucceeded(job.id, workflow.workflowRunId)
      publishProgress(
        payload.documentId,
        {
          type: "done",
          status: "succeeded",
          at: new Date().toISOString(),
        },
        payload.projectId,
      )
      return { status: "succeeded", iterations: workflow.iterations }
    }

    // Workflow returned a non-ok result. Surface the error and decide.
    const result = await markFailedOrRequeue(
      job,
      workflow.error ?? "extraction failed",
    )

    // Some failures are terminal regardless of attempt count: wrong-slot,
    // validation failures, and partial-chunk drops won't resolve on a
    // retry (the chunk is still too large / the schema still rejects).
    const terminal =
      workflow.error?.startsWith("Wrong slot") ||
      workflow.error?.startsWith("Partial extraction") ||
      (workflow.validationErrors && workflow.validationErrors.length > 0) ||
      (workflow.coverageGaps && workflow.coverageGaps.length > 0)

    if (terminal) {
      // Force-set to failed (skip backoff retries)
      await db
        .update(documents)
        .set({ status: "rejected" })
        .where(eq(documents.id, payload.documentId))
      publishProgress(
        payload.documentId,
        {
          type: "done",
          status: "failed",
          error: workflow.error ?? "terminal failure",
          at: new Date().toISOString(),
        },
        payload.projectId,
      )
      return { status: "failed", error: workflow.error ?? "terminal failure" }
    }

    return {
      status: result.retry ? "requeued" : "failed",
      error: workflow.error,
      iterations: workflow.iterations,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const result = await markFailedOrRequeue(job, `Worker crash: ${message}`)
    return {
      status: result.retry ? "requeued" : "failed",
      error: `crash: ${message}`,
    }
  }
}
