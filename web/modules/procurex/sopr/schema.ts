import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core"

import { projects } from "@/modules/procurex/projects/schema"

/**
 * SOPR-derived rows. The whole SOPR JSON also lives on
 * `document.extracted_data`, but the rows below are pulled out for
 * easy querying and for use as compliance-criterion seeds.
 */

export const projectPhases = pgTable(
  "px_project_phase",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    phaseId: text("phase_id").notNull(),
    name: text("name").notNull(),
    startMilestone: text("start_milestone"),
    finishMilestone: text("finish_milestone"),
    plotsCovered: jsonb("plots_covered"),
    accessConstraints: jsonb("access_constraints"),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("project_phase_project_idx").on(t.projectId, t.position)],
)

export const responsibilityMatrixRows = pgTable(
  "px_responsibility_matrix_row",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    category: text("category").notNull(), // "1. Safety & Site Environment"
    ref: text("ref").notNull(), // "1.7"
    itemLabel: text("item_label").notNull(),
    responsibleBy: jsonb("responsible_by").notNull(), // { gc, ps1, ps2, em, em_dc }
    pricingNote: text("pricing_note"),
    position: integer("position").notNull().default(0),
  },
  (t) => [
    index("resp_matrix_project_idx").on(t.projectId, t.position),
    index("resp_matrix_category_idx").on(t.category),
  ],
)

/**
 * Compliance criteria templated from SOPR / ITT / COC.
 * When a tenderer_submission is created, the analysis pipeline
 * spawns one compliance_record per template row.
 */
export const complianceRecordTemplates = pgTable(
  "px_compliance_record_template",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    sectionCode: text("section_code").notNull(), // 'A'..'J' / 'M' / 'A1' …
    criterionCode: text("criterion_code").notNull(),
    criterionLabel: text("criterion_label").notNull(),
    expectedValue: jsonb("expected_value"),
    sourceRef: text("source_ref"), // "SOPR §9.1" / "ITT Clause 8.1.A1"
    submissionMandatory: boolean("submission_mandatory")
      .notNull()
      .default(true),
    submissionWindow: text("submission_window"),
    formatRequired: text("format_required"),
    acceptanceCriterion: text("acceptance_criterion"),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    index("compliance_template_project_idx").on(t.projectId),
    index("compliance_template_section_idx").on(t.projectId, t.sectionCode),
  ],
)

/**
 * SOPR close-out items from Appendix J (one row per close-out
 * deliverable).
 */
export const projectCloseOutItems = pgTable(
  "px_project_close_out_item",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    appendixRef: text("appendix_ref"), // "J"
    itemId: text("item_id").notNull(),
    label: text("label").notNull(),
    format: text("format"),
    submissionWindowDays: integer("submission_window_days"),
    acceptanceCriterion: text("acceptance_criterion"),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("closeout_project_idx").on(t.projectId, t.position)],
)

export type ProjectPhase = typeof projectPhases.$inferSelect
export type ResponsibilityMatrixRow =
  typeof responsibilityMatrixRows.$inferSelect
export type ComplianceRecordTemplate =
  typeof complianceRecordTemplates.$inferSelect
export type ProjectCloseOutItem = typeof projectCloseOutItems.$inferSelect
