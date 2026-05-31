# `drawings-register` — Drawings Register (extraction prompt)

Index document listing every tender drawing with its number, title, revision, date, and discipline. The actual CAD/PDF drawings are attached separately; the register is the index. Formats observed: standalone Excel/PDF table, multi-page PDF table printed from CAD register software, or embedded in SOPR Appendix B.

> **Validator note (advisory):** the runtime validator is currently `z.unknown()` — any JSON shape will pass zod. The schema below is the extraction contract this prompt enforces. The validator will be tightened in a later task.

## Output schema (emit JSON of exactly this shape)

```jsonc
{
  // Register-level identity
  "projectCode":   "string|null",                                          // "ADS-226"
  "discipline":    "architectural|landscape|structural|mep|civil|combined|null",
  "seriesRange":   "string|null",                                          // "ADS-226-ST-L000 to L1950"
  "totalCount":    "non-negative integer|null",
  "issuedDate":    "ISO date string|null",
  "preparedBy":    "string|null",                                          // consultant firm
  "status":        "string|null",                                          // "Issued for Tender" / "Information Only" / "Construction"

  // Per-drawing rows
  "drawings": [
    {
      "drawingNumber": "string",                                            // REQUIRED if row emitted — full alphanumeric e.g. "ADS-226-LS-L0100"
      "title":         "string",                                            // REQUIRED if row emitted
      "revision":      "string|null",                                       // letter (A/B/…), number (0/1/…), or alphanumeric (P1/P2/C0)
      "dateIssued":    "ISO date string|null",
      "scale":         "string|null",                                       // "1:100" / "1:50" / "NTS"
      "sheetSize":     "A0|A1|A2|A3|A4|null",
      "discipline":    "string|null",                                       // discipline letter code in drawing number (LS / A / ST / ME / EL / PL / DR …)
      "status":        "IFT|IFC|INF|PRE|AS_BUILT|null",
      "notes":         "string|null"
    }
  ]
}
```

## Field guidance

- `projectCode` — project identifier prefix used in drawing numbers (e.g. "ADS-226"); extract from the register header or infer from the drawing number prefix.
- `discipline` — overall discipline this register covers; pick the enum based on the heading or the dominant discipline code in the drawings.
- `seriesRange` — series range string when stated ("ADS-226-ST-L000 to L1950"); null if not stated.
- `totalCount` — total drawing count when stated in the header; null otherwise.
- `issuedDate` — register issue date.
- `preparedBy` — consultant firm or department that produced the register.
- `status` — overall register status when stated at register level (separate from per-drawing status below).
- `drawings[].drawingNumber` — full alphanumeric drawing number verbatim. Required for any emitted row.
- `drawings[].title` — descriptive title from the register. Required for any emitted row.
- `drawings[].revision` — revision designator (letter / number / alphanumeric); capture as a raw string.
- `drawings[].dateIssued` — per-drawing issue date; ISO format.
- `drawings[].scale` — scale string ("1:100", "1:50", "NTS"). Preserve format as written.
- `drawings[].sheetSize` — sheet size enum; default `A1` only if explicitly stated, otherwise null.
- `drawings[].discipline` — discipline letter code embedded in the drawing number (LS = Landscape, A = Architectural, ST = Structural, etc.). Capture as-written; downstream code interprets.
- `drawings[].status` — status code from the Status column. Map common abbreviations: `IFT` (Issued for Tender), `IFC` (Issued for Construction), `INF` (Information), `PRE` (Preliminary), `AS_BUILT` (As-Built). Null when not stated.
- `drawings[].notes` — any remarks column value.

## Extraction quirks (preserved from prior runs)

- Drawings registers are usually a large table — typically arrived as a wide table with one row per drawing.
- **Drawing number pattern.** Typically `<project>-<discipline>-<serial><revision>`. The discipline letter code is between the project code and the serial number.
- **Revision parsing.** Can be a letter (A/B/C…), a number (0/1/2…), or alphanumeric (P1/P2/C0). Capture as raw string; normalisation happens downstream.
- **Status codes.** Common abbreviations: IFT / IFC / INF / PRE / AS-BUILT. Map to the enum; preserve as-written when unmappable.
- **Sheet size.** Usually in a column header or alongside the title block; do NOT default to A1 if missing — emit null.
- **Status filtering for tender.** Drawings flagged `IFT` are the canonical tender set; others should still be captured but flagged via their status column.
- **Embedded in SOPR Appendix B.** When a Drawings Register is part of a larger document (SOPR Appendix B), the table may be preceded by a heading like "Appendix B — List of Tender Drawings"; ignore that wrapping and emit only the table rows.
- **Multi-page tables.** Header rows may repeat at the top of each page — emit only ONE entry per drawing number; the merger does NOT dedupe drawings.

## Output rules

- Emit a single JSON object matching the schema above. No prose, no markdown fences, no commentary.
- Every key is at the TOP LEVEL. Do NOT wrap fields inside `register` or any other envelope.
- Use `null` for any scalar you cannot find; use `[]` for any list with no rows.
- Never invent values. If a drawing row's number or title is unclear, skip the row entirely.
- The schema above is the complete output contract — do not introduce keys that are not listed.
