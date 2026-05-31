import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core"

import { documents } from "@/modules/documents/schema"
import { workspaces } from "@/modules/workspace/schema"

export const extractionJobStatusEnum = pgEnum("extraction_job_status", [
  "queued",
  "claimed",
  "running",
  "succeeded",
  "failed",
])

/**
 * Persistent job queue for the document-extraction agent.
 *
 * The upload completion handler inserts rows with status='queued' and
 * returns immediately. A worker loop claims oldest queued jobs using
 * `FOR UPDATE SKIP LOCKED` (so two workers never grab the same row),
 * runs the extraction workflow, and marks success/failure.
 *
 * Concurrency = 1 by default (serial). Bumping it is a worker-side knob,
 * not a schema concern.
 */
export const extractionJobs = pgTable(
  "px_extraction_job",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: text("project_id"), // logical FK
    documentId: text("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),

    status: extractionJobStatusEnum("status").notNull().default("queued"),
    priority: integer("priority").notNull().default(100), // lower = higher priority
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),

    /** Snapshot of the document fields the worker needs (so we don't need to re-read). */
    payload: jsonb("payload").notNull(),

    /** Per-claim identifier (e.g. process id + random) — useful for stuck-job recovery. */
    claimedBy: text("claimed_by"),
    claimedAt: timestamp("claimed_at", { mode: "date" }),

    workflowRunId: text("workflow_run_id"),
    lastError: text("last_error"),

    /** Live agent progress, updated after each iteration. */
    progress: jsonb("progress"),

    startedAt: timestamp("started_at", { mode: "date" }),
    finishedAt: timestamp("finished_at", { mode: "date" }),
    nextAttemptAt: timestamp("next_attempt_at", { mode: "date" }),

    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    index("extraction_job_status_idx").on(t.status, t.priority, t.createdAt),
    index("extraction_job_document_idx").on(t.documentId),
    index("extraction_job_workspace_idx").on(t.workspaceId, t.createdAt),
    index("extraction_job_next_attempt_idx").on(t.nextAttemptAt),
  ],
)

export type ExtractionJob = typeof extractionJobs.$inferSelect
export type NewExtractionJob = typeof extractionJobs.$inferInsert
export type ExtractionJobStatus = (typeof extractionJobStatusEnum.enumValues)[number]

export interface ExtractionJobPayload {
  documentId: string
  blobUrl: string | null
  filename: string
  mimeType: string | null
  workspaceId: string
  projectId: string
  userId: string
  /**
   * Optional override of the spec id the worker should run against.
   * When unset, the worker falls back to looking up the spec from
   * `document.category` (the historical behaviour).
   *
   * Used by bidder uploads to run a SECOND agent — the `deviations`
   * spec — against a document whose primary category is e.g.
   * "Cover Letter" or "Form of Tender". Without this field the queue's
   * de-dupe (one open job per document) would block the secondary run.
   */
  specOverride?: string
  /** Optional bidder context — set on bidder_submission uploads so
   *  persistors can attribute output to the right tenderer. */
  tendererId?: string
}
