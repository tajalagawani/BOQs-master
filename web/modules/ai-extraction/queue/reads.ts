import { desc, eq, inArray } from "drizzle-orm"

import { db } from "@/modules/core/db"

import { extractionJobs, type ExtractionJob } from "./schema"

/**
 * Latest extraction job per document — keyed by documentId.
 * The "latest" is by createdAt desc (most recently enqueued wins).
 */
export async function getLatestJobsForDocuments(
  documentIds: string[],
): Promise<Record<string, ExtractionJob>> {
  if (documentIds.length === 0) return {}

  const rows = await db
    .select()
    .from(extractionJobs)
    .where(inArray(extractionJobs.documentId, documentIds))
    .orderBy(desc(extractionJobs.createdAt))

  const out: Record<string, ExtractionJob> = {}
  for (const r of rows) {
    if (!out[r.documentId]) out[r.documentId] = r
  }
  return out
}

export async function getJobsForProject(projectId: string): Promise<ExtractionJob[]> {
  return db
    .select()
    .from(extractionJobs)
    .where(eq(extractionJobs.projectId, projectId))
    .orderBy(desc(extractionJobs.createdAt))
}

export async function getJobById(jobId: string): Promise<ExtractionJob | null> {
  const [row] = await db
    .select()
    .from(extractionJobs)
    .where(eq(extractionJobs.id, jobId))
    .limit(1)
  return row ?? null
}
