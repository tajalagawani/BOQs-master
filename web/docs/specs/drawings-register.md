# `drawings-register` — Drawings Register

Index document listing every tender drawing with its number, title,
revision, date, and discipline. The actual CAD/PDF drawings are
attached separately; the register is the index.

---

## 1. Identity

| Field | Value |
| --- | --- |
| `id` | `drawings-register` |
| `label` | Drawings Register |
| `shortLabel` | DR |
| `scope` | required |
| `category` | "Drawings Register" |
| `required` | ✓ |
| `manualFeasible` | **full** (table-style) |
| Sample | _pending_ — likely embedded as Appendix B of SOPR or as a separate index PDF in `Vol 4 Drawings` |

---

## 2. Field inventory

### 2.1 Header

| Field | Class | Notes |
| --- | --- | --- |
| `register.projectCode` | EXTRACT | "ADS-226" |
| `register.discipline` | EXTRACT | enum `architectural` / `landscape` / `structural` / `mep` / `civil` / `combined` |
| `register.seriesRange` | EXTRACT | "ADS-226-ST-L000 to L1950" |
| `register.totalCount` | EXTRACT | |
| `register.issuedDate` | EXTRACT | |
| `register.preparedBy` | EXTRACT | consultant firm |
| `register.status` | EXTRACT | "Issued for Tender" / "Information Only" / "Construction" |

### 2.2 Per-drawing row

| Field | Class | Notes |
| --- | --- | --- |
| `drawings[].drawingNumber` | EXTRACT | full alphanumeric (e.g. "ADS-226-LS-L0100") |
| `drawings[].title` | EXTRACT | descriptive title |
| `drawings[].revision` | EXTRACT | letter (A, B, C, …) or numeric |
| `drawings[].dateIssued` | EXTRACT | per-drawing issue date |
| `drawings[].scale` | EXTRACT | "1:100", "1:50", "NTS" (not to scale) |
| `drawings[].sheetSize` | EXTRACT | "A0", "A1", "A2" |
| `drawings[].discipline` | EXTRACT | letter code in drawing number (LS = Landscape, A = Architectural, etc.) |
| `drawings[].status` | EXTRACT | "IFT" / "IFC" / "INF" / "PRE" |
| `drawings[].notes` | EXTRACT | optional |
| `drawings[].linkedFileId` | LINK | matched to uploaded `document` rows of the actual drawing files |

### 2.3 Aggregates

| Field | Class | Notes |
| --- | --- | --- |
| `aggregates.countByDiscipline` | DERIVED | |
| `aggregates.countByStatus` | DERIVED | |
| `aggregates.revisionDistribution` | DERIVED | |

---

## 3. Zod schema

```ts
export const drawingsRegisterSchema = z.object({
  projectCode: z.string(),
  discipline: z.enum(["architectural", "landscape", "structural", "mep", "civil", "combined"]),
  seriesRange: z.string().optional(),
  totalCount: z.number().int(),
  issuedDate: z.string().date(),
  preparedBy: z.string().optional(),

  drawings: z.array(z.object({
    drawingNumber: z.string(),
    title: z.string(),
    revision: z.string(),
    dateIssued: z.string().date(),
    scale: z.string().optional(),
    sheetSize: z.enum(["A0", "A1", "A2", "A3", "A4"]).optional(),
    discipline: z.string(),
    status: z.enum(["IFT", "IFC", "INF", "PRE", "AS_BUILT"]).optional(),
    notes: z.string().optional(),
  })),
})

export type DrawingsRegister = z.infer<typeof drawingsRegisterSchema>
```

---

## 4. Manual UI layout

```text
[Accordion: Drawings Register]
└── [Tabs: Manual | Upload]
    └── Manual tab
        ├── Identity
        │   • Project code, Discipline, Series range, Total count, Issued date, Prepared by
        ├── Drawings (large repeating-rows table)
        │   • Drawing # | Title | Rev | Date | Scale | Sheet | Discipline | Status | Notes
        │   • [+ Add row] [Bulk paste from CSV / Excel]
        ├── Aggregates (read-only)
        │   • Count by discipline
        │   • Count by status
        └── [Save Drawings Register]
```

---

## 5. Persistor mapping

| Form field | DB row |
| --- | --- |
| Whole record | `document` with `scope='required'`, `category='Drawings Register'` |
| Per `drawings[i]` | logical `document` row with `target_kind='drawing'`, metadata jsonb (drawing_number, revision, scale, etc.) |
| `aggregates.*` | computed on read; cached on `document.extracted_data.aggregates` |

---

## 6. Cross-doc validations

| Rule | Trigger | Severity |
| --- | --- | --- |
| Each `drawings[].drawingNumber` should match a CAD file uploaded under `scope='required'` and `category='Drawing'` | save | soft |
| `drawings[].drawingNumber` follow the project's series pattern (`projectCode + discipline + serial`) | save | soft |
| `drawings[].dateIssued` ≤ `project.tenderIssuedAt` | save | hard |
| If `sopr.appB.drawingsRegister.drawings[]` is present, must match this register row-for-row | save | hard |

---

## 7. Agent extraction notes

- Drawings registers are usually a large table — pre-extractor must use the table-extraction branch.
- **Drawing number pattern:** typically `<project>-<discipline>-<serial><revision>`.
- **Revision parsing:** can be a letter (A/B/C...), a number (0/1/2...), or alphanumeric (P1/P2/C0). Capture as raw string; normalise on display.
- **Status codes:** common abbreviations — IFT (Issued for Tender), IFC (Issued for Construction), INF (Information), PRE (Preliminary), AS-BUILT. Map to enum.
- **Sheet size:** usually in column header or beside the title block; default to A1 if unspecified.
- **Status filtering for tender:** drawings flagged `IFT` are the canonical tender set; others should still be captured but flagged.

---

## 8. Sample evidence

_Sample pending._

Common formats observed:

- Excel sheet with rows = drawings, columns = drawing number / title / rev / date / scale
- Multi-page PDF table (printed from CAD register software)
- Embedded in SOPR Appendix B (the case for Dubai Creek Harbour — see `sopr.md` §3 Appendix B)
