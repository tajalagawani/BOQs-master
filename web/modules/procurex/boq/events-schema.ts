import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core"

import { boqItems } from "@/modules/boq/schema"
import { users } from "@/modules/identity/schema"
import { projects } from "@/modules/procurex/projects/schema"

/**
 * Append-only event log for BoQ line-item entities.
 *
 * Every change to an item — created by an import, repriced by a PTE,
 * amended by an addendum — lands here as one row. The "current
 * effective" state of any item = base `boq_item` row + replay of all
 * events for that `item_id` in `recorded_at` order.
 *
 * See docs/entity-model.md for the philosophy.
 */
export const tenderEventKind = pgEnum("tender_event_kind", [
  "created",
  "quantity_changed",
  "description_changed",
  "unit_changed",
  "priced",
  "withdrawn",
  "note",
])

export const tenderEventSourceKind = pgEnum("tender_event_source_kind", [
  "boq_import",
  "pte_import",
  "addendum",
  "manual",
])

export const tenderEventTargetKind = pgEnum("tender_event_target_kind", [
  "boq_item",
  "project_field",
  "project_phase",
  "responsibility_matrix_row",
  "compliance_record_template",
  "spec_section",
])

export const tenderItemEvents = pgTable(
  "px_tender_item_event",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    /** Item id is set only for `target_kind='boq_item'` events. Other
     *  target kinds (project_field, project_phase, …) leave this NULL
     *  and use `targetRef` instead. */
    itemId: text("item_id").references(() => boqItems.id, {
      onDelete: "cascade",
    }),
    /** What this event applies to. Defaults to 'boq_item' for back-
     *  compat with the original BoQ-only event model. */
    targetKind: tenderEventTargetKind("target_kind")
      .notNull()
      .default("boq_item"),
    /** Structured pointer to the target when `itemId` doesn't capture
     *  it. Examples:
     *    project_field    → { spec: 'coc', field: 'advancePaymentPercent' }
     *    project_phase    → { phaseId: 'P2' }
     *    responsibility_matrix_row → { rowId: '...' }
     */
    targetRef: jsonb("target_ref"),
    eventKind: tenderEventKind("event_kind").notNull(),
    sourceKind: tenderEventSourceKind("source_kind").notNull(),
    /** Logical id of the source — boq_template.id, addendum.id, etc. */
    sourceId: text("source_id"),
    /** Old + new values, kind-specific shape.
     *
     *   quantity_changed → { old: "244", new: "320" }
     *   priced           → { rate_cents: "500", amount_cents: "21134000", currency: "AED" }
     *   note             → { text: "..." }
     */
    payload: jsonb("payload"),
    /** When this event takes effect (may be backdated; defaults to now). */
    effectiveAt: timestamp("effective_at").defaultNow().notNull(),
    /** When it was recorded into the system. */
    recordedAt: timestamp("recorded_at").defaultNow().notNull(),
    recordedByUserId: text("recorded_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
  },
  (t) => [
    index("tender_item_event_project_item_idx").on(
      t.projectId,
      t.itemId,
      t.recordedAt,
    ),
    index("tender_item_event_source_idx").on(t.sourceKind, t.sourceId),
    index("tender_item_event_kind_idx").on(t.eventKind),
  ],
)

export type TenderItemEvent = typeof tenderItemEvents.$inferSelect
export type NewTenderItemEvent = typeof tenderItemEvents.$inferInsert
export type TenderEventKind = (typeof tenderEventKind.enumValues)[number]
export type TenderEventSourceKind =
  (typeof tenderEventSourceKind.enumValues)[number]
export type TenderEventTargetKind =
  (typeof tenderEventTargetKind.enumValues)[number]
