# `boq-template` — Blank BOQ / Pricing Schedule (extraction prompt)

The blank Bill of Quantities issued by the Employer. Defines every priceable item with quantity and unit. Bidders fill in unit rates and amounts to produce a priced BOQ. Workbooks are multi-sheet XLSX (typically 30–40 sheets: cover + contents + per-bill / per-element / summary / main summary). The prompt below extracts a **minimal** schema — workbook identity + per-bill priceable items — to keep output bounded across many sheets.

> **Validator note (advisory):** the runtime validator is currently `z.unknown()` — any JSON shape will pass zod. The schema below is the extraction contract this prompt enforces and will become enforced in a later task. Treat it as binding.

## Output schema (emit JSON of exactly this shape)

```jsonc
{
  // Workbook identity
  "workbookCurrency": "string|null",          // "AED" / "USD" etc. — uppercase code from per-sheet header
  "sheetsTotal":     "non-negative integer|null",

  // Per-bill priceable items
  "bills": [
    {
      "sheet": "string",                      // REQUIRED if row emitted — sheet name VERBATIM, including leading/trailing spaces (e.g. " 1 Gen Req ", "2B", "3 SUM")
      "items": [
        {
          "itemLetter":  "string|null",       // single capital letter in column A (A/B/C/…); null on non-priceable rows you choose to include
          "description": "string",            // REQUIRED if row emitted — concatenate continuation rows
          "quantity":    "number|null",       // numeric; strip thousands separators; null on general-requirements (lump) items
          "unit":        "string|null",       // "m2" / "m3" / "nr" / "item" / "kg" / "to" / "L.M." — normalised lowercase except when convention dictates
          "cell":        "string|null"        // A-column cell reference of the priceable row (e.g. "A14")
        }
      ]
    }
  ],                                          // [] if no priceable items detected

  // Catch-all — capture ANY workbook-level metadata / preamble / instruction / note row you find with no typed home above.
  "additionalFields": [
    {
      "label":     "string",                  // REQUIRED if row emitted — short field name
      "value":     "string",                  // REQUIRED if row emitted — the value as written
      "clauseRef": "string|null"              // sheet + cell or section reference (e.g. "Cover R7", "Contents R3", " 1 Gen Req !A1.1")
    }
  ],                                          // [] if nothing additional

  // Optional verbatim archive — for BOQs this is usually preamble paragraphs, section header notes,
  // or "Note:" rows; partial-over-nothing is fine.
  "clauses": [
    { "ref": "string", "text": "string" }     // both REQUIRED if row emitted
  ]
}
```

## Field guidance

- `workbookCurrency` — the currency code printed in per-sheet column headers (typically `AED` for UAE BOQs). Uppercase ISO code.
- `sheetsTotal` — total number of worksheets in the workbook (count from the sheet index).
- `bills[].sheet` — the worksheet name verbatim, including any leading / trailing spaces (sheet names like ` 1 Gen Req ` and `2 SUM` are real). The merger dedupes on this key, so accuracy matters.
- `bills[].items[].itemLetter` — single capital letter in column A of the row. Rows with blank column A are description-continuation or note rows — DO NOT emit them as separate items; instead append their text to the previous item's `description`.
- `bills[].items[].description` — the item description, concatenated across any continuation rows whose column A is blank.
- `bills[].items[].quantity` — numeric value from the Quantity column (typically column C in measured bills). Strip thousands separators (`42,268` → `42268`). For lump-sum / General Requirements items there is no quantity — emit `null`.
- `bills[].items[].unit` — unit of measure from the Unit column (typically column D). Normalise: `m²` → `m2`, `m³` → `m3`, `sqm` → `m2`, `nr/No./No` → `nr`, `to` → `to` (tonnes), `L.M.` → `L.M.` Keep the as-written form when ambiguous.
- `bills[].items[].cell` — A-column cell of the priceable row (e.g. `A14`). Use the row index from the sheet's R-prefixed line in the surface (`R 14:` → cell `A14`).
- `additionalFields[]` — **anything not captured by the typed fields above** belongs here: cover sheet text (employer / project name / document reference / date), contents bills index, preamble paragraphs, "To Collection" subtotal markers (one entry per occurrence, with `clauseRef` = "sheet R<n>"), main-summary entries, currency override notes, instructions to tenderers within the workbook. **Never drop content because it lacks a typed home.**
- `clauses[].ref` / `.text` — verbatim archive of substantive prose paragraphs (preamble, conditions of contract reference, billing rules). Partial-over-nothing — capture what you can identify cleanly.

## Extraction quirks (preserved from prior runs)

- **Workbook has many sheets.** A typical Bills-of-Quantities workbook has 30–40 sheets across: Cover, Contents, per-bill flysheet (`1FS`, `2 FS`, `3 FS`), per-element measured sheets (`2B`, `2C`, …, `2R`, `3B`, … `3R`), per-bill summary (`2 SUM`, `3 SUM`), Main Summary cover (`Fly-MS`), and Main Summary (`MS`). Each sheet is a separate unit at the chunked level.
- **Item-letter test for priceable rows.** A row is priceable iff its column A contains a single capital letter (A/B/C/…); any other column-A value (blank, multi-char, lower-case) means it is NOT a priceable item.
- **Description-continuation rule.** Rows with blank column A but non-blank column B are continuation lines — append their column B text to the previous priceable item's `description`. Do NOT emit them as their own rows.
- **"To Collection" rows** (column D / Unit reads "To Collection") mark section subtotals. They are NOT priceable items — capture them in `additionalFields[]` with `clauseRef` set to the sheet + row reference.
- **Bill 1 General Requirements is 7-column** (`Item / Description / Unit / Fixed Cost AED / Time Related Cost AED / Amount AED`). Other measured bills are 6-column (`Item / Description / Quantity / Unit / Rate AED / Amount AED`). Detect by header row before parsing items.
- **Element letter gaps** are intentional. 2-bills use B/C/E/F/G/J/K/L/M/N/Q/R (skipping D/H/I/O/P). 3-bills use B/C/D/E/F/G/H/J/K/L/M/N/Q/R (skipping A/I/O/P). Don't treat the gaps as errors.
- **Quantity parsing.** Numbers carry thousands separators (`42,268`). Parse as numbers; do not emit as strings.
- **Sheet-name trimming.** Sheet names may have leading or trailing spaces (` 1 Gen Req ` has two leading spaces and one trailing). Preserve them in `bills[].sheet` exactly as written — the dedupe key is the exact sheet string.
- **Currency override.** If the cover or contents sheet states a currency different from per-sheet headers, capture the override in `additionalFields[]` with `clauseRef` set to the source sheet+cell.

## Output rules

- Emit a single JSON object matching the schema above. No prose, no markdown fences, no commentary.
- Every key is at the TOP LEVEL. Do NOT wrap fields inside `workbook`, `contents`, `mainSummary`, or any other envelope.
- Use `null` for any scalar you cannot find; use `[]` for any list with no rows.
- If you find any workbook-level metadata, preamble, note row, subtotal marker, or main-summary entry not covered by a typed field, put it in `additionalFields[]` rather than discarding it. Captured-with-a-label is always better than dropped.
- Never invent values. If a field is partly visible but uncertain, emit `null` (or skip the row, for arrays).
- The schema above is the complete output contract — do not introduce keys that are not listed.
