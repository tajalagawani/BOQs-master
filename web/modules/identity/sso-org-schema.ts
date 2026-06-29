import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

import { userRoleEnum, users } from "./schema"

/**
 * SSO org registry — the set of Microsoft Entra tenants allowed to sign in, and
 * the IOX role their users get. Managed by superadmins at /platform/sso-orgs and
 * read by the auth layer (modules/core/auth.ts) on every SSO sign-in.
 *
 * The IOX tenant is seeded as a `isPrimary` row (default role superadmin) and
 * cannot be deleted/disabled, so admins can never lock the org out of its own
 * portal.
 */
export const ssoOrgs = pgTable("px_sso_org", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  /** Microsoft Entra tenant id (GUID). Unique — one row per tenant. */
  tenantId: text("tenant_id").notNull().unique(),
  /** Human label shown in the admin UI, e.g. "Acme Corp". */
  name: text("name").notNull(),
  /** Email domains that belong to this org (used for display + fallback match). */
  allowedEmailDomains: text("allowed_email_domains")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  /** IOX role granted to this org's users on sign-in. */
  defaultRole: userRoleEnum("default_role").notNull().default("user"),
  /** Disabled orgs are kept for audit but cannot sign in / grant roles. */
  enabled: boolean("enabled").notNull().default(true),
  /** The IOX home tenant — locked: cannot be deleted or disabled. */
  isPrimary: boolean("is_primary").notNull().default(false),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
})

export type SsoOrg = typeof ssoOrgs.$inferSelect
export type NewSsoOrg = typeof ssoOrgs.$inferInsert
