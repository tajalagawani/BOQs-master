# `fot` — Form of Tender (extraction prompt)

The bidder's binding offer to the Employer. Contains the tender sum, time for completion, OHP markups, validity, addenda acknowledgements, and signatures. Issued blank by the Employer; filled in and signed by the bidder; returned via the e-Tendering portal. Most fields are blank on the issued template and only populated once a bidder fills it in.

## Output schema (emit JSON of exactly this shape)

```jsonc
{
  // Tenderer identity — blank on issued template.
  "tendererCompanyId":    "string|null",
  "tenderDate":           "ISO date string|null",          // "YYYY-MM-DD"

  // Clause 1 — Acknowledgement and Tender Sum
  "tenderSumFigures":     "integer minor units|null",      // emit the major-unit amount × 100; e.g. AED 10,500,000.00 (major units) → 1050000000
  "tenderSumWords":       "string|null",
  "currency":             "AED|USD|EUR|GBP|SAR|null",

  // Clause 2 — Time for Completion (one row per Section of the Works)
  "timesForCompletion": [
    {
      "label":            "string|null",                    // "Whole of the Works" / "Stage 1" / "Stage 2"
      "days":             "non-negative integer|null",
      "fromText":         "string|null",                    // "from and including the Commencement Date"
      "parallelText":     "string|null"                     // optional parallel-execution note
    }
  ],                                                        // [] if blank

  // Clause 3 — OHP Markup
  "ohpMarkups": {
    "variationProvisionalPercent":   "number 0..100|null",  // Clause 3(a)
    "nominatedSubcontractorPercent": "number 0..100|null",  // Clause 3(b)
    "buildersWorkNote":              "string|null"          // builders'-work / nominated-subcontractor note
  },                                                        // {} if none filled

  // Clause 4 — Validity
  "validityDays":         "positive integer|null",

  // Clause 9 — Addenda acknowledged
  "acknowledgedAddenda": [
    {
      "reference":        "string|null",                    // "ADD-01" etc.
      "dateOfIssue":      "ISO date string|null"
    }
  ],                                                        // [] if blank

  // Execution
  "executionDate":        "ISO date string|null",
  "signatures": [
    {
      "inTheCapacityOf":           "string|null",           // role e.g. "Chief Executive Officer"
      "name":                      "string|null",
      "dulyAuthorisedFor":         "string|null",           // company / JV member name
      "witnessName":               "string|null",
      "witnessAddress":            "string|null",
      "witnessOccupation":         "string|null",
      "signatureImageUrl":         "string|null",
      "witnessSignatureImageUrl":  "string|null"
    }
  ],                                                        // [] if blank

  // Optional verbatim clause archive — emit ALL clauses with their refs if you can.
  "clauses": [
    { "ref": "string", "text": "string" }                   // both required if you include the row
  ]
}
```

## Field guidance

- `tendererCompanyId` — legal name of the Tenderer (the bidder), as written in the salutation/execution block; null on a blank-template FOT.
- `tenderDate` — date the tender is submitted; parse day/month/year fields in the salutation block to one ISO date; null on blank template.
- `tenderSumFigures` — the Clause 1 lump sum **in minor units of the stated currency**: emit the major-unit amount × 100. Strip thousands separators. Null on blank template.
- `tenderSumWords` — the Clause 1 spelled-out amount exactly as written, including currency words.
- `currency` — code from the figures field's prefix or the Clause 1 wording; uppercase ISO code.
- `timesForCompletion[].label` — section heading verbatim ("Whole of the Works", "Stage 1", …).
- `timesForCompletion[].days` — integer day count for that section.
- `timesForCompletion[].fromText` — the trigger phrase ("from and including the Commencement Date").
- `timesForCompletion[].parallelText` — any parallel-execution note attached to the row (e.g. Stage 2 running in parallel with Stage 1); null when absent.
- `ohpMarkups.variationProvisionalPercent` — the Clause 3(a) percent (Variation Orders / Provisional Sums OHP).
- `ohpMarkups.nominatedSubcontractorPercent` — the Clause 3(b) percent (Nominated Subcontractor OHP). Extract independently of (a), even if equal.
- `ohpMarkups.buildersWorkNote` — the builders-work / attendances paragraph in Clause 3 (verbatim).
- `validityDays` — Clause 4 tender-validity day count.
- `acknowledgedAddenda[].reference` — addendum reference (e.g. "ADD-01"); each row of the Clause 9 table.
- `acknowledgedAddenda[].dateOfIssue` — ISO date of that addendum's issue.
- `executionDate` — execution block date assembled from day/month/year fields.
- `signatures[].inTheCapacityOf` — the role line ("In the capacity of …").
- `signatures[].name` — full name of the signatory.
- `signatures[].dulyAuthorisedFor` — the company name on the "duly authorised to sign tenders for and on behalf of …" line; for a JV bid this is the JV member.
- `signatures[].witnessName` / `witnessAddress` / `witnessOccupation` — the matching witness fields below the signatory.
- `signatures[].signatureImageUrl` / `witnessSignatureImageUrl` — leave null; only set if an image asset URL is genuinely available.
- `clauses[].ref` / `clauses[].text` — when emitting the optional archive, capture each numbered clause (e.g. `"1"`, `"2.1"`, `"3(a)"`) with its verbatim body. Skip the archive entirely if uncertain; do not partial-fill it.

## Extraction quirks (preserved from prior runs)

- Cover-page text is highly stylised; the bottom-right reference token usually matches the filename. Treat it as the document identifier, not as a field.
- Clause 1 lump sum: figures and words both appear as dotted underscores in the blank template. Distinguish them by the parenthetical `(…………)` wrapping the words field.
- Clause 2 table: structured two-column ("Section of the Works" / "Time for Completion"). Treat each labelled stage as a row, not free-form lines.
- Clause 3: percentages may repeat in (a) and (b). Read them independently and emit them in their respective fields even if equal.
- Clause 9: the addenda table is rendered as two parallel dotted lines. If the lines are blank, emit `"acknowledgedAddenda": []`, not `null`.
- Signature blocks: detect via the "Signature / In the capacity of / Name / duly authorised to sign tenders" pattern. JV submissions place two blocks side by side; single-bidder FOTs have one block.

## Output rules

- Emit a single JSON object matching the schema above. No prose, no markdown fences, no commentary.
- Use `null` for any scalar you cannot find in the surface; use `[]` for any list with no rows; use `{}` for `ohpMarkups` when none of its three fields apply.
- Never invent values. If a field is partly visible but uncertain, emit `null`.
- The schema above is the complete output contract — do not introduce keys that are not listed.
