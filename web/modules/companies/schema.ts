import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"

import { users } from "@/modules/identity/schema"
import { workspaces } from "@/modules/workspace/schema"

/**
 * Counterparty directory — companies you interact with. ProcureX calls
 * them tenderers; a sibling app may call them vendors or suppliers.
 * Same data, different vocabulary.
 */
export const companies = pgTable(
  "px_company",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    tradeName: text("trade_name"),
    country: text("country"),
    city: text("city"),
    trade: text("trade"),

    isActive: boolean("is_active").notNull().default(true),

    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { mode: "date" }),
  },
  (t) => [
    index("company_workspace_idx").on(t.workspaceId, t.createdAt),
  ],
)

export const companyContacts = pgTable(
  "px_company_contact",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    role: text("role"),
    isPrimary: boolean("is_primary").notNull().default(false),

    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    index("company_contact_company_idx").on(t.companyId),
    uniqueIndex("company_contact_company_email_uq").on(t.companyId, t.email),
  ],
)

export type Company = typeof companies.$inferSelect
export type NewCompany = typeof companies.$inferInsert
export type CompanyContact = typeof companyContacts.$inferSelect
export type NewCompanyContact = typeof companyContacts.$inferInsert
