import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core"

import { boqItems } from "@/modules/boq/schema"
import { documents } from "@/modules/documents/schema"
import { users } from "@/modules/identity/schema"
import { projects } from "@/modules/procurex/projects/schema"

export const tenderAddendumStatus = pgEnum("tender_addendum_status", [
  "parsed",
  "applied",
  "withdrawn",
])

export const tenderAddendumFileKind = pgEnum("tender_addendum_file_kind", [
  "cover",
  "boq_full",
  "boq_sheet",
  "sopr_supplement",
  "spec",
  "drawing_ref",
  "qa_attachment",
  "screenshot",
  "password",
  "other",
])

export const tenderAddenda = pgTable(
  "px_tender_addendum",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    no: text("no").notNull(),
    issuedAt: date("issued_at"),
    status: tenderAddendumStatus("status").default("parsed").notNull(),
    coverFileId: text("cover_file_id"),
    introText: text("intro_text"),
    scopeSummary: jsonb("scope_summary"),
    sourceZipFilename: text("source_zip_filename"),
    sourceZipSha256: text("source_zip_sha256"),
    sourceDocumentId: text("source_document_id").references(
      () => documents.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    appliedAt: timestamp("applied_at"),
    appliedByUserId: text("applied_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
  },
  (t) => [index("tender_addendum_project_idx").on(t.projectId, t.issuedAt)],
)

export const tenderAddendumFiles = pgTable(
  "px_tender_addendum_file",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    addendumId: text("addendum_id")
      .notNull()
      .references(() => tenderAddenda.id, { onDelete: "cascade" }),
    kind: tenderAddendumFileKind("kind").notNull(),
    filename: text("filename").notNull(),
    relativePath: text("relative_path").notNull(),
    blobUrl: text("blob_url"),
    sizeBytes: bigint("size_bytes", { mode: "bigint" }),
    sha256: text("sha256"),
    isDrawing: boolean("is_drawing").notNull().default(false),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("tender_addendum_file_addendum_idx").on(t.addendumId, t.position)],
)

export const tenderAddendumQueries = pgTable(
  "px_tender_addendum_query",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    addendumId: text("addendum_id")
      .notNull()
      .references(() => tenderAddenda.id, { onDelete: "cascade" }),
    queryNo: text("query_no").notNull(),
    queryText: text("query_text").notNull(),
    referenceRaw: text("reference_raw"),
    referenceParsed: jsonb("reference_parsed"),
    resolvedItemId: text("resolved_item_id").references(() => boqItems.id, {
      onDelete: "set null",
    }),
    responseText: text("response_text"),
    derivedEvents: jsonb("derived_events"),
    applied: boolean("applied").default(false).notNull(),
    appliedAt: timestamp("applied_at"),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("tender_addendum_query_addendum_idx").on(t.addendumId, t.position)],
)

export type TenderAddendum = typeof tenderAddenda.$inferSelect
export type TenderAddendumFile = typeof tenderAddendumFiles.$inferSelect
export type TenderAddendumQuery = typeof tenderAddendumQueries.$inferSelect
