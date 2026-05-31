import { eq, sql } from "drizzle-orm"

import { db } from "@/modules/core/db"

import {
  extractionJobs,
  type ExtractionJob,
  type ExtractionJobPayload,
} from "./schema"

/**
 * Atomically claim one queued job using `FOR UPDATE SKIP LOCKED`.
 *
 * Runs as a single statement so it's safe with the neon-http driver
 * (which doesn't support multi-statement transactions).
 *
 * Returns the claimed row, or null if the queue is empty / all eligible
 * rows are being processed by other workers.
 */
export async function claimNextJob(workerId: string): Promise<ExtractionJob | null> {
  const result = await db.execute(sql`
    UPDATE px_extraction_job
    SET status = 'claimed',
        claimed_by = ${workerId},
        claimed_at = now(),
        started_at = now(),
        attempts = attempts + 1,
        updated_at = now()
    WHERE id = (
      SELECT id FROM px_extraction_job
      WHERE status = 'queued'
        AND (next_attempt_at IS NULL OR next_attempt_at <= now())
      ORDER BY priority ASC, created_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING *
  `)

  const rows = (result as unknown as { rows?: ExtractionJob[] }).rows
    ?? (result as unknown as ExtractionJob[])

  const row = Array.isArray(rows) ? rows[0] : undefined
  return row ?? null
}

export async function markRunning(jobId: string, workflowRunId: string): Promise<void> {
  await db
    .update(extractionJobs)
    .set({
      status: "running",
      workflowRunId,
      updatedAt: new Date(),
    })
    .where(eq(extractionJobs.id, jobId))
}

export async function markSucceeded(
  jobId: string,
  workflowRunId: string,
): Promise<void> {
  await db
    .update(extractionJobs)
    .set({
      status: "succeeded",
      workflowRunId,
      finishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(extractionJobs.id, jobId))
}

export async function markFailedOrRequeue(
  job: ExtractionJob,
  error: string,
): Promise<{ retry: boolean; nextAttemptAt: Date | null }> {
  const attemptsUsed = job.attempts // already incremented by claimNextJob
  const exhausted = attemptsUsed >= job.maxAttempts

  if (exhausted) {
    await db
      .update(extractionJobs)
      .set({
        status: "failed",
        lastError: error,
        finishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(extractionJobs.id, job.id))
    return { retry: false, nextAttemptAt: null }
  }

  // Exponential backoff: 30s, 2m, 8m
  const delaysSec = [30, 120, 480]
  const delaySec = delaysSec[Math.min(attemptsUsed - 1, delaysSec.length - 1)] ?? 60
  const nextAttemptAt = new Date(Date.now() + delaySec * 1000)

  await db
    .update(extractionJobs)
    .set({
      status: "queued",
      lastError: error,
      claimedBy: null,
      claimedAt: null,
      startedAt: null,
      nextAttemptAt,
      updatedAt: new Date(),
    })
    .where(eq(extractionJobs.id, job.id))

  return { retry: true, nextAttemptAt }
}

/**
 * Recover genuinely stuck claims: any 'claimed' or 'running' row whose
 * `updated_at` hasn't moved within the stale threshold gets pushed back
 * to 'queued'. Long-running agents are fine — they bump `updated_at` on
 * every iteration via writeProgress.
 *
 * Default 10-minute idle window catches crashed workers without
 * murdering legitimate long runs (e.g. COC with 50 iterations).
 */
export async function reclaimStuck(staleAfterMs = 10 * 60_000): Promise<number> {
  const cutoff = new Date(Date.now() - staleAfterMs)
  const result = await db.execute(sql`
    UPDATE px_extraction_job
    SET status = 'queued',
        claimed_by = NULL,
        claimed_at = NULL,
        started_at = NULL,
        updated_at = now(),
        last_error = COALESCE(last_error || E'\n', '') || 'reclaimed after stuck claim (no progress for ' || ${Math.round(staleAfterMs / 60_000)} || ' min)'
    WHERE status IN ('claimed','running')
      AND updated_at < ${cutoff.toISOString()}::timestamptz
    RETURNING id
  `)
  const rows = (result as unknown as { rows?: { id: string }[] }).rows
    ?? (result as unknown as { id: string }[])
  return Array.isArray(rows) ? rows.length : 0
}

export type { ExtractionJob, ExtractionJobPayload }
