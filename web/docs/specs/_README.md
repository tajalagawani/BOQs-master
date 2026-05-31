# Document Category Specs

One markdown file per doc category. Each file is the **single source of truth**
that drives:

1. **The Step 2 accordion form** — every field appears in the Manual tab.
2. **The AI agent's extraction target** — agent reads the spec to know what to pull.
3. **The DB persistor** — maps the validated value to ProcureX tables.

File contract — every spec has the same 8 sections:

```text
1. Identity                  what doc, sample seen, scope, accordion title
2. Field inventory           EVERY field present in the doc — classified
                             EXTRACT / VERIFY / DISPLAY / IGNORE
3. Zod schema                TypeScript validator
4. Manual UI layout          how the Manual tab is grouped + which renderer
                             per field (text, number, repeating-rows, etc.)
5. Persistor mapping         field → DB row
6. Cross-doc validations     server-side rules that fire on save
7. Agent extraction notes    hints for the AI (regex patterns,
                             multi-source convergence, auto-exclusion)
8. Sample evidence           pointers into the actual files (page nos,
                             clause refs, sheet names)
```

Index of categories (matches `DOC_SPECS` registry in code):

- [fot.md](./fot.md) — Form of Tender
- [itt.md](./itt.md) — Instructions to Tenderer
- [coc.md](./coc.md) — Conditions of Contract
- [boq-template.md](./boq-template.md) — Blank BOQ / Pricing Schedule
- [boq-priceset.md](./boq-priceset.md) — Priced BOQ (bidder)
- [pte.md](./pte.md) — Pre-Tender Estimate
- [addenda.md](./addenda.md) — Tender Addendum
- [drawings-register.md](./drawings-register.md) — Drawings register
- [cover-letter.md](./cover-letter.md) — Cover letter (bidder)
- [specification.md](./specification.md) — Technical Specification
- [sopr.md](./sopr.md) — Schedule of Project Requirements

All files share the same field-class legend:

| Class | Meaning |
| --- | --- |
| **EXTRACT** | Pulled into the form / saved to DB |
| **VERIFY** | Cross-checked against another doc or DB row |
| **DISPLAY** | Shown read-only in the side panel; not saved as discrete row |
| **IGNORE** | Boilerplate identical across tenders of this contract form |
