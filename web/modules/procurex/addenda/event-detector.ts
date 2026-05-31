import "server-only"

import type { ParsedQuery } from "./attachment-a"

/**
 * Conservative event detector — pattern-matches the consultant's
 * response text to surface proposed entity events.
 *
 * Default state in the modal: every detected event is UNCHECKED.
 * The user must explicitly confirm before the event lands in
 * tender_item_event.
 *
 * We deliberately favour false-negatives over false-positives — better
 * to miss a subtle change than to apply one that wasn't intended.
 */

export interface ProposedEvent {
  /** "withdrawn" | "description_changed" | "quantity_changed" | "note" */
  eventKind: "withdrawn" | "description_changed" | "quantity_changed" | "note"
  /** Free-form payload — kind-specific. */
  payload: Record<string, unknown>
  /** Snippet of the response that triggered this proposal. */
  evidence: string
  /** Parser confidence 0..1 — lower means user should review more carefully. */
  confidence: number
  /** When the response mentions a substituted *new* item, that label
   *  arrives here. The modal can offer to create a sibling entity. */
  substitution?: { newLabel: string } | undefined
}

const PATTERNS: Array<{
  rx: RegExp
  build: (m: RegExpMatchArray) => ProposedEvent[]
}> = [
  // "LA-05a have been omitted" / "is omitted"
  {
    rx: /([A-Z][A-Z0-9-]*)\s+(?:have\s+been|is)\s+(?:omitted|deleted|withdrawn)/i,
    build: (m) => [
      {
        eventKind: "withdrawn",
        payload: { reason: m[0] },
        evidence: m[0],
        confidence: 0.85,
      },
    ],
  },
  // "X omitted and substituted by Y" — emit both withdraw + sibling proposal
  {
    rx: /([A-Z][A-Z0-9-]*)\s+(?:omitted|withdrawn).{0,40}substituted\s+by\s+([A-Z][A-Z0-9-]*)/i,
    build: (m) => [
      {
        eventKind: "withdrawn",
        payload: { reason: m[0], substituted_by: m[2] },
        evidence: m[0],
        confidence: 0.9,
        substitution: { newLabel: m[2]! },
      },
    ],
  },
  // "changed to X" / "amended to X"
  {
    rx: /(?:changed?|amended?)\s+(?:into|to)\s+([^.]+?)(?:\.|$)/i,
    build: (m) => [
      {
        eventKind: "description_changed",
        payload: { new: m[1]!.trim() },
        evidence: m[0],
        confidence: 0.7,
      },
    ],
  },
  // "qty revised to N" / "quantity amended to N"
  {
    rx: /(?:qty|quantity)\s+(?:revised|amended|changed)\s+to\s+(\d[\d,.]*)/i,
    build: (m) => [
      {
        eventKind: "quantity_changed",
        payload: { new: m[1]!.replace(/,/g, "") },
        evidence: m[0],
        confidence: 0.85,
      },
    ],
  },
]

/** Run patterns over one response and return any proposed events. */
export function detectEvents(response: string): ProposedEvent[] {
  if (!response.trim()) return []
  const proposals: ProposedEvent[] = []
  for (const p of PATTERNS) {
    const m = response.match(p.rx)
    if (m) proposals.push(...p.build(m))
  }
  return proposals
}

/** Bulk variant — annotate every query with its detected events. */
export interface QueryWithEvents extends ParsedQuery {
  detectedEvents: ProposedEvent[]
}

export function detectForAll(queries: ParsedQuery[]): QueryWithEvents[] {
  return queries.map((q) => ({
    ...q,
    detectedEvents: detectEvents(q.response),
  }))
}
