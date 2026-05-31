import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"

import { companies } from "@/modules/companies/schema"
import { users } from "@/modules/identity/schema"
import { projects } from "@/modules/procurex/projects/schema"

/**
 * Magic-link invitations for tenderers to access the bidder portal.
 * One row per outstanding invite; resends increment `resentCount` and
 * rotate the token hash.
 */
export const tendererInvites = pgTable(
  "px_tenderer_invite",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    magicTokenHash: text("magic_token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),

    sentAt: timestamp("sent_at", { mode: "date" }).defaultNow().notNull(),
    sentByUserId: text("sent_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    openedAt: timestamp("opened_at", { mode: "date" }),
    acceptedAt: timestamp("accepted_at", { mode: "date" }),

    resentCount: integer("resent_count").notNull().default(0),
    revokedAt: timestamp("revoked_at", { mode: "date" }),
  },
  (t) => [
    index("invite_project_idx").on(t.projectId),
    uniqueIndex("invite_project_company_uq").on(t.projectId, t.companyId),
  ],
)

export type TendererInvite = typeof tendererInvites.$inferSelect
export type NewTendererInvite = typeof tendererInvites.$inferInsert
