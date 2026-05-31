import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"

import { tendererSubmissions } from "@/modules/analysis/schema"
import { users } from "@/modules/identity/schema"
import { rounds } from "@/modules/procurex/revisions/schema"

export const complianceStatusEnum = pgEnum("compliance_status", [
  "compliant",
  "partial",
  "non_compliant",
  "missing",
])

export const deviationKindEnum = pgEnum("deviation_kind", [
  "contractual",
  "commercial",
  "technical",
])

export const deviationStatusEnum = pgEnum("deviation_status", [
  "open",
  "accepted",
  "rejected",
])

export const qualificationStatusEnum = pgEnum("qualification_status", [
  "claimed",
  "accepted",
  "rejected",
])

export const ptcPackStatusEnum = pgEnum("ptc_pack_status", [
  "draft",
  "issued",
  "responded",
])

export const tenderReportScopeEnum = pgEnum("tender_report_scope", [
  "executive",
  "full",
])

export const complianceRecords = pgTable(
  "px_compliance_record",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    submissionId: text("submission_id")
      .notNull()
      .references(() => tendererSubmissions.id, { onDelete: "cascade" }),
    sectionCode: text("section_code").notNull(), // 'A'..'J'
    criterionCode: text("criterion_code").notNull(),
    criterionLabel: text("criterion_label"),
    expectedValue: jsonb("expected_value"),
    actualValue: jsonb("actual_value"),
    status: complianceStatusEnum("status").notNull().default("missing"),
    qsComment: text("qs_comment"),
    includeInPtc: boolean("include_in_ptc").notNull().default(true),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    index("compliance_submission_idx").on(t.submissionId),
    uniqueIndex("compliance_submission_section_criterion_uq").on(
      t.submissionId,
      t.sectionCode,
      t.criterionCode,
    ),
  ],
)

export const deviations = pgTable(
  "px_deviation",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    submissionId: text("submission_id")
      .notNull()
      .references(() => tendererSubmissions.id, { onDelete: "cascade" }),
    kind: deviationKindEnum("kind").notNull(),
    ref: text("ref"),
    summary: text("summary").notNull(),
    detail: text("detail"),
    impactCents: bigint("impact_cents", { mode: "bigint" }),
    evidenceDocumentId: text("evidence_document_id"),
    qsNote: text("qs_note"),
    includeInPtc: boolean("include_in_ptc").notNull().default(true),
    status: deviationStatusEnum("status").notNull().default("open"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    index("deviation_submission_idx").on(t.submissionId),
    index("deviation_kind_idx").on(t.kind),
  ],
)

export const qualifications = pgTable(
  "px_qualification",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    submissionId: text("submission_id")
      .notNull()
      .references(() => tendererSubmissions.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    evidenceDocumentId: text("evidence_document_id"),
    status: qualificationStatusEnum("status").notNull().default("claimed"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [index("qualification_submission_idx").on(t.submissionId)],
)

export const ptcPacks = pgTable(
  "px_ptc_pack",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    roundId: text("round_id")
      .notNull()
      .references(() => rounds.id, { onDelete: "cascade" }),
    tendererId: text("tenderer_id").notNull(),
    blobUrl: text("blob_url"),
    generatedAt: timestamp("generated_at", { mode: "date" }).defaultNow().notNull(),
    generatedByUserId: text("generated_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    status: ptcPackStatusEnum("status").notNull().default("draft"),
    issuedAt: timestamp("issued_at", { mode: "date" }),
    respondedAt: timestamp("responded_at", { mode: "date" }),
  },
  (t) => [
    index("ptc_pack_round_idx").on(t.roundId),
    index("ptc_pack_tenderer_idx").on(t.tendererId),
  ],
)

export const tenderReports = pgTable(
  "px_tender_report",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    roundId: text("round_id")
      .notNull()
      .references(() => rounds.id, { onDelete: "cascade" }),
    scope: tenderReportScopeEnum("scope").notNull(),
    includeAppendices: boolean("include_appendices").notNull().default(true),
    blobUrl: text("blob_url"),
    generatedAt: timestamp("generated_at", { mode: "date" }).defaultNow().notNull(),
    generatedByUserId: text("generated_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
  },
  (t) => [index("tender_report_round_idx").on(t.roundId)],
)

export type ComplianceRecord = typeof complianceRecords.$inferSelect
export type Deviation = typeof deviations.$inferSelect
export type Qualification = typeof qualifications.$inferSelect
export type PtcPack = typeof ptcPacks.$inferSelect
export type TenderReport = typeof tenderReports.$inferSelect
export type ComplianceStatus = (typeof complianceStatusEnum.enumValues)[number]
export type DeviationKind = (typeof deviationKindEnum.enumValues)[number]
export type DeviationStatus = (typeof deviationStatusEnum.enumValues)[number]
