# `specification` — Technical Specification

The detailed technical requirements per construction discipline.
Follows **CSI MasterFormat 2012** numbering. Each spec section has the
canonical 3-Part structure (General / Products / Execution). The
project may have multiple Specification documents (one per discipline).

---

## 1. Identity

| Field | Value |
| --- | --- |
| `id` | `specification` |
| `label` | Technical Specification |
| `shortLabel` | SPEC |
| `scope` | required |
| `category` | "Technical Specification" |
| `required` | ✓ |
| `manualFeasible` | **no** — 20+ sections × 3 parts each, upload only |
| Sample | `ADS-226_Public Realm_Architectural Specifications_28112025.pdf` + `ADS-226_Public Realm_Landscape Specifications_28112025.pdf` (CSI MasterFormat, Aperture Design Studio, Nov 2025) |

---

## 2. Field inventory (AI extraction target)

### 2.1 Document level

| Field | Class | Notes |
| --- | --- | --- |
| `discipline` | EXTRACT | enum `architectural` / `landscape` / `structural` / `mep` / `civil` / `combined` |
| `author` | EXTRACT | consultant firm ("Aperture Design Studio") |
| `issuedAt` | EXTRACT | cover date |
| `version` | EXTRACT | document version / revision |
| `format` | EXTRACT | enum `csi-masterformat` / `nbs` / `bespoke` |
| `projectCode` | EXTRACT | "ADS-226" |
| `sectionsTotal` | EXTRACT | total sections in TOC |
| `divisionsUsed[]` | EXTRACT | first two digits of each CSI code |

### 2.2 Per section — uniform 3-Part CSI structure

For each section under "CONTENTS":

| Field | Class | Notes |
| --- | --- | --- |
| `sections[].csiCode` | EXTRACT | "03 3053", "32 8400" |
| `sections[].csiDivision` | EXTRACT | first two digits |
| `sections[].title` | EXTRACT | "Miscellaneous Cast-In-Place Concrete" |
| `sections[].pageCount` | EXTRACT | from footer "Sec. No. NNNNNN - Page X of Y" |

**Part 1 — General (per section):**

| Field | Class | Notes |
| --- | --- | --- |
| `sections[].part1.relatedDocuments` | EXTRACT | usually "Drawings and General Provisions of the Contract apply" |
| `sections[].part1.sectionIncludes` | EXTRACT | scope statement |
| `sections[].part1.references.bsi[]` | EXTRACT | British Standards (BS 5973, BS 8110, …) |
| `sections[].part1.references.aci[]` | EXTRACT | American Concrete Institute (ACI 117, 301, 318, 347R) |
| `sections[].part1.references.astm[]` | EXTRACT | ASTM standards |
| `sections[].part1.references.en[]` | EXTRACT | European Norms (EN 197-1, EN 206-1, EN 10204, …) |
| `sections[].part1.references.other[]` | EXTRACT | Concrete Society Technical Report 13 etc. |
| `sections[].part1.relatedSections[].code` | EXTRACT | cross-references to other sections |
| `sections[].part1.relatedSections[].title` | EXTRACT | |
| `sections[].part1.submittals[]` | EXTRACT | numbered list of submittals required |
| `sections[].part1.qualityAssurance[]` | EXTRACT | QA requirements |
| `sections[].part1.preconstructionTesting` | EXTRACT | required tests pre-construction |
| `sections[].part1.deliveryStorageHandling[]` | EXTRACT | logistics requirements |
| `sections[].part1.fieldConditions[]` | EXTRACT | site-condition controls |
| `sections[].part1.warranty.years` | EXTRACT | "15 years" or section-specific |
| `sections[].part1.warranty.scope` | EXTRACT | DLP / Special Warranty |

**Part 2 — Products (per section):**

| Field | Class | Notes |
| --- | --- | --- |
| `sections[].part2.subClauses[].label` | EXTRACT | "FORMWORK", "STEEL REINFORCEMENT", "CONCRETE MATERIALS", "ADMIXTURES", … |
| `sections[].part2.subClauses[].requirements[]` | EXTRACT | numbered list of product requirements |
| `sections[].part2.subClauses[].standards[]` | EXTRACT | per-product standards referenced |
| `sections[].part2.subClauses[].acceptedManufacturers[]` | EXTRACT | (or "as approved by Engineer") |

**Part 3 — Execution (per section):**

| Field | Class | Notes |
| --- | --- | --- |
| `sections[].part3.examination` | EXTRACT | |
| `sections[].part3.preparation` | EXTRACT | |
| `sections[].part3.installation[]` | EXTRACT | numbered list |
| `sections[].part3.fieldQualityControl` | EXTRACT | |
| `sections[].part3.cleaning` | EXTRACT | |
| `sections[].part3.protection` | EXTRACT | |

### 2.3 Appendix A — List of Approved Manufacturers

| Field | Class | Notes |
| --- | --- | --- |
| `approvedManufacturers[].sectionCode` | EXTRACT | which section the manufacturer applies to |
| `approvedManufacturers[].product` | EXTRACT | product name (e.g. "Cementitious coating") |
| `approvedManufacturers[].manufacturer` | EXTRACT | brand / company |
| `approvedManufacturers[].model` | EXTRACT | model number / line |
| `approvedManufacturers[].countryOfOrigin` | EXTRACT | |
| `approvedManufacturers[].alternatives[]` | EXTRACT | acceptable alternatives |

---

## 3. Zod schema

```ts
export const specificationSchema = z.object({
  discipline: z.enum(["architectural", "landscape", "structural", "mep", "civil", "combined"]),
  author: z.string(),
  issuedAt: z.string().date(),
  version: z.string().optional(),
  format: z.enum(["csi-masterformat", "nbs", "bespoke"]),
  projectCode: z.string().optional(),
  sectionsTotal: z.number().int(),
  divisionsUsed: z.array(z.string()),

  sections: z.array(z.object({
    csiCode: z.string(),
    csiDivision: z.string(),
    title: z.string(),
    pageCount: z.number().int(),

    part1: z.object({
      relatedDocuments: z.string().optional(),
      sectionIncludes: z.string().optional(),
      references: z.object({
        bsi: z.array(z.string()).optional(),
        aci: z.array(z.string()).optional(),
        astm: z.array(z.string()).optional(),
        en: z.array(z.string()).optional(),
        other: z.array(z.string()).optional(),
      }),
      relatedSections: z.array(z.object({ code: z.string(), title: z.string() })),
      submittals: z.array(z.string()).optional(),
      qualityAssurance: z.array(z.string()).optional(),
      warranty: z.object({
        years: z.number().int().optional(),
        scope: z.string().optional(),
      }).optional(),
    }),

    part2: z.object({
      subClauses: z.array(z.object({
        label: z.string(),
        requirements: z.array(z.string()),
        standards: z.array(z.string()).optional(),
        acceptedManufacturers: z.array(z.string()).optional(),
      })),
    }),

    part3: z.object({
      installation: z.array(z.string()).optional(),
      fieldQualityControl: z.string().optional(),
      cleaning: z.string().optional(),
      protection: z.string().optional(),
    }),
  })),

  approvedManufacturers: z.array(z.object({
    sectionCode: z.string().optional(),
    product: z.string(),
    manufacturer: z.string(),
    model: z.string().optional(),
    countryOfOrigin: z.string().optional(),
    alternatives: z.array(z.string()).optional(),
  })),
})

export type Specification = z.infer<typeof specificationSchema>
```

---

## 4. Manual UI layout

```text
[Accordion: Technical Specification]
└── [Tabs: Manual | Upload]
    ├── Manual tab — read-only note
    │   "Specifications use CSI MasterFormat with 20+ sections × 3 parts each.
    │    Manual entry is not supported. Please use Upload."
    │   • Discipline                 (select — required to route the extractor)
    │   • Multi-spec note: "A project may have multiple Specification docs
    │      (one per discipline). Upload each separately."
    └── Upload tab
        Drop zone → AI extraction → preview:
            ✓ Discipline detected: Landscape
            ✓ Format: CSI MasterFormat 2012
            ✓ Sections found: 20
            ✓ Divisions: 03, 04, 05, 09, 11, 12, 13, 31, 32, 33
            ✓ Approved manufacturers (Appendix A): N entries
        [Save Specification]
```

---

## 5. Persistor mapping

New DB tables (see `BACKEND_PLAN.md` §16.4):

```ts
// One specification_doc per upload
const specDocId = await db.insert(specificationDocs).values({
  projectId,
  documentId: uploadedDoc.id,
  discipline: data.discipline,
  author: data.author,
  issuedAt: data.issuedAt,
  format: data.format,
  projectCode: data.projectCode,
  sectionsTotal: data.sectionsTotal,
  divisionsUsed: data.divisionsUsed,
})

// One specification_section per section
for (const section of data.sections) {
  await db.insert(specificationSections).values({
    specDocId,
    csiCode: section.csiCode,
    csiDivision: section.csiDivision,
    title: section.title,
    pageCount: section.pageCount,
    references: section.part1.references,
    relatedSections: section.part1.relatedSections,
    submittals: section.part1.submittals,
    warranty: section.part1.warranty,
    part1_text: stringify(section.part1),
    part2_text: stringify(section.part2),
    part3_text: stringify(section.part3),
  })
}

// One approved_manufacturer per Appendix A row
for (const manufacturer of data.approvedManufacturers) {
  await db.insert(specificationApprovedManufacturers).values({
    specDocId,
    sectionCode: manufacturer.sectionCode,
    product: manufacturer.product,
    manufacturer: manufacturer.manufacturer,
    model: manufacturer.model,
    countryOfOrigin: manufacturer.countryOfOrigin,
    alternatives: manufacturer.alternatives,
  })
}
```

---

## 6. Cross-doc validations

| Rule | Trigger | Severity |
| --- | --- | --- |
| `csiCode` uniqueness within a `specification_doc` | save | hard |
| `sections[].part1.references.*` standards align with `sopr.materials.standards.*` | save | soft |
| `approvedManufacturers[]` should cover every section that has product substitutions in bidder cover letters | save bidder cover letter | soft |
| `specification.sections[].title` must include the disciplines listed in `sopr.scope.elements[]` | save | soft |
| Multiple `specification_doc` rows per project allowed (one per discipline) | save | n/a |

---

## 7. Agent extraction notes

- **CSI MasterFormat detection.** First step is to detect the format from the section numbering pattern (6 digits → CSI MasterFormat 2012). If detected, route to the CSI extractor; otherwise fall back to bespoke.
- **TOC-first parsing.** The TOC gives us the section list with codes + titles + page numbers. Use it as a navigation index.
- **3-Part structure.** Each section follows the same Part 1 / Part 2 / Part 3 structure with sub-clauses (1.1, 1.2, ..., 2.1, 2.2, ..., 3.1, 3.2, ...). Use clause-pattern parsing.
- **References table parsing.** Look for "REFERENCES" sub-clause (typically 1.3). Standards are listed with their organisation prefix (BS XXXX, ACI XXX, EN XXXX, ASTM XXX). Group by organisation.
- **Related Sections.** Sub-clause 1.4 typically lists cross-references. Parse as `code + title` pairs.
- **Warranty (Sub-clause 1.8).** Look for "Warranty Period: N years" or "Special Warranty: …".
- **Approved Manufacturers.** Appendix A is a 2-column table: Product | Manufacturer. Sometimes section codes are in a 3rd column. Multi-row entries (one product, multiple manufacturers) are common.
- **Multi-discipline:** project may have separate spec docs (Architectural + Landscape + Structural + MEP). The extractor runs once per uploaded doc; the persistor creates one `specification_doc` per upload.

---

## 8. Sample evidence

Two samples observed:

**ADS-226 Architectural Specifications** (Aperture Design Studio, Nov 2025):
- 23 sections across CSI Divisions 03 (Concrete) / 04 (Masonry) / 05 (Metals) / 07 (Thermal & Moisture) / 08 (Openings) / 09 (Finishes)
- Each section has the 3-Part structure
- References BS / ACI / ASTM / EN extensively
- Appendix A — Approved Manufacturers list

**ADS-226 Landscape Specifications** (Aperture Design Studio, Nov 2025):
- 20 sections across CSI Divisions 03 / 04 / 05 / 09 / 11 (Equipment) / 12 (Furnishings) / 13 (Special Construction) / 31 (Earthwork) / 32 (Exterior Improvements) / 33 (Utilities)
- Same 3-Part structure
- Same standards bodies referenced
- Appendix A — Approved Manufacturers list

The Approved Manufacturers list is the **key product-substitution check** in Step 5 Technical Deviations. When a bidder offers an alternative manufacturer, the system cross-checks against this list.
