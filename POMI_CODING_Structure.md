# How the POMI Coding Workbook is Structured

**File:** `POMI_CODING_FINAL 1 (1).xlsx`
**Purpose:** An auto-coding tool that takes Bill of Quantities (BQ) item descriptions and assigns each one a **POMI code**, an **NRM code**, and a **measurement method**.
**Standard:** POMI = *Principles of Measurement (International)* — Sections A–R.

---

## 1. What this workbook does

You paste plain BQ item descriptions into one sheet. A Python script
(`pomi_auto_coder.py`) reads them, matches each against the POMI rulebook, and
writes back:

- the **POMI section** (A–R) and a 7-character **POMI code**,
- the equivalent **NRM code** + cost-group description,
- the **measurement method** (Area, Volume, Length, Item, etc.),
- a **confidence %**, flagging anything below 85% as `⚠ REVIEW`.

It is a *classification/coding* tool — it sits **upstream** of a priced BOQ.

---

## 2. The six tabs

| Tab | Role |
|-----|------|
| **HOW TO USE** | Step-by-step instructions & confidence-score guide |
| **BQ Coding Tool** | Main input/output sheet — paste descriptions, codes auto-fill |
| **CODING** | The full POMI rulebook (617 entries, Sections A–R, clause level) |
| **NRM** | Maps NRM cost groups → the POMI clauses that measure them |
| **POMI** | High-level section index (section → sub-section names) |
| **LOOKUP_DATA** | Hidden flat table the script reads to do the matching |

---

## 3. The POMI section index (`POMI` tab)

The top-level classification. 16 sections, each with named sub-sections.
Note `I` and `O` are skipped:

| Code | Section | | Code | Section |
|------|---------|---|------|---------|
| **A** | General Requirements | | **K** | Accessories |
| **B** | Site Work | | **L** | Equipment |
| **C** | Concrete Work | | **M** | Furnishings |
| **D** | Masonry | | **N** | Special Construction |
| **E** | Metalwork | | **P** | Conveying Systems |
| **F** | Woodwork | | **Q** | Mechanical Engineering Installations |
| **G** | Thermal & Moisture Protection | | **R** | Electrical Engineering Installations |
| **H** | Doors and Windows | | | |
| **J** | Finishes | | | |

---

## 4. The coding structure (`CODING` tab)

This is the rulebook. It breaks each section into **three nested levels** plus
the verbatim POMI clause text:

| Column | Meaning |
|--------|---------|
| POMI Section | A–R |
| Sub Section L1 | Level-1 sub-section number |
| Sub Section L2 | Level-2 number |
| Sub Section L3 | Level-3 number |
| POMI CODING STRUCTURE | The clause text / heading |

Example, drilling into Section A → Restrictions:

```
A | 3 | 0 | 0   Restrictions
A | 3 | 1 | 0     Particulars shall be given of any restrictions, which shall include:
A | 3 | 1 | 1       1. Access to and possession or use of the site
A | 3 | 1 | 2       2. Limitations of working space
A | 3 | 1 | 3       3. Limitations of working hours
```

---

## 5. The POMI code format

The three levels collapse into a **7-character code**: `Section + L1 + L2 + L3`,
each level zero-padded to 2 digits.

```
  A   03    01    01
  │   │     │     └── L3  (sub-item, e.g. "Limitations of working hours")
  │   │     └──────── L2  (sub-section)
  │   └────────────── L1  (sub-section group)
  └────────────────── Section letter
```

| Full code | Meaning |
|-----------|---------|
| `A000000` | Section A — General Requirements (section header) |
| `A010000` | A1 Conditions of contract |
| `A030101` | A3.1.1 Restrictions → Access to/possession of the site |
| `C030000` | C3 Reinforcement |
| `J020000` | J2 Backgrounds |
| `B090000` | B9 Excavation |

Levels set to `0` mean "this is a heading at a higher level," so trailing zeros
indicate how general/specific the code is.

---

## 6. NRM cross-mapping (`NRM` tab)

POMI is a *method of measurement*; **NRM** is a *cost-classification* standard.
This tab maps each NRM cost group to the POMI clauses that measure it, and the
unit used:

| NRM Group | NRM Code | NRM Description | POMI clauses → method |
|-----------|----------|-----------------|-----------------------|
| Substructure | 1.01 | Substructure | B8 Earthworks, excavation… |
| Superstructure | 2.01 | Frame | C2.1 Poured concrete (volume), C3 Reinforcement (weight), C4 Shuttering (area) |
| Superstructure | 2.05 | External Walls | C2.1 walls (volume) + reinforcement |
| Internal Finishes | 3.01 | Wall Finishes | J2 Backgrounds (area), J3 Finishings |
| FF&E | 4.01 | Furniture, Fittings & Equipment | M1 Furnishings (item/enumerated) |
| Mechanical | 5.04 | Water Installations | Q2.1 pipework (length), Q2.3 valves (enumerated) |
| Electrical | 5.08 | Electrical Installations | R2/R3 cable & conduit (length) |

So one BQ item gets both a **POMI code** (how it's measured) and an **NRM code**
(which cost group it rolls into).

---

## 7. The main working sheet (`BQ Coding Tool`)

Layout: a **Project Info** block (rows 4–6) then a 200-row coding table starting
at row 9.

**You fill (input):**

| Col | Field |
|-----|-------|
| B | BQ Ref |
| C | Trade |
| D | Item Type |
| **E** | **BQ Description ← paste here** |
| L / M / N | Unit / Quantity / Rate (optional) |

**Script fills (output) — do not type in F–P:**

| Col | Field |
|-----|-------|
| F | POMI Section |
| G | POMI Code |
| H | POMI Sub-Section Name |
| I | NRM Code |
| J | NRM Description |
| K | Measurement Method |
| O | Amount (= Qty × Rate, auto) |
| Q | `⚠ REVIEW` flag if confidence < 85% |
| R | Override Code (manual correction) |

**Worked examples already in the sheet:**

| BQ Description | POMI Code | Section | NRM | Method |
|----------------|-----------|---------|-----|--------|
| Reinforced concrete suspended slab 200mm thick incl. formwork & reinforcement | `C030000` | C3 Reinforcement | 2.01 Frame | — |
| Ceramic wall tiles 150×150mm fixed with adhesive | `J020000` | J2 Backgrounds | 3.01 Internal Finishes | Area (m²) |
| Excavation to reduce levels not exceeding 2m deep | `B090000` | B9 Excavation | 8.01 Site Works | Volume |

---

## 8. `LOOKUP_DATA` — the engine table

A hidden flat lookup the script matches against. One row per code with every
field pre-joined:

`Section | L1 | L2 | L3 | FullCode | Description | NRM_Code | NRM_Desc | Measurement`

e.g. `A | 3 | 1 | 1 | A030101 | "1. Access to and possession of the site" | 9.01 | Preliminaries / General Requirements | Item`

The coder looks up the best-matching description here, returns its `FullCode`,
`NRM_Code`, and `Measurement`, and scores the match confidence.

---

## 9. Workflow & confidence scoring

```
Paste BQ descriptions (Col E)
        ↓
Run:  python pomi_auto_coder.py POMI_CODING_FINAL.xlsx
        ↓
Match each description → LOOKUP_DATA  →  POMI code + NRM code + method + confidence
        ↓
Filter Col Q for ⚠ REVIEW  →  fix in Col R (Override)
        ↓
Enter Qty (M) & Rate (N)  →  Amount (O) + grand total (row 209)
```

**Confidence bands:**

| Score | Meaning |
|-------|---------|
| 95–99% | Exact / near-exact — reliable |
| 85–94% | Good — verify once |
| 70–84% | Partial — ⚠ review against CODING tab |
| < 70% | Weak — manual coding recommended |

> General rule: accept ≥ 85% automatically, review everything below 85% by hand.

---

## 10. How it relates to a priced BOQ

```
POMI Coding Tool (this file)            Priced BOQ (e.g. Citywalk Plot 5.11)
─────────────────────────────          ────────────────────────────────────
classify each item:                     organise & price items:
  description → POMI code                 Bills → Sections (A–R) → Items
  description → NRM cost group            Item = Qty × Rate = Amount
  description → measurement method        Section/Bill/Main summaries → Contract Sum
```

This workbook is the **coding/classification layer**; it standardises how each
BQ line is identified so it can then be measured, grouped by NRM cost element,
and priced consistently in the BOQ itself.
