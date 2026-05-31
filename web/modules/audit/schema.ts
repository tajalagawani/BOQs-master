import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core"

import { users } from "@/modules/identity/schema"
import { workspaces } from "@/modules/workspace/schema"

export const auditLog = pgTable(
  "px_audit_log",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspace_id").references(() => workspaces.id, {
      onDelete: "cascade",
    }),
    projectId: text("project_id"), // logical FK; project table comes in M2.1
    actorUserId: text("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    actorKind: text("actor_kind").notNull().default("user"), // user | bidder_token | system
    action: text("action").notNull(),
    targetKind: text("target_kind").notNull(),
    targetId: text("target_id"),
    payload: jsonb("payload"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    index("audit_workspace_idx").on(t.workspaceId, t.createdAt),
    index("audit_project_idx").on(t.projectId, t.createdAt),
    index("audit_target_idx").on(t.targetKind, t.targetId),
  ],
)

export type AuditLogRow = typeof auditLog.$inferSelect
export type NewAuditLog = typeof auditLog.$inferInsert
