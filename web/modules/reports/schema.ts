import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core"

import { users } from "@/modules/identity/schema"
import { workspaces } from "@/modules/workspace/schema"

export const reportArtefactStatusEnum = pgEnum("report_artefact_status", [
  "queued",
  "rendering",
  "ready",
  "failed",
])

/**
 * Immutable, generated PDF/Excel artefacts. Each generation creates a
 * new row + new Blob URL — never mutated in place. Used for PTC packs,
 * tender reports, Appendix A exports.
 */
export const reportArtefacts = pgTable(
  "px_report_artefact",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: text("project_id"),

    kind: text("kind").notNull(), // 'procurex.ptc-pack' | 'procurex.tender-report' | 'procurex.appendix-a' | …
    scope: jsonb("scope"), // { roundId, tendererId?, options? }
    templateKey: text("template_key").notNull(),

    blobUrl: text("blob_url"),
    blobPathname: text("blob_pathname"),
    mimeType: text("mime_type"),

    status: reportArtefactStatusEnum("status").notNull().default("queued"),
    error: text("error"),

    generatedAt: timestamp("generated_at", { mode: "date" }),
    generatedByUserId: text("generated_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    index("report_workspace_idx").on(t.workspaceId, t.createdAt),
    index("report_project_idx").on(t.projectId, t.createdAt),
    index("report_kind_idx").on(t.kind),
  ],
)

export type ReportArtefact = typeof reportArtefacts.$inferSelect
export type ReportArtefactStatus =
  (typeof reportArtefactStatusEnum.enumValues)[number]
