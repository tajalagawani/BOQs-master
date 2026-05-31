# `specification` — Technical Specification (extraction prompt)

The detailed technical requirements per construction discipline. Follows CSI MasterFormat 2012 numbering with a section-numbered TOC and a 3-Part body structure per section (General / Products / Execution). A project may have multiple Specification documents (one per discipline). This is a large doc (hundreds of pages); the prompt below intentionally extracts a **minimal** schema — section index + approved manufacturers — to avoid output-budget blow-ups on chunked runs. The body's per-section detail is captured into the `clauses[]` verbatim archive.

> **Validator note (advisory):** the runtime validator is currently `z.unknown()` — any JSON shape will pass zod. The schema below is the extraction contract this prompt enforces and will become enforced in a later task. Treat it as binding.

## Output schema (emit JSON of exactly this shape)

```jsonc
{
  // Document-level identity
  "discipline": "architectural|landscape|structural|mep|civil|combined|null",
  "format":     "csi-masterformat|nbs|bespoke|null",
  "sectionsTotal": "non-negative integer|null",         // total sections in the TOC

  // Per-section minimal index
  "sections": [
    {
      "csiCode": "string",                              // REQUIRED if row emitted — "03 30 00" / "03 3053" / "32 8400"
      "title":   "string"                               // REQUIRED if row emitted — "Cast-in-Place Concrete"
    }
  ],                                                    // [] if no sections detected

  // Appendix A — Approved Manufacturers (lean row shape)
  "approvedManufacturers": [
    {
      "sectionCode":     "string|null",                 // CSI code this manufacturer applies to
      "product":         "string",                      // REQUIRED if row emitted
      "manufacturer":    "string",                      // REQUIRED if row emitted
      "model":           "string|null",
      "countryOfOrigin": "string|null"
    }
  ],                                                    // [] if no approved-manufacturers table

  // Catch-all — capture ANY value/requirement/standard you find that has no typed home above.
  "additionalFields": [
    {
      "label":     "string",                            // REQUIRED if row emitted — short field name
      "value":     "string",                            // REQUIRED if row emitted — the value as written
      "clauseRef": "string|null"                        // e.g. "1.3 References" / "Section 03 30 00 Part 1.4"
    }
  ],                                                    // [] if nothing additional

  // Optional verbatim clause archive — partial archive is acceptable on this doc (large surface).
  "clauses": [
    { "ref": "string", "text": "string" }               // both REQUIRED if row emitted
  ]
}
```

## Field guidance

- `discipline` — pick one of the six enum values based on the cover / running header / section content (`landscape` if predominantly hardscape/softscape/planting sections, `mep` if predominantly Divisions 21–28, etc.). Use `combined` only when no single discipline dominates.
- `format` — `csi-masterformat` when sections use 6-digit codes (`NN NN NN`) and Part 1/2/3 structure; `nbs` for NBS-Chorus style; `bespoke` for anything else.
- `sectionsTotal` — TOC count, or count of distinct section starts in the body if no TOC is visible.
- `sections[].csiCode` — the section code as written ("03 30 00" with spaces; if the original has no spaces such as "033000", keep that form). Required for any emitted row.
- `sections[].title` — the section title verbatim. Required for any emitted row.
- `approvedManufacturers[].sectionCode` — the CSI code the product applies to, when stated.
- `approvedManufacturers[].product` / `.manufacturer` — required for any emitted row.
- `approvedManufacturers[].model` / `.countryOfOrigin` — emit when stated; null otherwise.
- `additionalFields[]` — **if you find any requirement / value / rule / standard that maps to no typed field above, capture it here as `{label, value, clauseRef}` rather than discarding it. Never drop content because it lacks a typed home.** Examples: warranty year counts, reference standards (BS / ACI / EN / ASTM lists), submittal day counts, QA requirements, specific delivery-storage-handling rules, mock-up requirements. Keep `value` short (a phrase or sentence); use `clauseRef` to point back to the source.
- `clauses[].ref` / `.text` — verbatim archive of numbered clauses you can identify. **For this doc, a partial archive is preferred over none** — emit every clause you can identify clearly; skip the ones you cannot parse cleanly. Quality of refs over completeness.

## Extraction quirks (preserved from prior runs)

- **TOC-first parsing.** The TOC gives the section list with codes + titles + page numbers; use it as the navigation index for `sections[]`. If the TOC and body disagree, prefer the body.
- **CSI section detection.** Section starts are typically lines like `Section NN NN NN — Title` or `SECTION NN NN NN - Title`. The same code may appear in the TOC and then again at each section's start page.
- **3-Part body structure.** Each section has Part 1 (General) / Part 2 (Products) / Part 3 (Execution) with sub-clauses 1.1, 1.2, …, 2.1, … Do NOT emit a typed field per sub-clause — capture the substantive values via `additionalFields[]` (with `clauseRef`) or the `clauses[]` archive.
- **References sub-clause (typically 1.3 / 1.4).** Lists of BS / ACI / EN / ASTM standards. These belong in `additionalFields[]` (one entry per standard or one combined entry per organisation, depending on density).
- **Related Sections sub-clause (typically 1.4 / 1.5).** Cross-references to other CSI codes. Belong in `additionalFields[]`.
- **Warranty / Submittals / QA / Delivery / Field conditions.** Belong in `additionalFields[]` with `clauseRef`.
- **Approved Manufacturers (Appendix A).** Typically a 2-column or 3-column table: `Product | Manufacturer` or `Section | Product | Manufacturer`. Multi-row entries (one product, multiple manufacturers) are common — emit one row per (product, manufacturer) pair.
- **Multi-discipline projects** may have separate spec docs per discipline — this extraction runs once per uploaded file; downstream code allows multiple `specification` documents per project.
- The chunked path will process this doc in small per-section units. Treat each unit independently and emit only what is visible in this unit; the merger will combine across units.

## Output rules

- Emit a single JSON object matching the schema above. No prose, no markdown fences, no commentary.
- Every key is at the TOP LEVEL. Do NOT wrap fields inside `header`, `partN`, `appA`, or any other envelope.
- Use `null` for any scalar you cannot find; use `[]` for any list with no rows.
- If you find any value not covered by a typed field, put it in `additionalFields[]` rather than discarding it. Captured-with-a-label is always better than dropped.
- Never invent values. If a field is partly visible but uncertain, emit `null` (or skip the row, for arrays).
- The schema above is the complete output contract — do not introduce keys that are not listed.
