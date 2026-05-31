/**
 * Doc-category fingerprint detector. Examines a pre-extracted surface
 * (markdown text + structural manifest) and ranks the doc against each
 * category's distinctive markers.
 *
 * Used to:
 *   1. Pre-flight check before the AI agent runs — if the upload is in
 *      the wrong accordion slot, surface the mismatch as a warning
 *      WITHOUT spending tokens on the agent.
 *   2. Auto-classify drop-zone uploads when the user doesn't pick a slot.
 *
 * Pure deterministic — no LLM.
 */

export interface FingerprintScore {
  categoryId: string
  score: number // 0..1, higher = more confident
  signals: string[] // human-readable why
}

export interface FingerprintResult {
  topMatch: FingerprintScore | null
  scoresByCategory: Record<string, FingerprintScore>
}

interface FingerprintRule {
  categoryId: string
  /** Hard requirements — all must match. */
  required?: { pattern: RegExp; weight: number; label: string }[]
  /** Strong markers — additive. */
  strong?: { pattern: RegExp; weight: number; label: string }[]
  /** Weak markers — additive. */
  weak?: { pattern: RegExp; weight: number; label: string }[]
  /** Anti-markers — subtract. */
  veto?: { pattern: RegExp; weight: number; label: string }[]
  /** Tiebreaker: prefers PDFs vs XLSX. */
  expectedMime?: "pdf" | "xlsx" | "docx"
}

const RULES: FingerprintRule[] = [
  {
    categoryId: "fot",
    required: [
      { pattern: /FORM OF TENDER/i, weight: 0.4, label: "Title 'FORM OF TENDER'" },
    ],
    strong: [
      { pattern: /Having examined the Instructions to Tenderers/i, weight: 0.25, label: "Clause 1 opener" },
      { pattern: /for a period of\s+\w+\s*\(\d+\)\s+days from the latest date/i, weight: 0.15, label: "Clause 4 validity phrasing" },
      { pattern: /Time for Completion/i, weight: 0.1, label: "Times for Completion table heading" },
      { pattern: /percentage mark-up applicable for the Contractor.{1,40}overheads/i, weight: 0.1, label: "Clause 3 OHP markup" },
    ],
    weak: [
      { pattern: /Signature.{0,5}\.{4,}/, weight: 0.05, label: "Signature dotted line" },
    ],
    veto: [
      { pattern: /CONDITIONS OF CONTRACT/i, weight: 0.3, label: "Looks like COC instead" },
      { pattern: /INSTRUCTIONS TO TENDERERS\s*\nINDEX/i, weight: 0.3, label: "Looks like ITT instead" },
    ],
    expectedMime: "pdf",
  },
  {
    categoryId: "itt",
    required: [
      { pattern: /INSTRUCTIONS TO TENDERERS/i, weight: 0.4, label: "Title 'INSTRUCTIONS TO TENDERERS'" },
    ],
    strong: [
      { pattern: /Notification of Intent to Tender/i, weight: 0.15, label: "Clause 4 heading" },
      { pattern: /Addenda to Tender Documents/i, weight: 0.1, label: "Clause 5 heading" },
      { pattern: /Tender Submission Checklist/i, weight: 0.1, label: "Appendix C reference" },
      { pattern: /Form of Agreement/i, weight: 0.1, label: "Appendix A reference" },
      { pattern: /\b1\.\s+Definitions/i, weight: 0.1, label: "Clause 1 Definitions header" },
    ],
    veto: [
      { pattern: /FORM OF TENDER\b/, weight: 0.2, label: "Cover says FOT" },
      { pattern: /CONDITIONS OF CONTRACT/i, weight: 0.2, label: "Cover says COC" },
    ],
    expectedMime: "pdf",
  },
  {
    categoryId: "coc",
    required: [
      { pattern: /CONDITIONS OF CONTRACT/i, weight: 0.4, label: "Title 'CONDITIONS OF CONTRACT'" },
    ],
    strong: [
      { pattern: /PARTICULAR CONDITIONS/i, weight: 0.2, label: "Appendix A heading" },
      { pattern: /Defects Liability Period/i, weight: 0.1, label: "DLP definition" },
      { pattern: /Liquidated Damages/i, weight: 0.1, label: "LDs reference" },
      { pattern: /Performance Bond/i, weight: 0.05, label: "Performance bond clause" },
      { pattern: /Force Majeure/i, weight: 0.05, label: "Force Majeure clause" },
    ],
    veto: [
      { pattern: /FORM OF TENDER\b/, weight: 0.2, label: "Cover says FOT" },
      { pattern: /INSTRUCTIONS TO TENDERERS/i, weight: 0.2, label: "Cover says ITT" },
    ],
    expectedMime: "pdf",
  },
  {
    categoryId: "sopr",
    required: [
      {
        pattern: /SCHEDULE OF PROJECT REQUIREMENTS/i,
        weight: 0.4,
        label: "Title 'SCHEDULE OF PROJECT REQUIREMENTS'",
      },
    ],
    strong: [
      { pattern: /SITE CONDITIONS AND TEMPORARY SERVICES/i, weight: 0.15, label: "Section 3 heading" },
      { pattern: /Responsibility Matrix/i, weight: 0.1, label: "Appendix G reference" },
      { pattern: /KEY DATES/i, weight: 0.1, label: "Section 2 heading" },
      { pattern: /BIM Requirements/i, weight: 0.05, label: "Appendix H reference" },
      { pattern: /Earned Value/i, weight: 0.05, label: "Appendix N reference" },
    ],
    expectedMime: "pdf",
  },
  {
    categoryId: "specification",
    required: [
      {
        pattern: /(TECHNICAL SPECIFICATIONS?|LANDSCAPE SPECIFICATIONS?|ARCHITECTURAL SPECIFICATIONS?)/i,
        weight: 0.3,
        label: "Title contains 'SPECIFICATIONS'",
      },
    ],
    strong: [
      { pattern: /\bPART 1\s*-\s*GENERAL/, weight: 0.2, label: "CSI Part 1 marker" },
      { pattern: /\bPART 2\s*-\s*PRODUCTS/, weight: 0.15, label: "CSI Part 2 marker" },
      { pattern: /\bPART 3\s*-\s*EXECUTION/, weight: 0.1, label: "CSI Part 3 marker" },
      { pattern: /\b\d{2}\s\d{4}\b/, weight: 0.1, label: "CSI MasterFormat code" },
      { pattern: /Approved Manufacturers?/i, weight: 0.05, label: "Appendix A reference" },
    ],
    expectedMime: "pdf",
  },
  {
    categoryId: "boq-template",
    required: [
      { pattern: /BILLS? OF QUANTITIES/i, weight: 0.3, label: "Title 'BILL(S) OF QUANTITIES'" },
    ],
    strong: [
      { pattern: /Rate\s*\n?\s*AED/, weight: 0.2, label: "Rate AED column" },
      { pattern: /\b(Bill No\.\s*\d+|BILL NO\.\s*\d+)/, weight: 0.15, label: "Bill numbering" },
      { pattern: /To Collection/, weight: 0.1, label: "'To Collection' subtotal marker" },
      { pattern: /General Requirements/i, weight: 0.05, label: "General Requirements bill" },
    ],
    expectedMime: "xlsx",
  },
  {
    categoryId: "boq-priceset",
    // Same as boq-template but with rates filled — agent must check
    // whether rate cells contain values.
    required: [
      { pattern: /BILLS? OF QUANTITIES/i, weight: 0.3, label: "Title 'BILL(S) OF QUANTITIES'" },
    ],
    strong: [
      { pattern: /Rate\s*\n?\s*AED/, weight: 0.1, label: "Rate column present" },
      // Distinguished from template only at the agent level when it sees rate values.
    ],
    expectedMime: "xlsx",
  },
  {
    categoryId: "pte",
    strong: [
      { pattern: /Pre[- ]Tender Estimate/i, weight: 0.4, label: "Title 'Pre-Tender Estimate'" },
      { pattern: /(Element|Section)\s+(Code|Label)/i, weight: 0.15, label: "Elemental breakdown" },
      { pattern: /Contingency/i, weight: 0.1, label: "Contingency line" },
    ],
    expectedMime: "xlsx",
  },
  {
    categoryId: "addenda",
    required: [
      { pattern: /Addend(um|a)\s+(No\.|Number)\s*\d+/i, weight: 0.4, label: "Addendum number" },
    ],
    strong: [
      { pattern: /(amendment|amend|revision)/i, weight: 0.15, label: "Amendment language" },
      { pattern: /(deadline|submission date).{0,40}extended/i, weight: 0.1, label: "Deadline extension language" },
    ],
    expectedMime: "pdf",
  },
  {
    categoryId: "drawings-register",
    required: [
      {
        pattern: /(LIST OF.{0,20}DRAWINGS?|DRAWING(S)?\s+REGISTER|TENDER DRAWINGS)/i,
        weight: 0.4,
        label: "Drawings register title",
      },
    ],
    strong: [
      { pattern: /\b[A-Z]{2,4}-\d{3,5}-[A-Z]{1,3}-[A-Z]?\d{3,5}\b/, weight: 0.2, label: "Drawing-number pattern" },
      { pattern: /(Revision|Rev\.|Rev:)/i, weight: 0.1, label: "Revision column" },
      { pattern: /(Scale|Sheet Size)/i, weight: 0.05, label: "Scale/sheet-size column" },
    ],
    expectedMime: "pdf",
  },
  {
    categoryId: "cover-letter",
    strong: [
      { pattern: /(Subject:|Re:)/i, weight: 0.2, label: "Subject/Re line" },
      { pattern: /(Dear Sirs|Dear Sir|Dear Madam)/i, weight: 0.2, label: "Salutation" },
      { pattern: /(yours faithfully|yours sincerely|kind regards)/i, weight: 0.15, label: "Closing" },
      { pattern: /(we confirm|we acknowledge|we hereby)/i, weight: 0.1, label: "Confirmation language" },
      { pattern: /(except as noted|subject to the following|notwithstanding)/i, weight: 0.1, label: "Exception language" },
    ],
    veto: [
      { pattern: /FORM OF TENDER\b/, weight: 0.3, label: "FOT, not cover letter" },
      { pattern: /BILLS? OF QUANTITIES/i, weight: 0.3, label: "BOQ, not cover letter" },
    ],
    expectedMime: "pdf",
  },
]

/**
 * Compute fingerprint scores across all categories.
 */
export function fingerprintDocument({
  surface,
  mimeKind,
}: {
  surface: string
  mimeKind: "pdf" | "xlsx" | "docx" | "image" | "unknown"
}): FingerprintResult {
  const text = surface.slice(0, 50_000) // bound the regex work
  const scores: Record<string, FingerprintScore> = {}

  for (const rule of RULES) {
    let total = 0
    const signals: string[] = []

    if (rule.required) {
      let allMatched = true
      for (const req of rule.required) {
        if (req.pattern.test(text)) {
          total += req.weight
          signals.push(`✓ ${req.label}`)
        } else {
          allMatched = false
          signals.push(`✗ missing required: ${req.label}`)
        }
      }
      if (!allMatched) {
        // Required marker absent → cap at very low score
        scores[rule.categoryId] = {
          categoryId: rule.categoryId,
          score: Math.min(total, 0.15),
          signals,
        }
        continue
      }
    }

    if (rule.strong) {
      for (const s of rule.strong) {
        if (s.pattern.test(text)) {
          total += s.weight
          signals.push(`✓ ${s.label}`)
        }
      }
    }
    if (rule.weak) {
      for (const w of rule.weak) {
        if (w.pattern.test(text)) {
          total += w.weight
          signals.push(`· ${w.label}`)
        }
      }
    }
    if (rule.veto) {
      for (const v of rule.veto) {
        if (v.pattern.test(text)) {
          total -= v.weight
          signals.push(`⊘ veto: ${v.label}`)
        }
      }
    }

    // Mime mismatch penalty
    if (rule.expectedMime && rule.expectedMime !== mimeKind) {
      total -= 0.15
      signals.push(`⊘ mime mismatch: expected ${rule.expectedMime}, got ${mimeKind}`)
    }

    scores[rule.categoryId] = {
      categoryId: rule.categoryId,
      score: Math.max(0, Math.min(1, total)),
      signals,
    }
  }

  let topMatch: FingerprintScore | null = null
  for (const entry of Object.values(scores)) {
    if (entry.score > 0.35 && (!topMatch || entry.score > topMatch.score)) {
      topMatch = entry
    }
  }

  return { topMatch, scoresByCategory: scores }
}

/**
 * Check whether a doc uploaded into a specific accordion slot matches.
 *
 *  - score ≥ 0.5 for the expected category   → match
 *  - score < 0.5 but no rival ≥ 0.6          → uncertain (allow with warning)
 *  - rival ≥ 0.6 for a DIFFERENT category    → mismatch (block / suggest move)
 */
export function checkSlotMatch({
  expectedCategoryId,
  fingerprint,
}: {
  expectedCategoryId: string
  fingerprint: FingerprintResult
}): {
  status: "match" | "uncertain" | "mismatch"
  detectedCategoryId?: string
  expectedScore: number
  signals: string[]
} {
  const expected = fingerprint.scoresByCategory[expectedCategoryId]
  const expectedScore = expected?.score ?? 0

  if (expectedScore >= 0.5) {
    return { status: "match", expectedScore, signals: expected?.signals ?? [] }
  }

  const rival = fingerprint.topMatch
  if (rival && rival.categoryId !== expectedCategoryId && rival.score >= 0.6) {
    return {
      status: "mismatch",
      detectedCategoryId: rival.categoryId,
      expectedScore,
      signals: [
        ...(expected?.signals ?? []),
        "—",
        `Detected instead: ${rival.categoryId} (score ${rival.score.toFixed(2)})`,
        ...rival.signals,
      ],
    }
  }

  return {
    status: "uncertain",
    expectedScore,
    signals: expected?.signals ?? ["No distinctive markers found"],
  }
}
