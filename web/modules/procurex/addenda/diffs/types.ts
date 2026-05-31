/**
 * Shared types for spec-aware diffing.
 *
 * The per-spec implementations (./fot.ts, ./itt.ts, ./coc.ts, ./sopr.ts)
 * each expose a `loadCurrent` + `diff` + `applyEvents` triple that lets
 * the addenda pipeline:
 *
 *   1. Read the project's CURRENT state for that spec
 *   2. Compare it against a fresh verdict from the extraction agent
 *   3. Produce a list of proposed field-level events
 *   4. Write confirmed events + (optionally) mutate the project columns
 */

import type { TenderEventTargetKind } from "@/modules/procurex/boq/events-schema"

export type ProposedFieldKind =
  | "field_changed"
  | "field_added"
  | "field_removed"
  | "row_added"
  | "row_removed"
  | "row_changed"

export interface ProposedFieldEvent {
  /** Where this event lands — project column, child row, etc. */
  targetKind: TenderEventTargetKind
  /** Structured pointer the apply step uses to find the right row /
   *  field. Schema-specific. Examples:
   *    { spec: 'fot', field: 'currency' }
   *    { spec: 'sopr', child: 'phases', rowKey: 'P2' }
   */
  targetRef: Record<string, unknown>
  /** What kind of change. */
  eventKind: ProposedFieldKind
  /** Old + new values for the field/row. */
  payload: {
    old?: unknown
    new?: unknown
    label?: string
  }
  /** A short human description rendered in the wizard. */
  label: string
  /** Snippet of evidence (e.g. the field name + change summary). */
  evidence?: string
  /** Parser confidence 0..1 — lower means user should review more carefully. */
  confidence: number
}

export interface SpecDiffer<TVerdict> {
  /** Read the project's currently-persisted state into the verdict shape. */
  loadCurrent(projectId: string): Promise<Partial<TVerdict>>
  /** Compute the field-level diff. */
  diff(current: Partial<TVerdict>, next: TVerdict): ProposedFieldEvent[]
  /** Apply confirmed events — writes to tender_item_event AND mutates
   *  the project columns (audit + apply mode). */
  applyEvents(
    projectId: string,
    events: ProposedFieldEvent[],
    addendumId: string,
    userId: string,
  ): Promise<void>
}
