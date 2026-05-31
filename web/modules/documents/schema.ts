import {
  bigint,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core"

import { users } from "@/modules/identity/schema"
import { workspaces } from "@/modules/workspace/schema"

export const documentStatusEnum = pgEnum("document_status", [
  "pending",
  "uploaded",
  "scanned",
  "rejected",
])

/**
 * Polymorphic, Blob-backed file pipeline. Any module attaches a document
 * to any entity by (target_kind, target_id). target_id is a logical
 * pointer (no DB-level FK) so the table is extraction-safe.
 *
 * scope examples (project-level): required | applicable | pte | ta | ptc
 * scope examples (tenderer-level): bidder_submission | ptc_response
 */
export const documents = pgTable(
  "px_document",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: text("project_id"), // logical FK; not enforced (project may live elsewhere later)

    targetKind: text("target_kind").notNull(), // 'project' | 'company' | 'submission' | 'round'
    targetId: text("target_id").notNull(),

    scope: text("scope").notNull(),
    category: text("category").notNull(),

    filename: text("filename").notNull(),
    mimeType: text("mime_type"),
    sizeBytes: bigint("size_bytes", { mode: "bigint" }),

    blobPathname: text("blob_pathname").notNull(),
    blobUrl: text("blob_url"),

    version: integer("version").notNull().default(1),
    status: documentStatusEnum("status").notNull().default("pending"),

    uploadedByUserId: text("uploaded_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    uploadedAt: timestamp("uploaded_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { mode: "date" }),
  },
  (t) => [
    index("document_workspace_idx").on(t.workspaceId, t.createdAt),
    index("document_project_idx").on(t.projectId, t.scope),
    index("document_target_idx").on(t.targetKind, t.targetId),
  ],
)

export type DocumentRow = typeof documents.$inferSelect
export type NewDocument = typeof documents.$inferInsert
export type DocumentStatus = (typeof documentStatusEnum.enumValues)[number]
