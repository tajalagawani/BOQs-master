import {
  bigint,
  boolean,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"

import { documents } from "@/modules/documents/schema"
import { users } from "@/modules/identity/schema"
import { workspaces } from "@/modules/workspace/schema"

export const boqTemplateOwnerKindEnum = pgEnum("boq_template_owner_kind", [
  "project",
  "workspace",
])

export const boqPricesetOwnerKindEnum = pgEnum("boq_priceset_owner_kind", [
  "submission",
  "estimate",
  "baseline",
])

export const boqTemplates = pgTable(
  "px_boq_template",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    ownerKind: boqTemplateOwnerKindEnum("owner_kind").notNull(),
    ownerId: text("owner_id").notNull(), // logical: project.id or workspace.id

    currency: text("currency"),

    /** Document this template was parsed from. Lets us answer
     *  "which template came from the empty-BoQ upload vs the PTE
     *  upload" without name pattern-matching. Null for library /
     *  hand-built templates. */
    sourceDocumentId: text("source_document_id").references(
      () => documents.id,
      { onDelete: "set null" },
    ),

    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    index("boq_template_owner_idx").on(t.ownerKind, t.ownerId),
    index("boq_template_source_doc_idx").on(t.sourceDocumentId),
  ],
)

export const boqPricingModeEnum = pgEnum("boq_pricing_mode", [
  "measured",
  "general_req",
])

export const boqSections = pgTable(
  "px_boq_section",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    templateId: text("template_id")
      .notNull()
      .references(() => boqTemplates.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
    no: text("no").notNull(),
    label: text("label").notNull(),
    pricingMode: boqPricingModeEnum("pricing_mode").notNull().default("measured"),
  },
  (t) => [
    index("boq_section_template_idx").on(t.templateId, t.position),
  ],
)

export const boqItems = pgTable(
  "px_boq_item",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    templateId: text("template_id")
      .notNull()
      .references(() => boqTemplates.id, { onDelete: "cascade" }),
    sectionId: text("section_id")
      .notNull()
      .references(() => boqSections.id, { onDelete: "cascade" }),
    no: text("no").notNull(),
    label: text("label").notNull(),
    unit: text("unit"),
    quantityPlanned: numeric("quantity_planned"),
    notes: text("notes"),
    /** Pointer to the `tender_item_event.id` that first created this
     *  entity. Lets us trace any item back to its origin in one hop. */
    entityOriginEventId: text("entity_origin_event_id"),
  },
  (t) => [
    index("boq_item_template_idx").on(t.templateId),
    uniqueIndex("boq_item_template_no_uq").on(t.templateId, t.no),
  ],
)

export const boqPricesets = pgTable(
  "px_boq_priceset",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    templateId: text("template_id")
      .notNull()
      .references(() => boqTemplates.id, { onDelete: "cascade" }),
    ownerKind: boqPricesetOwnerKindEnum("owner_kind").notNull(),
    ownerId: text("owner_id").notNull(), // logical: tenderer_submission.id | analysis_config.id | …
    label: text("label").notNull(),
    currency: text("currency"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    index("boq_priceset_owner_idx").on(t.ownerKind, t.ownerId),
    index("boq_priceset_template_idx").on(t.templateId),
  ],
)

export const boqItemRates = pgTable(
  "px_boq_item_rate",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    pricesetId: text("priceset_id")
      .notNull()
      .references(() => boqPricesets.id, { onDelete: "cascade" }),
    itemId: text("item_id")
      .notNull()
      .references(() => boqItems.id, { onDelete: "cascade" }),
    unitRateCents: bigint("unit_rate_cents", { mode: "bigint" }),
    amountCents: bigint("amount_cents", { mode: "bigint" }),
    isUnpriced: boolean("is_unpriced").notNull().default(false),
    isArithmeticalError: boolean("is_arithmetical_error")
      .notNull()
      .default(false),
    normalisedRateCents: bigint("normalised_rate_cents", { mode: "bigint" }),
  },
  (t) => [
    index("boq_item_rate_priceset_idx").on(t.pricesetId),
    uniqueIndex("boq_item_rate_priceset_item_uq").on(t.pricesetId, t.itemId),
  ],
)

export type BoqTemplate = typeof boqTemplates.$inferSelect
export type BoqSection = typeof boqSections.$inferSelect
export type BoqItem = typeof boqItems.$inferSelect
export type BoqPriceset = typeof boqPricesets.$inferSelect
export type BoqItemRate = typeof boqItemRates.$inferSelect
