import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core"

import { users } from "@/modules/identity/schema"
import { workspaces } from "@/modules/workspace/schema"

/**
 * Polymorphic threaded comments. target_kind tells us what entity the
 * comment is anchored to (project, round, bidder, flag, deviation,
 * compliance_record, document, etc.). target_id is a logical pointer.
 */
export const comments = pgTable(
  "px_comment",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: text("project_id"),

    targetKind: text("target_kind").notNull(),
    targetId: text("target_id").notNull(),
    parentCommentId: text("parent_comment_id"),

    bodyMd: text("body_md").notNull(),
    attachments: jsonb("attachments"), // array of { documentId, filename }

    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { mode: "date" }),
  },
  (t) => [
    index("comment_workspace_idx").on(t.workspaceId, t.createdAt),
    index("comment_target_idx").on(t.targetKind, t.targetId, t.createdAt),
    index("comment_parent_idx").on(t.parentCommentId),
  ],
)

export type Comment = typeof comments.$inferSelect
export type NewComment = typeof comments.$inferInsert
