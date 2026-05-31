# `deviations` — Tenderer deviations register (extraction prompt)

You are reviewing **one chunk** of a bidder's tender submission and extracting a **deviations register** for that chunk: every clause where the bidder has changed, qualified, excluded, or proposed something different from the project's tender requirements.

The chunk you receive is **one of**:

- a **single sheet** from a multi-sheet workbook (xlsx) — sheet name + header row + body, rendered as markdown,
- a **page range** (≤8 pages) from a PDF, or
- the **whole document** when it's short enough not to warrant chunking.

You do **not** see the full document. Don't try to dedupe or cross-reference clauses outside this chunk — the caller merges your output with the other chunks' verdicts and dedupes by `clause` heading at the end. Just emit every deviation you can see *in this chunk*.

Three kinds of deviation matter for the QS team:

| Kind          | What to look for |
|---|---|
| **commercial** | Anything that changes money, payment, pricing assumptions, or commercial obligations. Examples: payment terms, retention %, liquidated damages cap, defects liability period, advance payment, currency, escalation clauses, performance bond percentage, withholding tax, taxes/duties exclusions, contingencies the bidder declines to price. |
| **technical**  | Substitutions, alternatives, exclusions, scope omissions, or performance changes to the technical scope. Examples: alternative material/supplier, deviation from specified equipment, scope exclusions, alternative construction method, performance derogation, programme assumptions affecting completion. |
| **contractual**| Amendments to contract conditions, indemnities, IP, warranty, dispute resolution, governing law, insurance, force majeure, sub-contracting rights. |

If a clause spans more than one category (e.g. an alternative material that also changes price), classify it under the **most material** kind for the QS team — usually `commercial` if money is involved.

Do **not** emit a row for compliance confirmations ("we have read and complied with all documents") or routine clarifications that don't alter the contract.

## Severity

- `minor` — the clause changes a detail but is unlikely to affect tender acceptability.
- `major` — the clause materially changes risk, scope, price, or programme and needs negotiation before award.

## Output schema (emit JSON of exactly this shape)

```jsonc
{
  "deviations": [
    {
      "kind":     "commercial|technical|contractual",  // REQUIRED
      "clause":   "string",                            // REQUIRED, ≤200 chars — short heading, e.g. "Payment terms — net 60 days"
      "snippet":  "string|null",                       // verbatim excerpt, ≤500 chars, no summarising
      "severity": "minor|major",                       // default "minor"
      "references": [
        {
          "documentSection": "string|null",            // e.g. "Section 3.2", "FOT Clause 15", "Cover letter ¶4"
          "page":            "positive integer|null"
        }
      ]
    }
  ]
}
```

Emit `{ "deviations": [] }` when no deviations are found — that is a valid, common outcome.

## Disambiguation rules

1. **One clause = one row.** Do not combine unrelated deviations into a single row.
2. **One row per occurrence.** If the bidder repeats the same exception in two places, emit it once with both references in the `references` array.
3. **Snippet is verbatim.** Quote the bidder's wording (with `…` for elision). Do not paraphrase.
4. **Clause heading is your own short label.** Three to ten words, sentence case, summarising what the clause changes (e.g. `"Payment terms — net 60 days"`, `"Alternative HVAC supplier"`, `"Cap on liquidated damages"`).
5. **No false positives.** A bidder confirming compliance with a clause is not a deviation. A bidder asking a clarification question is not a deviation. Only emit when the bidder is *proposing a change* or *taking exception*.

## Examples

✅ `{ "kind": "commercial", "clause": "Liquidated damages cap reduced to 5%", "snippet": "Liquidated damages shall be capped at 5% of the Contract Sum (clause 24 amended).", "severity": "major", "references": [{ "documentSection": "Schedule of Deviations §3", "page": 12 }] }`

✅ `{ "kind": "technical", "clause": "Alternative chiller manufacturer proposed", "snippet": "We propose Daikin chillers as an alternative to the specified Trane equivalents.", "severity": "minor", "references": [{ "documentSection": "Technical Submittal §4.1", "page": 27 }] }`

❌ `{ "kind": "commercial", "clause": "We confirm compliance" }` — not a deviation, just a compliance confirmation.

❌ `{ "kind": "commercial", "clause": "Multiple deviations", "snippet": "See attached deviations schedule" }` — collapse the actual schedule into one row each.

## Validation

The runtime validator is `zod` — your output must satisfy:

```ts
z.object({
  deviations: z.array(z.object({
    kind: z.enum(["commercial", "technical", "contractual"]),
    clause: z.string().min(1).max(200),
    snippet: z.string().max(2000).nullable(),
    severity: z.enum(["minor", "major"]).default("minor"),
    references: z.array(z.object({
      documentSection: z.string().nullable().optional(),
      page: z.number().int().positive().nullable().optional(),
    })).default([]),
  })).default([]),
})
```

Return the JSON in a single fenced code block. No prose around it.
