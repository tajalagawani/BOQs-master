import {
  bigint,
  boolean,
  index,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core"

import { boqItemRates, boqPricesets } from "@/modules/boq/schema"
import { users } from "@/modules/identity/schema"

export const baselineKindEnum = pgEnum("baseline_kind", [
  "avg_lowest_three",
  "median",
  "average",
  "reference",
])

export const analysisContextEnum = pgEnum("analysis_context", [
  "ptc",
  "tender",
  "internal",
])

export const unpricedStrategyEnum = pgEnum("unpriced_strategy", [
  "list_only",
  "avg_lowest_three",
  "normalise_avg",
  "normalise_pte",
])

export const flagKindEnum = pgEnum("flag_kind", [
  "high_rate",
  "low_rate",
  "unpriced",
  "arithmetical_error",
])

export const flagStatusEnum = pgEnum("flag_status", [
  "open",
  "answered",
  "accepted",
  "rejected",
])

export const analysisConfigs = pgTable(
  "px_analysis_config",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    ownerKind: text("owner_kind").notNull(), // 'round' | 'estimate' | …
    ownerId: text("owner_id").notNull(),
    context: analysisContextEnum("context").notNull(),

    baselineKind: baselineKindEnum("baseline_kind")
      .notNull()
      .default("avg_lowest_three"),
    referencePricesetId: text("reference_priceset_id").references(
      () => boqPricesets.id,
      { onDelete: "set null" },
    ),

    highThresholdPct: numeric("high_threshold_pct"),
    lowThresholdPct: numeric("low_threshold_pct"),
    highThresholdEnabled: boolean("high_threshold_enabled")
      .notNull()
      .default(true),
    lowThresholdEnabled: boolean("low_threshold_enabled")
      .notNull()
      .default(true),

    unpricedStrategy: unpricedStrategyEnum("unpriced_strategy").default(
      "list_only",
    ),
    unpricedQualityCheckEnabled: boolean("unpriced_quality_check_enabled")
      .notNull()
      .default(false),
    unpricedQualityCheckPct: numeric("unpriced_quality_check_pct"),

    sectionsEnabled: jsonb("sections_enabled"),

    updatedByUserId: text("updated_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [index("analysis_config_owner_idx").on(t.ownerKind, t.ownerId)],
)

export const flags = pgTable(
  "px_flag",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    pricesetId: text("priceset_id")
      .notNull()
      .references(() => boqPricesets.id, { onDelete: "cascade" }),
    itemRateId: text("item_rate_id")
      .notNull()
      .references(() => boqItemRates.id, { onDelete: "cascade" }),

    kind: flagKindEnum("kind").notNull(),
    baselineRateCents: bigint("baseline_rate_cents", { mode: "bigint" }),
    baselineKind: baselineKindEnum("baseline_kind"),
    variancePct: numeric("variance_pct"),

    qsQuestion: text("qs_question"),
    qsNote: text("qs_note"),
    includeInOutput: boolean("include_in_output").notNull().default(true),

    response: text("response"),
    status: flagStatusEnum("status").notNull().default("open"),

    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    index("flag_priceset_idx").on(t.pricesetId),
    index("flag_priceset_kind_idx").on(t.pricesetId, t.kind),
    index("flag_status_idx").on(t.status),
  ],
)

/**
 * Per-bidder submission for a round. Owned by procurex but referenced by
 * boq pricesets (priceset.ownerKind = 'submission' → ownerId = this row).
 */
export const tendererSubmissions = pgTable(
  "px_tenderer_submission",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    roundId: text("round_id").notNull(),
    tendererId: text("tenderer_id").notNull(),

    sourceDocumentId: text("source_document_id"),

    tenderSumCents: bigint("tender_sum_cents", { mode: "bigint" }),
    adjustedSumCents: bigint("adjusted_sum_cents", { mode: "bigint" }),
    variancePct: numeric("variance_pct"),

    pricedItems: numeric("priced_items").default("0"),
    unpricedItems: numeric("unpriced_items").default("0"),
    arithmeticalErrors: numeric("arithmetical_errors").default("0"),
    highRatesCount: numeric("high_rates_count").default("0"),
    lowRatesCount: numeric("low_rates_count").default("0"),

    status: text("status").notNull().default("pending"), // pending | uploaded | analysed | clarified | locked
    notes: text("notes"),

    submittedAt: timestamp("submitted_at", { mode: "date" }),
    analysedAt: timestamp("analysed_at", { mode: "date" }),
  },
  (t) => [
    index("submission_round_idx").on(t.roundId),
    index("submission_tenderer_idx").on(t.tendererId),
  ],
)

export type AnalysisConfig = typeof analysisConfigs.$inferSelect
export type Flag = typeof flags.$inferSelect
export type TendererSubmission = typeof tendererSubmissions.$inferSelect
export type BaselineKind = (typeof baselineKindEnum.enumValues)[number]
export type AnalysisContext = (typeof analysisContextEnum.enumValues)[number]
export type UnpricedStrategy = (typeof unpricedStrategyEnum.enumValues)[number]
export type FlagKind = (typeof flagKindEnum.enumValues)[number]

// ──────────────────────────────────────────────────────────────────────
// Phase A — deterministic per-bidder flags
// ──────────────────────────────────────────────────────────────────────

export const tenderFlagKindEnum = pgEnum("tender_flag_kind", [
  "variance",
  "high_rate",
  "low_rate",
  "unpriced",
  "arithmetical_error",
])

export const tenderFlags = pgTable(
  "px_tender_flag",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    tendererId: text("tenderer_id").notNull(),
    submissionId: text("submission_id").notNull(),
    itemId: text("item_id"),
    kind: tenderFlagKindEnum("kind").notNull(),
    severity: text("severity").notNull().default("info"),
    baselineMode: text("baseline_mode"),
    payload: jsonb("payload").notNull().default({}),
    computedAt: timestamp("computed_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("tender_flag_tenderer_idx").on(t.tendererId),
    index("tender_flag_submission_idx").on(t.submissionId),
    index("tender_flag_kind_idx").on(t.kind),
  ],
)

// ──────────────────────────────────────────────────────────────────────
// Phase C — AI-extracted commercial / technical / contractual deviations
// ──────────────────────────────────────────────────────────────────────

export const tenderDeviationKindEnum = pgEnum("tender_deviation_kind", [
  "commercial",
  "technical",
  "contractual",
])

export const tenderDeviations = pgTable(
  "px_tender_deviation",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    tendererId: text("tenderer_id").notNull(),
    submissionId: text("submission_id"),
    documentId: text("document_id"),
    kind: tenderDeviationKindEnum("kind").notNull(),
    clause: text("clause").notNull(),
    snippet: text("snippet"),
    severity: text("severity").notNull().default("minor"),
    agentRunId: text("agent_run_id"),
    payload: jsonb("payload").notNull().default({}),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("tender_deviation_tenderer_idx").on(t.tendererId),
    index("tender_deviation_document_idx").on(t.documentId),
    index("tender_deviation_kind_idx").on(t.kind),
  ],
)

export type TenderFlag = typeof tenderFlags.$inferSelect
export type TenderFlagKind = (typeof tenderFlagKindEnum.enumValues)[number]
export type TenderDeviation = typeof tenderDeviations.$inferSelect
export type TenderDeviationKind = (typeof tenderDeviationKindEnum.enumValues)[number]

// ──────────────────────────────────────────────────────────────────────
// Per-bidder per-compliance-section QS state captured during PTC review.
// One row per (tenderer, section). Persists the textarea + Include-in-PTC
// toggle that previously lived only in client state.
// ──────────────────────────────────────────────────────────────────────

export const tenderReviewRows = pgTable(
  "px_tender_review_row",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    tendererId: text("tenderer_id").notNull(),
    sectionKey: text("section_key").notNull(),
    qsComment: text("qs_comment"),
    includeInPtc: boolean("include_in_ptc").notNull().default(true),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
    updatedByUserId: text("updated_by_user_id"),
  },
  (t) => [
    index("tender_review_row_tenderer_idx").on(t.tendererId),
    index("tender_review_row_section_idx").on(t.sectionKey),
  ],
)

export type TenderReviewRow = typeof tenderReviewRows.$inferSelect
export type FlagStatus = (typeof flagStatusEnum.enumValues)[number]
