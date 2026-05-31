# `addenda` — Tender Addendum (extraction prompt)

Document issued by the Employer during the tender period to amend or clarify any of the Tender Documents. Cross-checked against the FOT's Clause 9 "Acknowledged addenda" table. Typical format: a 1–10 page memo with numbered amendments, an optional deadline change, and optional attachments (drawings, revised BOQ).

> **Validator note (advisory):** the runtime validator is currently `z.unknown()` — any JSON shape will pass zod. The schema below is the extraction contract this prompt enforces. The validator will be tightened in a later task.

## Output schema (emit JSON of exactly this shape)

```jsonc
{
  // Identity
  "reference":              "string|null",                      // "ADD-01" / "Addendum No. 1"
  "number":                 "positive integer|null",            // 1, 2, 3 …
  "dateOfIssue":            "ISO date string|null",
  "subject":                "string|null",                      // short title
  "issuedBy":               "string|null",                      // "Employer" / "Engineer"
  "referencedDocuments":    [ "string" ],                       // which Tender Documents are affected (ITT / COC / SOPR / BOQ / Drawings / Specification); [] if none stated
  "tenderDocumentClauseRefs": [ "string" ],                     // specific clause refs amended; [] if none

  // Numbered changes
  "changes": [
    {
      "clauseRef":          "string|null",                      // clause/page being amended
      "kind":               "variation|addition|deletion|clarification|rectification|null",
      "beforeText":         "string|null",                      // when shown as red-line
      "afterText":          "string|null",                      // new wording
      "affectsTenderSum":   "boolean|null",
      "affectsTime":        "boolean|null"
    }
  ],                                                            // [] if no numbered changes

  // Deadline change
  "extendsDeadline":        "boolean|null",
  "newDeadline":            "ISO date string|null",             // null when not extended

  // BOQ amendments (optional)
  "boqChanges": [
    {
      "itemRef":  "string|null",                                // "Bill 2 / Section B / Item A"
      "kind":     "quantity_change|description_change|add_item|delete_item|null",
      "oldValue": "string|null",
      "newValue": "string|null"
    }
  ],

  // Attachments
  "attachments": [
    {
      "filename": "string|null",
      "type":     "drawing|specification|image|other|null"
    }
  ],

  // Signature
  "signedBy":   "string|null",                                  // Engineer / Employer representative
  "signedAt":   "ISO date string|null"
}
```

## Field guidance

- `reference` — addendum reference as written ("ADD-01", "Addendum No. 1").
- `number` — numeric addendum number; extract from the reference when present (e.g. "Addendum No. 1" → `1`).
- `dateOfIssue` — date from the header / cover.
- `subject` — short title or subject line.
- `issuedBy` — issuing party as stated.
- `referencedDocuments[]` — list of tender documents the addendum affects (canonical doc names: `ITT`, `COC`, `SOPR`, `Specification`, `Drawings`, `BOQ`, `FOT`). `[]` when not stated.
- `tenderDocumentClauseRefs[]` — specific clause refs amended (e.g. "ITT Clause 15", "COC Particular Conditions"). `[]` when not stated.
- `changes[].clauseRef` — the clause / page being amended.
- `changes[].kind` — one of the five enum values; infer from the wording.
- `changes[].beforeText` / `.afterText` — red-line content when shown. If only `afterText` is shown ("Replace … with …"), emit `beforeText` as `null`.
- `changes[].affectsTenderSum` — infer from wording ("quantity increased by N" → true; pure clarifications → false).
- `changes[].affectsTime` — infer from wording ("time for completion extended by N days" → true).
- `extendsDeadline` / `newDeadline` — set both when the addendum extends the submission deadline; otherwise `extendsDeadline=false` and `newDeadline=null`.
- `boqChanges[]` — optional list of BOQ amendments; emit per-amendment rows.
- `attachments[]` — files attached to the addendum (drawings, revised BOQ sheets, etc.).
- `signedBy` / `signedAt` — signing party and date.

## Extraction quirks (preserved from prior runs)

- Addenda are usually short (1–10 pages) and follow a strict structure: header + numbered changes + deadline change + attachments.
- **Numbered list parsing.** Changes appear as "1. … 2. … 3. …" or as a 2-column table (Clause / Amendment).
- **Red-line detection.** Before/after may be shown with strikethrough + underline OR as separate "Original wording" / "Amended wording" blocks. Emit both when present.
- **Date of issue.** Look in the header. Falls back to the file's metadata date if not stated in the body.
- **Deadline extension.** Look for "the tender submission deadline is hereby extended to …" or similar phrasing.
- **Attachment list.** Typically at the end ("Enclosures: …" or "Attachments: …"). Each attachment becomes a row.
- **Affects tender sum / time.** Infer from the change wording. "quantity of item X increased by N" → affects sum. "time for completion extended by N days" → affects time. Pure clarifications → neither.
- **No mention** in the addendum body does NOT mean "false" — emit `null` when ambiguous.

## Output rules

- Emit a single JSON object matching the schema above. No prose, no markdown fences, no commentary.
- Every key is at the TOP LEVEL. Do NOT wrap fields inside `header`, `body`, or any other envelope.
- Use `null` for any scalar you cannot find; use `[]` for any list with no rows.
- Never invent values. If a change's `kind` is ambiguous, emit `null`.
- The schema above is the complete output contract — do not introduce keys that are not listed.
