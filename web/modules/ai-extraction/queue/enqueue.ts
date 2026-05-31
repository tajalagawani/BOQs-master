import { and, eq, inArray } from "drizzle-orm"

import { db } from "@/modules/core/db"

import {
  extractionJobs,
  type ExtractionJob,
  type ExtractionJobPayload,
} from "./schema"

export interface EnqueueExtractionInput {
  payload: ExtractionJobPayload
  priority?: number
  maxAttempts?: number
}

/**
 * Insert (or de-duplicate) one extraction job. If an open job already
 * exists for the same documentId, the existing one is returned — uploads
 * that re-fire the completion webhook never double-enqueue.
 */
export async function enqueueExtraction(
  input: EnqueueExtractionInput,
): Promise<ExtractionJob> {
  // De-dupe key is (documentId, specOverride ?? null). A bidder doc
  // can have at most ONE open job per spec — so the primary
  // category-derived run and a secondary deviations run coexist
  // without colliding.
  const existing = await db
    .select()
    .from(extractionJobs)
    .where(
      and(
        eq(extractionJobs.documentId, input.payload.documentId),
        inArray(extractionJobs.status, ["queued", "claimed", "running"]),
      ),
    )
  const sameSpec = existing.find(
    (j) =>
      ((j.payload as { specOverride?: string } | null)?.specOverride ?? null) ===
      (input.payload.specOverride ?? null),
  )
  if (sameSpec) return sameSpec

  const [row] = await db
    .insert(extractionJobs)
    .values({
      workspaceId: input.payload.workspaceId,
      projectId: input.payload.projectId || null,
      documentId: input.payload.documentId,
      status: "queued",
      priority: input.priority ?? 100,
      // No requeue. One attempt, surface the error. Bumping this back
      // to 3 restores the original requeue-with-backoff behaviour.
      maxAttempts: input.maxAttempts ?? 1,
      payload: input.payload,
    })
    .returning()

  if (!row) throw new Error("enqueueExtraction: insert returned no row")
  return row
}
