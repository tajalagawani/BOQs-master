import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core"

import { analysisConfigs, analysisContextEnum } from "@/modules/analysis/schema"
import { rounds } from "@/modules/procurex/revisions/schema"

/**
 * Wraps an `analysis_config` row with a round + context binding so a
 * single round can have separate configs for PTC vs Tender reports.
 */
export const roundConfigRefs = pgTable(
  "px_round_config_ref",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    roundId: text("round_id")
      .notNull()
      .references(() => rounds.id, { onDelete: "cascade" }),
    context: analysisContextEnum("context").notNull(),
    configId: text("config_id")
      .notNull()
      .references(() => analysisConfigs.id, { onDelete: "cascade" }),

    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    index("round_config_round_idx").on(t.roundId),
    uniqueIndex("round_config_round_context_uq").on(t.roundId, t.context),
  ],
)

export type RoundConfigRef = typeof roundConfigRefs.$inferSelect
