import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"

import { companies } from "@/modules/companies/schema"
import { users } from "@/modules/identity/schema"
import { projects } from "@/modules/procurex/projects/schema"

/**
 * Step 3 — Tenderer roster.
 *
 * One row per company invited to bid on a given tender. The bidder
 * portal, invite email flow, and per-tenderer document slots all hang
 * off this table. See docs/STEP3_PLAN.md for the surrounding plan.
 *
 * Distinct from `tenderer_invite` (modules/procurex/portal): the invite
 * row is the *messaging* artefact (magic link, sentAt, openedAt). The
 * `tenderer` row is the *roster entry* (project membership + workflow
 * status + ranking).
 */
export const tendererStatusEnum = pgEnum("tenderer_status", [
  "pending", // draft created, no invite sent, no QS-upload flagged
  "invited", // invite email dispatched
  "opened", // bidder opened the portal at least once
  "submitted", // all required docs received + extracted
  "withdrawn", // bidder declined
])

export const tenderers = pgTable(
  "px_tenderer",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "restrict" }),

    /** Stable identifier shown in the UI ("T1", "T2", …). Unique per project. */
    code: text("code").notNull(),
    contactName: text("contact_name").notNull(),
    contactEmail: text("contact_email").notNull(),
    contactPhone: text("contact_phone"),

    status: tendererStatusEnum("status").notNull().default("pending"),

    invitedAt: timestamp("invited_at", { mode: "date" }),
    invitedByUserId: text("invited_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    submittedAt: timestamp("submitted_at", { mode: "date" }),
    withdrawnAt: timestamp("withdrawn_at", { mode: "date" }),

    /** True when QS is uploading on bidder's behalf — no email sent. */
    qsUpload: boolean("qs_upload").notNull().default(false),

    /** Populated after Step 5 analysis. */
    rankInitial: integer("rank_initial"),
    rankCurrent: integer("rank_current"),

    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { mode: "date" }),
  },
  (t) => [
    index("tenderer_project_idx").on(t.projectId, t.createdAt),
    // Per-project uniqueness — partial indexes so soft-deleted rows free up the slot.
    uniqueIndex("tenderer_project_code_uq")
      .on(t.projectId, t.code)
      .where(sql`${t.deletedAt} IS NULL`),
    uniqueIndex("tenderer_project_company_uq")
      .on(t.projectId, t.companyId)
      .where(sql`${t.deletedAt} IS NULL`),
  ],
)

// NOTE: `tendererSubmissions` (the per-round submission shell with
// analysis fields like `adjustedSumCents` / `variancePct` / etc.) is
// owned by `modules/analysis/schema.ts` — that table predates this
// module and is shared by the rate-analysis pipeline downstream. The
// 0008 migration only adds a real FK linking it to this new `tenderer`
// row; no duplicate schema declaration here.

export type Tenderer = typeof tenderers.$inferSelect
export type NewTenderer = typeof tenderers.$inferInsert
export type TendererStatus = (typeof tendererStatusEnum.enumValues)[number]

// Local import for the SQL template used in the partial-unique-index .where().
// Kept at the bottom so the table definitions above read top-down.
import { sql } from "drizzle-orm"
