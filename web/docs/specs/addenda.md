# `addenda` — Tender Addendum

Document issued by the Employer during the tender period to amend or
clarify any of the Tender Documents. Cross-checked against the FOT's
Clause 9 "Acknowledged addenda" table.

---

## 1. Identity

| Field | Value |
| --- | --- |
| `id` | `addenda` |
| `label` | Tender Addendum |
| `shortLabel` | TA |
| `scope` | ta |
| `category` | "Tender Addendum" |
| `required` | – (only if any are issued) |
| `manualFeasible` | **full** |
| Sample | _pending_ |

---

## 2. Field inventory

### 2.1 Identity

| Field | Class | Notes |
| --- | --- | --- |
| `addendum.reference` | EXTRACT | "ADD-01" / "Addendum No. 1" |
| `addendum.number` | EXTRACT | 1, 2, 3 … |
| `addendum.dateOfIssue` | EXTRACT | ISO date |
| `addendum.subject` | EXTRACT | short title |
| `addendum.issuedBy` | EXTRACT | "Employer" / "Engineer" |
| `addendum.referencedDocuments[]` | EXTRACT | which Tender Documents are affected (ITT / COC / SOPR / BOQ / Drawings / Specification) |
| `addendum.tenderDocumentClauseRefs[]` | EXTRACT | specific clause refs amended |

### 2.2 Changes

| Field | Class | Notes |
| --- | --- | --- |
| `addendum.changes[].clauseRef` | EXTRACT | clause/page being amended |
| `addendum.changes[].kind` | EXTRACT | enum `variation` / `addition` / `deletion` / `clarification` / `rectification` |
| `addendum.changes[].beforeText` | EXTRACT | optional, when shown as red-line |
| `addendum.changes[].afterText` | EXTRACT | new wording |
| `addendum.changes[].affectsTenderSum` | EXTRACT | inferred boolean |
| `addendum.changes[].affectsTime` | EXTRACT | inferred boolean |

### 2.3 Deadline change

| Field | Class | Notes |
| --- | --- | --- |
| `addendum.extendsDeadline` | EXTRACT | boolean |
| `addendum.newDeadline` | EXTRACT | ISO date (if extended) |

### 2.4 BOQ amendments

| Field | Class | Notes |
| --- | --- | --- |
| `addendum.boqChanges[].itemRef` | EXTRACT | (bill, section, item-letter) |
| `addendum.boqChanges[].kind` | EXTRACT | enum `quantity_change` / `description_change` / `add_item` / `delete_item` |
| `addendum.boqChanges[].oldValue` | EXTRACT | |
| `addendum.boqChanges[].newValue` | EXTRACT | |

### 2.5 Attachments

| Field | Class | Notes |
| --- | --- | --- |
| `addendum.attachments[].filename` | EXTRACT | drawings / appendix files attached |
| `addendum.attachments[].type` | EXTRACT | enum `drawing` / `specification` / `image` / `other` |
| `addendum.attachments[].documentId` | LINK | matched to uploaded `document` rows |

### 2.6 Signature

| Field | Class | Notes |
| --- | --- | --- |
| `addendum.signedBy` | EXTRACT | Engineer / Employer rep |
| `addendum.signedAt` | EXTRACT | date |
| `addendum.signatureImage` | EXTRACT | optional |

---

## 3. Zod schema

```ts
export const addendaSchema = z.object({
  reference: z.string(),
  number: z.number().int(),
  dateOfIssue: z.string().date(),
  subject: z.string(),
  issuedBy: z.string(),
  referencedDocuments: z.array(z.string()),

  changes: z.array(z.object({
    clauseRef: z.string(),
    kind: z.enum(["variation", "addition", "deletion", "clarification", "rectification"]),
    beforeText: z.string().optional(),
    afterText: z.string(),
    affectsTenderSum: z.boolean(),
    affectsTime: z.boolean(),
  })),

  extendsDeadline: z.boolean(),
  newDeadline: z.string().date().optional(),

  boqChanges: z.array(z.object({
    itemRef: z.string(),
    kind: z.enum(["quantity_change", "description_change", "add_item", "delete_item"]),
    oldValue: z.string().optional(),
    newValue: z.string(),
  })).optional(),

  attachments: z.array(z.object({
    filename: z.string(),
    type: z.enum(["drawing", "specification", "image", "other"]),
    documentId: z.string().optional(),
  })).optional(),

  signedBy: z.string(),
  signedAt: z.string().date(),
})

export type Addenda = z.infer<typeof addendaSchema>
```

---

## 4. Manual UI layout

```text
[Accordion: Tender Addendum]
└── [Tabs: Manual | Upload]
    └── Manual tab
        ├── Identity
        │   • Reference, Number, Date of Issue, Subject, Issued by
        │   • Referenced documents (multi-select: ITT / COC / SOPR / BOQ / Drawings / Spec)
        ├── Changes (repeating-rows)
        │   • Clause ref | Kind | Before | After | Affects sum | Affects time
        ├── Deadline
        │   • Extends deadline? | New deadline (date)
        ├── BOQ changes (repeating-rows, optional)
        │   • Item ref | Kind | Old value | New value
        ├── Attachments (multi-file uploader)
        └── Signature
            • Signed by, Date
```

---

## 5. Persistor mapping

| Form field | DB row |
| --- | --- |
| Whole record | `document` with `scope='ta'`, `category='Tender Addendum'`, metadata in extracted_data jsonb |
| `extendsDeadline + newDeadline` | updates `project.adjusted_return_at` (with audit entry) |
| `boqChanges[]` | optional versioned `boq_item` updates (with `boq_item.version` increment) |
| `reference` | cross-referenced on every FOT save against `acknowledgedAddenda[]` |
| `attachments[].documentId` | linked `document` rows with parent_document_id = the addendum's id |

---

## 6. Cross-doc validations

| Rule | Trigger | Severity |
| --- | --- | --- |
| `reference` must be unique within the project | save | hard |
| `dateOfIssue` ≥ `project.tenderIssuedAt` | save | hard |
| `dateOfIssue` ≤ `project.originalReturnAt - itt.addendaCutoffDays` | save | soft (warn if late) |
| If `extendsDeadline`, `newDeadline > project.adjusted_return_at` | save | hard |
| Every FOT submitted MUST acknowledge every addendum issued before its tender date | save FOT | hard |
| `boqChanges[].itemRef` must reference real `boq_item` rows | save | hard |

---

## 7. Agent extraction notes

- Addenda are usually short (1-10 pages) and follow a strict structure: header + numbered changes + deadline change + attachments.
- **Numbered list parsing.** Changes appear as "1. ... 2. ... 3. ..." or as a 2-column table (Clause / Amendment).
- **Red-line detection.** Before/after may be shown with strikethrough + underline OR as separate "Original wording" / "Amended wording" blocks.
- **Date of issue:** look in the header. Falls back to the file's date if not stated.
- **Deadline extension:** look for "the tender submission deadline is hereby extended to ..." or similar phrasing.
- **Attachment list:** typically at the end ("Enclosures: ..." or "Attachments: ..."). Each attachment becomes a child `document` row.
- **Affects tender sum / time:** infer from the change wording. "the quantity of item X is increased by N" → affects sum. "the time for completion is extended by N days" → affects time.

---

## 8. Sample evidence

_Sample pending._ Common formats observed in tender practice:

- 1-page memo with numbered amendments (most common)
- Multi-page document with appended drawings (when adding new drawings)
- Excel attachment for BOQ-only addenda (quantity changes)
