import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core"

import { projects } from "@/modules/procurex/projects/schema"

export const specDisciplineEnum = pgEnum("spec_discipline", [
  "architectural",
  "landscape",
  "structural",
  "mep",
  "civil",
  "combined",
])

export const specFormatEnum = pgEnum("spec_format", [
  "csi-masterformat",
  "nbs",
  "bespoke",
])

export const specificationDocs = pgTable(
  "px_specification_doc",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    documentId: text("document_id"),
    discipline: specDisciplineEnum("discipline").notNull(),
    author: text("author"),
    issuedAt: text("issued_at"),
    version: text("version"),
    format: specFormatEnum("format").notNull().default("csi-masterformat"),
    projectCode: text("project_code"),
    sectionsTotal: integer("sections_total"),
    divisionsUsed: jsonb("divisions_used"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [index("spec_doc_project_idx").on(t.projectId)],
)

export const specificationSections = pgTable(
  "px_specification_section",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    specDocId: text("spec_doc_id")
      .notNull()
      .references(() => specificationDocs.id, { onDelete: "cascade" }),
    csiCode: text("csi_code").notNull(),
    csiDivision: text("csi_division").notNull(),
    title: text("title").notNull(),
    pageCount: integer("page_count"),
    references: jsonb("references"),
    relatedSections: jsonb("related_sections"),
    submittals: jsonb("submittals"),
    warranty: jsonb("warranty"),
    part1Text: text("part1_text"),
    part2Text: text("part2_text"),
    part3Text: text("part3_text"),
  },
  (t) => [index("spec_section_doc_idx").on(t.specDocId, t.csiCode)],
)

export const specificationApprovedManufacturers = pgTable(
  "px_specification_approved_manufacturer",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    specDocId: text("spec_doc_id")
      .notNull()
      .references(() => specificationDocs.id, { onDelete: "cascade" }),
    sectionCode: text("section_code"),
    product: text("product").notNull(),
    manufacturer: text("manufacturer").notNull(),
    model: text("model"),
    countryOfOrigin: text("country_of_origin"),
    alternatives: jsonb("alternatives"),
  },
  (t) => [index("spec_mfr_doc_idx").on(t.specDocId)],
)

export type SpecificationDoc = typeof specificationDocs.$inferSelect
export type SpecificationSection = typeof specificationSections.$inferSelect
export type SpecificationApprovedManufacturer =
  typeof specificationApprovedManufacturers.$inferSelect
