import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core"

import { users } from "@/modules/identity/schema"
import { workspaces } from "@/modules/workspace/schema"

export const projectStatusEnum = pgEnum("project_status", [
  "draft",
  "configured",
  "analysing",
  "review",
  "reported",
  "archived",
])

export const projectRoleEnum = pgEnum("project_role", [
  "owner",
  "qs",
  "viewer",
])

export const projects = pgTable(
  "px_project",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    status: projectStatusEnum("status").notNull().default("draft"),

    // Step 1 — Project Identity
    currency: text("currency"),
    city: text("city"),
    country: text("country"),
    projectType: text("project_type"),

    // Step 1 — Contract Details
    basisOfTender: text("basis_of_tender"),
    conditionsOfContract: text("conditions_of_contract"),
    gfa: numeric("gfa"),
    bua: numeric("bua"),
    budgetCents: bigint("budget_cents", { mode: "bigint" }),

    // Step 1 — People
    projectLeadUserId: text("project_lead_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    procurementLeadUserId: text("procurement_lead_user_id").references(
      () => users.id,
      { onDelete: "set null" },
    ),
    tenderCoordinatorUserId: text("tender_coordinator_user_id").references(
      () => users.id,
      { onDelete: "set null" },
    ),

    // Step 1 — Key Dates
    tenderIssuedAt: date("tender_issued_at"),
    originalReturnAt: date("original_return_at"),
    adjustedReturnAt: date("adjusted_return_at"),

    // From ITT
    requiredValidityDays: integer("required_validity_days"),
    ittAddendaCutoffDays: integer("itt_addenda_cutoff_days"),
    ittClarificationCutoffDays: integer("itt_clarification_cutoff_days"),
    vatTreatment: text("vat_treatment"), // 'exclusive' | 'inclusive'
    engineerName: text("engineer_name"),
    documentPriorityOrder: jsonb("document_priority_order"),
    approvedBondBanks: jsonb("approved_bond_banks"),
    alternativeTenderAllowed: boolean("alternative_tender_allowed")
      .notNull()
      .default(false),
    reraTrustAccountRequired: boolean("rera_trust_account_required")
      .notNull()
      .default(false),
    language: text("language").default("English"),

    // From COC — Particular Conditions
    contractForm: text("contract_form"),
    contractFormCode: text("contract_form_code"),
    contractFormVersion: text("contract_form_version"),
    contractSumCents: bigint("contract_sum_cents", { mode: "bigint" }),
    governingLaw: text("governing_law"),
    disputeForum: text("dispute_forum"),
    advancePaymentPercent: numeric("advance_payment_percent"),
    advancePaymentBondPercent: numeric("advance_payment_bond_percent"),
    performanceBondPercent: numeric("performance_bond_percent"),
    performanceBondRequired: boolean("performance_bond_required"),
    retentionPercent: numeric("retention_percent"),
    retentionCapCents: bigint("retention_cap_cents", { mode: "bigint" }),
    retentionCapPercent: numeric("retention_cap_percent"),
    ldPerDayCents: bigint("ld_per_day_cents", { mode: "bigint" }),
    ldCapCents: bigint("ld_cap_cents", { mode: "bigint" }),
    ldCapPercent: numeric("ld_cap_percent"),
    dlpMonths: integer("dlp_months"),
    decennialLiabilityYears: integer("decennial_liability_years"),
    fixedPrice: boolean("fixed_price"),

    // From SOPR + COC insurance appendices
    insuranceMinimums: jsonb("insurance_minimums"),
    workingHours: jsonb("working_hours"), // { startTime, endTime, weekendWork, nightWorkPermit }
    siteConditions: jsonb("site_conditions"),
    materialStandardsRequired: jsonb("material_standards_required"),
    bimRequirements: jsonb("bim_requirements"),
    earnedValueConfig: jsonb("earned_value_config"),
    hseRequirements: jsonb("hse_requirements"),
    sustainabilityConfig: jsonb("sustainability_config"),
    masterCommunityPolicy: jsonb("master_community_policy"),
    securityRequirements: jsonb("security_requirements"),
    reportingFrequency: text("reporting_frequency"),

    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { mode: "date" }),
  },
  (t) => [
    index("project_workspace_idx").on(t.workspaceId, t.createdAt),
    index("project_status_idx").on(t.workspaceId, t.status),
  ],
)

export const projectMembers = pgTable(
  "px_project_member",
  {
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: projectRoleEnum("role").notNull().default("qs"),
    joinedAt: timestamp("joined_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.projectId, t.userId] }),
    index("project_member_user_idx").on(t.userId),
  ],
)

export type Project = typeof projects.$inferSelect
export type NewProject = typeof projects.$inferInsert
export type ProjectStatus = (typeof projectStatusEnum.enumValues)[number]
export type ProjectRole = (typeof projectRoleEnum.enumValues)[number]
