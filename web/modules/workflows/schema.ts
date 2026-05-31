import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core"

import { workspaces } from "@/modules/workspace/schema"

export const workflowRunStatusEnum = pgEnum("workflow_run_status", [
  "queued",
  "running",
  "succeeded",
  "failed",
])

/**
 * Tracks every durable workflow run (ingest, analyse, generate report,
 * etc.). UI polls or subscribes to these rows for progress.
 */
export const workflowRuns = pgTable(
  "px_workflow_run",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspace_id").references(() => workspaces.id, {
      onDelete: "cascade",
    }),
    projectId: text("project_id"),

    kind: text("kind").notNull(), // 'boq.ingest' | 'analysis.run' | 'reports.generate' | …
    status: workflowRunStatusEnum("status").notNull().default("queued"),

    input: jsonb("input"),
    output: jsonb("output"),
    error: text("error"),

    startedAt: timestamp("started_at", { mode: "date" }),
    finishedAt: timestamp("finished_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    index("workflow_run_kind_idx").on(t.kind),
    index("workflow_run_project_idx").on(t.projectId, t.createdAt),
    index("workflow_run_status_idx").on(t.status),
  ],
)

export type WorkflowRun = typeof workflowRuns.$inferSelect
export type NewWorkflowRun = typeof workflowRuns.$inferInsert
