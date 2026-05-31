# `cover-letter` — Bidder Cover Letter (extraction prompt)

The bidder's transmittal letter accompanying a tender submission. Typically 1–3 pages on the bidder's letterhead. Contains the salutation, a confirmation paragraph ("we confirm we have read and complied with all Tender Documents …"), a list of exceptions or clarifications the bidder is raising, and the signature block.

> **Validator note (advisory):** the runtime validator is currently `z.unknown()` — any JSON shape will pass zod. The schema below is the extraction contract this prompt enforces. The validator will be tightened in a later task.

## Output schema (emit JSON of exactly this shape)

```jsonc
{
  // Letterhead identity
  "tendererCompanyName":   "string|null",                   // bidder legal name from letterhead
  "tendererAddress":       "string|null",                   // full bidder address from letterhead

  // Letter header
  "letterDate":            "ISO date string|null",
  "letterReference":       "string|null",                   // "Ref: ABC/2025/001"
  "addresseeOrganisation": "string|null",                   // Employer / Engineer
  "addresseeName":         "string|null",                   // contact person
  "addresseeAddress":      "string|null",
  "subject":               "string|null",                   // "Subject: …" / "Re: …"
  "salutation":            "string|null",                   // "Dear Sirs," / "Dear Sir / Madam,"

  // Body
  "confirmsCompliance":    "boolean|null",                  // true if the bidder confirms compliance with all Tender Documents
  "tenderSumStatement":    "string|null",                   // verbatim tender-sum sentence ("Our tender sum is …")
  "tenderSumCents":        "integer minor units|null",      // emit major × 100 if a numeric amount is stated
  "currency":              "AED|USD|EUR|GBP|SAR|null",
  "validityStatement":     "string|null",                   // validity sentence
  "validityDays":          "positive integer|null",         // numeric day count from validity statement

  // Exceptions / qualifications / clarifications
  "exceptions": [
    {
      "ref":      "string|null",                            // clause / item being qualified (e.g. "ITT Clause 15", "BOQ Item 2B-A")
      "kind":     "exception|clarification|qualification|substitution|null",
      "text":     "string"                                  // REQUIRED if row emitted — full statement verbatim
    }
  ],

  // Acknowledged addenda (should match FOT Clause 9 list)
  "acknowledgedAddenda": [
    {
      "reference":   "string|null",                         // addendum reference
      "dateOfIssue": "ISO date string|null"
    }
  ],

  // Attachments
  "attachments": [
    {
      "name": "string|null",
      "type": "string|null"                                 // "BOQ" / "FOT" / "Bond Letter" / etc.
    }
  ],

  // Closing
  "closing":    "string|null",                              // "Yours faithfully" / "Yours sincerely" / "Kind regards"
  "signatures": [
    {
      "name":            "string|null",
      "designation":     "string|null",                     // role / title
      "company":         "string|null",                     // signing for which entity (JV member)
      "signatureImageUrl": "string|null"
    }
  ]
}
```

## Field guidance

- `tendererCompanyName` / `tendererAddress` — from the letterhead at the top.
- `letterDate` — date the letter was written (ISO).
- `letterReference` — internal reference number when present ("Ref: …").
- `addresseeOrganisation` / `addresseeName` / `addresseeAddress` — the recipient block.
- `subject` — subject / re line verbatim.
- `salutation` — opening salutation verbatim.
- `confirmsCompliance` — true if the letter contains an unqualified compliance confirmation; false if the letter explicitly qualifies compliance ("we comply except as noted below"); null when ambiguous.
- `tenderSumStatement` — verbatim sentence stating the tender sum.
- `tenderSumCents` — numeric tender sum in minor units (major × 100); null when no figure is given in the letter (it may be in the FOT only).
- `currency` — uppercase ISO code from the sum.
- `validityStatement` / `validityDays` — verbatim validity sentence and the numeric day count.
- `exceptions[].ref` — clause/item being qualified (e.g. "ITT Clause 15", "BOQ Item 2B-A"); null when not pinned to a specific reference.
- `exceptions[].kind` — classify the entry as `exception` (rejecting a requirement), `clarification` (asking for confirmation), `qualification` (accepting conditionally), or `substitution` (offering an alternative product / approach).
- `exceptions[].text` — required for any emitted row; full statement verbatim.
- `acknowledgedAddenda[]` — addenda referenced in the letter (should match FOT Clause 9).
- `attachments[]` — enumerated enclosures.
- `closing` — closing salutation verbatim.
- `signatures[].name` / `.designation` / `.company` — signature block fields. JV bidders have multiple signature blocks (one per JV member).

## Extraction quirks (preserved from prior runs)

- Letterhead occupies the top of page 1; the actual letter starts beneath it. Identify the letter body by the salutation ("Dear Sirs,") and stop at the closing ("Yours faithfully").
- **Confirmation paragraph patterns:** "we confirm" / "we acknowledge" / "we hereby submit our tender" — capture the statement and infer `confirmsCompliance`.
- **Exception list patterns:** "except as noted below" / "subject to the following clarifications" / "notwithstanding" — items typically follow as a numbered list.
- **Sub-bullets within an exception** belong to the same exception entry — do not split them into separate rows; concatenate into the `text` field.
- **Signature blocks** typically have name + title + company on three lines. JV cover letters have multiple blocks side by side or stacked — emit one entry per block.
- **Acknowledged addenda** in a cover letter may be a separate list or a sentence ("we acknowledge receipt of addenda 1, 2 and 3"). Emit one row per addendum.
- **Tender sum may or may not appear in the cover letter** — many bidders state the sum in the FOT only and reference it in the cover letter without restating the figure. Emit null when not stated numerically.

## Output rules

- Emit a single JSON object matching the schema above. No prose, no markdown fences, no commentary.
- Every key is at the TOP LEVEL. Do NOT wrap fields inside `header`, `body`, or any other envelope.
- Use `null` for any scalar you cannot find; use `[]` for any list with no rows.
- Money values are integer minor units (major × 100). Percentages are plain numbers in 0..100.
- Never invent values. If a statement is partly visible but uncertain, emit `null` for the structured field but keep the verbatim text in the related `*Statement` field.
- The schema above is the complete output contract — do not introduce keys that are not listed.
