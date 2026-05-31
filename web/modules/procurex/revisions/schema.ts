import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"

import { users } from "@/modules/identity/schema"
import { projects } from "@/modules/procurex/projects/schema"

export const roundKeyEnum = pgEnum("round_key", [
  "initial",
  "ptc1",
  "ptc2",
  "ptc3",
])

export const roundStatusEnum = pgEnum("round_status", [
  "open",
  "analysing",
  "review",
  "issued",
  "locked",
])

export const revisions = pgTable(
  "px_revision",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),

    label: text("label").notNull(), // "Revision 0 — Initial Submission"
    position: integer("position").notNull().default(0),

    openedAt: timestamp("opened_at", { mode: "date" }).defaultNow().notNull(),
    closedAt: timestamp("closed_at", { mode: "date" }),
  },
  (t) => [
    index("revision_project_idx").on(t.projectId, t.position),
    uniqueIndex("revision_project_position_uq").on(t.projectId, t.position),
  ],
)

export const rounds = pgTable(
  "px_round",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    revisionId: text("revision_id")
      .notNull()
      .references(() => revisions.id, { onDelete: "cascade" }),

    key: roundKeyEnum("key").notNull(),
    label: text("label").notNull(),
    status: roundStatusEnum("status").notNull().default("open"),

    openedAt: timestamp("opened_at", { mode: "date" }).defaultNow().notNull(),
    issuedAt: timestamp("issued_at", { mode: "date" }),
    lockedAt: timestamp("locked_at", { mode: "date" }),

    signedOffByUserId: text("signed_off_by_user_id").references(
      () => users.id,
      { onDelete: "set null" },
    ),
    signedOffAt: timestamp("signed_off_at", { mode: "date" }),
  },
  (t) => [
    uniqueIndex("round_revision_key_uq").on(t.revisionId, t.key),
    index("round_status_idx").on(t.status),
  ],
)

export type Revision = typeof revisions.$inferSelect
export type NewRevision = typeof revisions.$inferInsert
export type Round = typeof rounds.$inferSelect
export type NewRound = typeof rounds.$inferInsert
export type RoundKey = (typeof roundKeyEnum.enumValues)[number]
export type RoundStatus = (typeof roundStatusEnum.enumValues)[number]
