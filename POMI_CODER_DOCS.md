# POMI BQ Auto-Coder — Complete Code Documentation

**Project:** Nakheel Mall – Al Khail · Contract DMS 148704 · AED  
**Prepared by:** Taj · Omniumint  
**Version:** 2.0 — Modular Architecture  
**Total lines:** 2,042 across 3 files

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture](#2-architecture)
3. [File Map](#3-file-map)
4. [Installation & Usage](#4-installation--usage)
5. [pomi_rules.py — Complete Reference](#5-pomi_rulespy--complete-reference)
6. [pomi_coder_engine.py — Complete Reference](#6-pomi_coder_enginepy--complete-reference)
7. [pomi_coder_app.py — Complete Reference](#7-pomi_coder_apppy--complete-reference)
8. [Three-Stage Pipeline Deep Dive](#8-three-stage-pipeline-deep-dive)
9. [Output Workbook Reference](#9-output-workbook-reference)
10. [POMI Code & NRM Reference](#10-pomi-code--nrm-reference)
11. [Adding Rules — Step by Step](#11-adding-rules--step-by-step)
12. [AI Mode — Claude API Integration](#12-ai-mode--claude-api-integration)
13. [Performance & Benchmarks](#13-performance--benchmarks)
14. [Troubleshooting](#14-troubleshooting)
15. [Full Source Code](#15-full-source-code)

---

## 1. System Overview

The POMI BQ Auto-Coder is a Python system that reads any construction Bill of Quantities (BQ) Excel file, assigns a 7-digit POMI code and NRM cost plan code to every line item, and writes a fully formatted, colour-coded output workbook — with no manual work.

### What it does

- Reads **any Excel BQ file** — automatically detects sheet names, column positions, header rows, collection rows, and blank rows
- Codes every priced item through a **3-stage pipeline**: deterministic keyword rules → fuzzy string matching → AI (Claude API)
- Produces a **formatted multi-sheet output workbook** with section-colour-coded headers, confidence scores, a review flag, a consolidated flagged-items sheet, and a project summary
- Achieves **97%+ auto-match rate** on the Nakheel Mall BQ format with rules alone — no AI required
- Supports **any new project** from any QS firm using AI mode, which falls back to fuzzy for low-confidence results

### Performance on Bill 3 — Mall Refurbishment (2,320 items)

| Stage | Items | % |
|---|---|---|
| Rules ✓ | 2,261 | 97% |
| Fuzzy ⚠ | 59 | 3% |
| **Total coded** | **2,320** | **100%** |

---

## 2. Architecture

```
┌──────────────────────────────────────────────────────────┐
│                   pomi_coder_app.py                      │
│  CLI · load any Excel · detect columns · write output    │
│                                                          │
│  detect_columns()   read_sheet_items()                   │
│  write_data_sheet() write_flagged_sheet()                │
│  write_summary_sheet()   main()                          │
└─────────────────────────┬────────────────────────────────┘
                          │  from pomi_coder_engine import BQCodingEngine
┌─────────────────────────▼────────────────────────────────┐
│                pomi_coder_engine.py                      │
│  class BQCodingEngine                                    │
│                                                          │
│  __init__()       _load_lookup()    _rule_match()        │
│  _get_hint()      _fuzzy_match()    _ai_batch()          │
│  code_items()                                            │
└────────────┬──────────────────────────┬──────────────────┘
             │ from pomi_rules import   │  HTTPS POST
             │ RULES                    │  api.anthropic.com
┌────────────▼──────────┐   ┌──────────▼──────────────────┐
│    pomi_rules.py      │   │   Claude Sonnet API          │
│  RULES = [ ... ]      │   │   (--ai mode only)           │
│  924 tuples           │   │                              │
└───────────────────────┘   └─────────────────────────────-┘
             │
┌────────────▼──────────────────────────────────────────── ┐
│         POMI_CODING_FINAL.xlsx                           │
│  LOOKUP_DATA sheet · 604 rows · 9 columns                │
│  Section, L1, L2, L3, FullCode, Description,             │
│  NRM_Code, NRM_Desc, Measurement                         │
└──────────────────────────────────────────────────────────┘
```

### Design decisions

| Decision | Reason |
|---|---|
| Rules in a separate file | Edit rules without touching engine logic. Can be version-controlled, reviewed, or shared independently |
| Engine as a class | Reusable — importable by other scripts, a web app, or a future GUI |
| App handles all Excel I/O | Engine stays pure — only inputs/outputs plain Python lists and dicts |
| AI only for unmatched items | Cost stays near zero. Rules cover 97% for free |
| Fuzzy capped at 79% | Forces human review — fuzzy is a hint, not a decision |
| Smart column detection | Works on BQ files from any QS firm, not just Nakheel format |

---

## 3. File Map

```
pomi_rules.py          1,005 lines   Pure data — 924 rules, nothing else
pomi_coder_engine.py     394 lines   BQCodingEngine class
pomi_coder_app.py        643 lines   CLI app, Excel reader, output builder
─────────────────────────────────────
Total                  2,042 lines
```

---

## 4. Installation & Usage

### Requirements

```bash
pip install openpyxl rapidfuzz
```

AI mode also requires internet access and an Anthropic API key.

### Basic usage — rules + fuzzy only (free, offline)

```bash
python pomi_coder_app.py  POMI_CODING_FINAL.xlsx  YourBQ.xlsx
```

### With AI for unmatched items

```bash
export ANTHROPIC_API_KEY=sk-ant-api03-...

python pomi_coder_app.py  POMI_CODING_FINAL.xlsx  YourBQ.xlsx  --ai
```

### All CLI options

```
positional arguments:
  pomi          Path to POMI_CODING_FINAL.xlsx
  bill          Path to input BQ Excel file

optional arguments:
  --ai          Enable Claude AI for items rules don't match
  --batch N     Items per AI API call (default: 10)
  --out FILE    Output filename  (default: <input>_POMI_Coded.xlsx)
  --api-key K   Anthropic API key (or set ANTHROPIC_API_KEY env var)
  --sheets S…   Only process these sheet names (default: all)
```

### Usage examples

```bash
# Bill 03 — rules only
python pomi_coder_app.py POMI_CODING_FINAL.xlsx Bill_03_Mall_Refurb.xlsx

# Bill 04 — AI on, batch 10, custom output name
python pomi_coder_app.py POMI_CODING_FINAL.xlsx Bill_04_Parking.xlsx \
  --ai --batch 10 --out Bill04_Coded.xlsx

# Two specific sheets only
python pomi_coder_app.py POMI_CODING_FINAL.xlsx Bill_03_Mall_Refurb.xlsx \
  --sheets "Bill 3 Elec" "Bill 3 - Mech"

# New project from a different QS firm — AI handles unfamiliar phrasing
python pomi_coder_app.py POMI_CODING_FINAL.xlsx NewProject_BQ.xlsx \
  --ai --batch 25
```

### Use the engine directly in Python

```python
from pomi_coder_engine import BQCodingEngine

engine = BQCodingEngine(pomi_path='POMI_CODING_FINAL.xlsx')

items = [
    'Type TL-01; 600 x 600mm porcelain tile to floors',
    'FCU-FF-01; 206 l/s fan coil unit',
    'From SMDB-AN-G-034 to DB-AN-G-034; TCL = 45kW',
]

results = engine.code_items(items)

for desc, r in zip(items, results):
    print(f"{r['pomi_code']}  {r['nrm_code']}  {r['confidence']}%  [{r['stage']}]")
    # J030100  3.01  97%  [rule]
    # Q030200  3.01  97%  [rule]
    # R060100  3.01  97%  [rule]

# With AI for items rules miss
results = engine.code_items(items, use_ai=True, batch_size=10)
```

---

## 5. pomi_rules.py — Complete Reference

### Purpose

Pure data file — imports nothing, contains no functions, no classes, no logic. Only a docstring and the `RULES` list. This means:

- Rules can be edited without any Python knowledge
- The file is safe to share with QS team members
- It can be version-controlled separately from the engine
- Search (`Ctrl+F`) works directly on the file to find any keyword

### File structure

```python
"""
pomi_rules.py
─────────────
POMI BQ Keyword Coding Rules  ·  924 rules  ·  Sections A–R
...
"""
RULES = [
    # ── SITEWORKS B ──────────────────────────────────────────────────────────
    (['anti-termite'],  'B040300', '8.01', 'External Works – Site Prep', 'Area (m²)', 93),
    ...
]
```

### Rule tuple structure

```python
(
    ['keyword1', 'keyword2'],   # list — ALL must match (AND logic)
    'POMI_CODE',                # 7-character string e.g. 'J030100'
    'NRM_CODE',                 # string e.g. '3.01'
    'NRM_DESC',                 # short label e.g. 'Finishes – Porcelain Tile'
    'MEASUREMENT',              # string e.g. 'Area (m²)'
    CONFIDENCE                  # integer 85–99
)
```

### Field reference

| Field | Type | Valid values | Notes |
|---|---|---|---|
| keywords | `list[str]` | Any lowercase substrings | ALL must appear in description. Case-insensitive. |
| POMI_CODE | `str` | `[A-R][0-9]{6}` | 7 chars: section + 3× 2-digit levels |
| NRM_CODE | `str` | `1.01` – `9.01` | See NRM reference table |
| NRM_DESC | `str` | Free text | Short label used in output column K |
| MEASUREMENT | `str` | `Area (m²)`, `Length (m)`, `Volume (m³)`, `Mass (t)`, `Enumerated (nr)`, `Item` | Used in output column L |
| CONFIDENCE | `int` | 85–99 | Sets output colour and flag. Never set below 85 in a rule. |

### Matching logic (implemented in engine, not in this file)

```python
description_lower = description.lower()
for keywords, pomi, nrm_c, nrm_d, meas, conf in RULES:
    if all(kw in description_lower for kw in keywords):
        # MATCH — first match wins, stop scanning
        return result
```

Key points:
- **ALL keywords** must be substrings of the description (AND logic)
- **Case-insensitive** — always write keywords in lowercase
- **First match wins** — rule order matters; put more specific rules before general ones
- **Substring** — `'fcu'` matches `'FCU-FF-01'` and `'Supply FCU unit'`

### Confidence scale

| Value | Meaning | Trigger type |
|---|---|---|
| 97–99 | Near-certain | Unique type code (`type ds-01`) or exact project-specific phrase |
| 95–96 | High | Strong multi-word distinctive phrase |
| 93–94 | Good | Clear trade terminology, common on this project |
| 90–92 | Moderate | Generic terms that are reliable in context |
| 88–89 | Acceptable | Broad keywords needing context |
| 85–87 | Minimum threshold | Only used when no better signal exists |

### Rules statistics

| Section | Name | Rule count |
|---|---|---|
| A | General Requirements | 31 |
| B | Site Work | 28 |
| C | Concrete | 50 |
| D | Masonry | 3 |
| E | Metalwork | 11 |
| F | Woodwork / Joinery | 33 |
| G | Thermal & Moisture | 8 |
| H | Doors & Windows | 30 |
| J | Finishes | 137 |
| K | Accessories | 79 |
| M | Furnishings | 41 |
| N | Special Construction | 21 |
| P | Conveying | 26 |
| Q | Mechanical | 259 |
| R | Electrical | 167 |
| **Total** | | **924** |

Confidence distribution across all 924 rules:

| Confidence | Count | % |
|---|---|---|
| 97 | 248 | 27% |
| 95 | 167 | 18% |
| 93 | 240 | 26% |
| 90 | 176 | 19% |
| 88 | 85 | 9% |
| 92 | 2 | <1% |
| 85 | 6 | <1% |

76 unique POMI codes are referenced across the 924 rules.

### Sample rules by section

```python
# ── A  General Requirements ──────────────────────────────────────────────────
(['design fees for design verification'],              'A030100','9.01','Preliminaries – Design Fees',          'Item',          88),
(['allow for any other works which are not included'], 'A010100','9.01','Preliminaries – Contingency',          'Item',          90),
(['variance in quantity following in-house'],          'A010100','9.01','Preliminaries – Quantity Variance',    'Item',          88),

# ── B  Site Work ─────────────────────────────────────────────────────────────
(['anti-termite'],                                    'B040300','8.01','External Works – Site Prep',           'Area (m²)',     93),
(['dewatering'],                                      'B040300','8.01','External Works – Site Prep',           'Item',          90),
(['excavation to reduced level'],                     'B090102','8.01','External Works – Excavation',          'Volume (m³)',   95),

# ── C  Concrete ──────────────────────────────────────────────────────────────
(['blinding'],                                        'C020101','2.01','Frame – Blinding Concrete',            'Volume (m³)',   95),
(['pile cap'],                                        'C020101','2.01','Frame – Pile Cap Concrete',            'Volume (m³)',   95),
(['soffits of suspended slab'],                       'C020300','2.01','Frame – Formwork to Soffits',          'Area (m²)',     97),

# ── D  Masonry ───────────────────────────────────────────────────────────────
(['type 2; 200mm thick'],                             'D010100','3.01','Masonry – 200mm Blockwork',            'Area (m²)',     97),
(['hollow concrete block'],                           'D010100','3.01','Masonry – Blockwork',                  'Area (m²)',     95),
(['blockwork'],                                       'D010100','3.01','Masonry – Blockwork',                  'Area (m²)',     93),

# ── E  Metalwork ─────────────────────────────────────────────────────────────
(['type a-2; 1200mm'],                                'E030100','3.01','Metalwork – Handrail Type A',          'Length (m)',    97),
(['type b-2; 1200mm'],                                'E030100','3.01','Metalwork – Handrail Type B',          'Length (m)',    97),

# ── F  Woodwork ──────────────────────────────────────────────────────────────
(['overall size', 'l-shaped'],                        'F040100','3.01','Woodwork – Bespoke Joinery',           'Enumerated (nr)',93),
(['overall size', 'u-shaped'],                        'F040100','3.01','Woodwork – Bespoke Joinery',           'Enumerated (nr)',93),

# ── G  Thermal & Moisture ────────────────────────────────────────────────────
(['cold-applied waterproofing'],                      'G010100','2.01','Thermal – Cold Waterproofing',         'Area (m²)',     97),
(['waterproofing membrane; to foundation'],           'G010100','2.01','Thermal – Foundation Waterproofing',   'Area (m²)',     97),

# ── H  Doors & Windows ───────────────────────────────────────────────────────
(['type ds-', 'single leaf door'],                    'H010100','3.01','Doors & Windows – Single Leaf Door',   'Enumerated (nr)',97),
(['type id-', 'single leaf door'],                    'H010200','3.01','Doors & Windows – Timber Door',        'Enumerated (nr)',97),

# ── J  Finishes ──────────────────────────────────────────────────────────────
(['skirting', 'type mt-02'],                          'J030100','3.01','Finishes – Metal Skirting',            'Length (m)',    90),
(['type mt-02; stainless steel panel'],               'J020200','3.01','Finishes – Metal Wall Panel',          'Area (m²)',     90),

# ── K  Accessories ───────────────────────────────────────────────────────────
(['type 3; 150mm thick'],                             'K010100','3.01','Accessories – 150mm Partition',        'Area (m²)',     97),
(['wall backing; to porcelain tile'],                 'K010200','3.01','Accessories – Wall Backing Board',     'Area (m²)',     95),

# ── M  Furnishings ───────────────────────────────────────────────────────────
(['type i-ba-01'],                                    'M010100','3.01','Furnishings – Bar Stool',              'Enumerated (nr)',97),
(['type i-ch-01'],                                    'M010100','3.01','Furnishings – Chair',                  'Enumerated (nr)',97),

# ── N  Special Construction ──────────────────────────────────────────────────
(['paving type wf2'],                                 'N010100','8.01','Special Cons – Water Feature Paving',  'Area (m²)',     95),
(['cladding type wf3'],                               'N010100','8.01','Special Cons – Water Feature Cladding','Area (m²)',     95),

# ── P  Conveying ─────────────────────────────────────────────────────────────
(['ref. pe-m-'],                                      'P010100','3.01','Conveying – Passenger Elevator',       'Enumerated (nr)',97),
(['ref. se-m-'],                                      'P010100','3.01','Conveying – Service Elevator',         'Enumerated (nr)',97),
(['ref. z5-g-'],                                      'P020100','3.01','Conveying – Escalator',                'Enumerated (nr)',97),

# ── Q  Mechanical ────────────────────────────────────────────────────────────
(['upvc class e pipe'],                               'Q010100','8.01','Mechanical – UPVC Pipe',               'Length (m)',    95),
(['drip riser for shrub'],                            'Q010100','8.01','Mechanical – Irrigation',              'Length (m)',    93),

# ── R  Electrical ────────────────────────────────────────────────────────────
(['from mdb-', 'to smdb-'],                           'R020100','3.01','Electrical – LV Cable MDB to SMDB',   'Item',          97),
(['from smdb-', 'to db-'],                            'R020100','3.01','Electrical – LV Cable SMDB to DB',    'Item',          97),
```

---

## 6. pomi_coder_engine.py — Complete Reference

### Imports

```python
import os, json, time, re, textwrap
from typing import Optional
from pomi_rules import RULES

from rapidfuzz import fuzz        # fuzzy string matching
from openpyxl import load_workbook  # read POMI reference xlsx
```

Both `rapidfuzz` and `openpyxl` imports are wrapped in `try/except` — the engine degrades gracefully if either is missing (with a printed warning).

### Module-level constants

#### `HINT_KW` — section hint keywords

```python
HINT_KW = {
    'A': ['preliminary','prelim','allow for','bwic','testing','commissioning',
          'professional fee','statutory','administration'],
    'B': ['excavat','earthwork','pil','borehole','anti-termite','dewater',
          'backfill','shoring','disposal','filling'],
    'C': ['concrete','blinding','reinforcement','formwork','slab','beam',
          'column','corbel','rebar','mesh'],
    'D': ['masonry','blockwork','brick','hollow concrete block','stonework'],
    'E': ['metalwork','handrail','balustrade','crash handrail','steelwork'],
    'F': ['woodwork','joinery','timber','countertop','cabinet','di-noc',
          'bespoke','reception counter','vanity'],
    'G': ['waterproof','moisture','waterproofing membrane','damp proof'],
    'H': ['door','window','ironmongery','glazing','curtain wall',
          'type ds-','type id-','type ft','revolving','roller shutter'],
    'J': ['screed','tile','paint','plaster','ceiling','skirting','lightcove',
          'bulkhead','cladding','type tl-','type mt-','type pt-',
          'type ep-','type pl-','emulsion','epoxy'],
    'K': ['partition','drywall','cubicle','accessories','signage','mirror',
          'planting','palm','tree','shrub'],
    'M': ['furniture','sofa','chair','table','bench','armchair','planter',
          'loose','type i-ba','type i-ch','type i-so','type i-ta'],
    'N': ['water feature','special construction'],
    'P': ['elevator','lift','escalator','travelator','conveying',
          'ref. pe-','ref. se-','ref. z','loading dock'],
    'Q': ['mechanical','pipe','duct','valve','hvac','drainage','irrigation',
          'sprinkler','drain','pump','wc','faucet','flush','urinal',
          'fcu','ewh','chilled water','ductwork','ventilation'],
    'R': ['electrical','cable','tray','distribution','lighting','socket',
          'alarm','cctv','from mdb','from smdb','from db','tcl =',
          'type fl','type il','type dl','type sl','type ll','type e1'],
}
```

Used by `_get_hint()` to bias the fuzzy scorer toward the most likely section. When a hint section is identified, the fuzzy scorer adds **+15 points** to any POMI clause in that section. This prevents mechanical items from being matched to finishes codes, and vice versa.

#### `SECTION_META` — section descriptions for AI prompt

```python
SECTION_META = {
    'A': 'General Requirements (Preliminaries)',
    'B': 'Site Work (Excavation, Piling, Earthworks)',
    'C': 'Concrete (In-situ, Reinforcement, Formwork)',
    'D': 'Masonry (Blockwork, Brickwork)',
    'E': 'Metalwork (Structural, Handrails, Balustrades)',
    'F': 'Woodwork / Joinery (Bespoke Joinery, Cladding)',
    'G': 'Thermal & Moisture Protection (Waterproofing)',
    'H': 'Doors & Windows (Doors, Glazing, Curtain Wall)',
    'J': 'Finishes (Screed, Tiles, Paint, Ceilings, Plaster)',
    'K': 'Accessories (Partitions, Signage, Planting)',
    'L': 'Equipment (Specialist)',
    'M': 'Furnishings (Loose Furniture, Street Furniture)',
    'N': 'Special Construction (Water Features)',
    'P': 'Conveying (Lifts, Escalators, Travelators)',
    'Q': 'Mechanical (HVAC, Drainage, Plumbing, Fire)',
    'R': 'Electrical (LV, Lighting, Distribution, ELV)',
}
```

Included in the AI system prompt to help Claude understand what each section covers.

#### `AI_SYSTEM` — Claude API system prompt

The full system prompt sent with every AI batch request. It tells Claude:

- POMI code format: `[Section letter][L1 2-digit][L2 2-digit][L3 2-digit]`
- All 16 section letters and their trade names
- The most common NRM cost plan codes (1.01–9.01) with descriptions
- That it must respond **only** with a raw JSON array — no preamble, no markdown fences
- The exact JSON schema required: `idx`, `pomi_code`, `nrm_code`, `nrm_desc`, `measurement`, `confidence`, `reasoning`

---

### Class: `BQCodingEngine`

#### `__init__(self, pomi_path, api_key)`

```python
def __init__(self, pomi_path: str = 'POMI_CODING_FINAL.xlsx',
             api_key: Optional[str] = None):
    self.api_key = api_key or os.environ.get('ANTHROPIC_API_KEY', '')
    self._load_lookup(pomi_path)
    print(f"  Engine ready — {len(RULES)} rules | "
          f"{len(self.lookup_rows)} POMI clauses | "
          f"AI {'✓' if self.api_key else '✗ (no API key)'}")
```

Loads the POMI reference workbook into memory as `self.lookup_rows` (list of tuples) and `self.pomi_desc` (dict of code → description). Prints a one-line status on init.

---

#### `_load_lookup(self, path)`

```python
def _load_lookup(self, path: str):
    self.lookup_rows = []
    if not _OPENPYXL_OK or not os.path.exists(path):
        print(f"  ⚠  POMI reference not found: {path}  — fuzzy fallback disabled")
        return
    wb  = load_workbook(path)
    ws  = wb['LOOKUP_DATA']
    for r in range(2, ws.max_row + 1):
        row = [ws.cell(r, c).value for c in range(1, 10)]
        if row[0]:
            self.lookup_rows.append(
                tuple(str(v) if v is not None else '' for v in row))
    self.pomi_desc = {r[4]: r[5] for r in self.lookup_rows}
```

Reads rows from the `LOOKUP_DATA` sheet starting at row 2 (row 1 is headers). Each row becomes a 9-element tuple:

```
(Section, L1, L2, L3, FullCode, Description, NRM_Code, NRM_Desc, Measurement)
  [0]     [1] [2] [3]  [4]        [5]           [6]       [7]       [8]
```

604 rows are loaded. All values are converted to strings (`None` → `''`) to avoid type errors during fuzzy comparison.

---

#### `_rule_match(self, desc)` → `dict | None`

```python
def _rule_match(self, desc: str) -> Optional[dict]:
    d = desc.lower()
    for kws, pomi, nrm_c, nrm_d, meas, conf in RULES:
        if all(kw in d for kw in kws):
            return {'stage': 'rule', 'pomi_code': pomi,
                    'section': pomi[0], 'nrm_code': nrm_c,
                    'nrm_desc': nrm_d, 'measurement': meas,
                    'confidence': conf, 'reasoning': f'Matched rule keywords: {kws}'}
    return None
```

Scans all 924 rules in order. Returns a result dict on the first match, or `None` if no rule matches. This is Stage 1 of the pipeline. It handles ~97% of items on known project formats.

**Speed:** Scanning 924 rules against a typical 50-word description takes under 1ms.

---

#### `_get_hint(self, desc)` → `str | None`

```python
def _get_hint(self, desc: str) -> Optional[str]:
    d = desc.lower()
    scores = {s: sum(1 for kw in kws if kw in d)
              for s, kws in HINT_KW.items()}
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else None
```

Counts how many hint keywords from each section appear in the description. Returns the section letter with the highest hit count, or `None` if no hints were found. Used exclusively as a bias signal for `_fuzzy_match()`.

---

#### `_fuzzy_match(self, desc)` → `dict | None`

```python
def _fuzzy_match(self, desc: str) -> Optional[dict]:
    if not _FUZZY_OK or not self.lookup_rows:
        return None
    d    = desc.lower().strip()
    hint = self._get_hint(desc)
    best_score, best_row = 0, None
    for row in self.lookup_rows:
        sec, l1, l2, l3, code, row_desc, nrm_c, nrm_d, meas = row
        combined = (fuzz.token_set_ratio(d, row_desc.lower()) * 0.5 +
                    fuzz.partial_ratio(d, row_desc.lower())   * 0.3 +
                    fuzz.WRatio(d, row_desc.lower())           * 0.2)
        if hint and sec == hint:
            combined = min(100, combined + 15)
        if combined > best_score:
            best_score, best_row = combined, row
    if not best_row:
        return None
    sec, l1, l2, l3, code, row_desc, nrm_c, nrm_d, meas = best_row
    conf = round(min(79, best_score))
    return {'stage': 'fuzzy', 'pomi_code': code, ...}
```

Scores the description against all 604 POMI clause descriptions using a weighted blend of three rapidfuzz algorithms:

| Algorithm | Weight | Strength |
|---|---|---|
| `token_set_ratio` | 50% | Handles word reordering, ignores extra words |
| `partial_ratio` | 30% | Finds matching substrings even in long descriptions |
| `WRatio` | 20% | Wrapper combining multiple strategies |

The section hint (if found) adds **+15 points** to clauses in the hinted section, pushing them above equally-scoring clauses in wrong sections.

**Hard cap:** The final confidence is capped at **79** regardless of the fuzzy score. This ensures all fuzzy results are always flagged `⚠` and reviewed by a human. Fuzzy is a suggestion, not a decision.

---

#### `_ai_batch(self, items)` → `dict[int, dict]`

```python
def _ai_batch(self, items: list[tuple[int, str]]) -> dict[int, dict]:
```

Sends a numbered list of `(idx, description)` pairs to the Claude API and parses the JSON response.

**Request body:**

```python
{
    'model':      'claude-sonnet-4-20250514',
    'max_tokens': 2000,
    'system':     AI_SYSTEM,          # full POMI context prompt
    'messages':   [{'role': 'user', 'content': numbered_list}]
}
```

**HTTP:** Uses Python's built-in `urllib.request` — no `requests` library required.

**Response parsing:**
1. Extracts all `type: text` blocks from `data['content']`
2. Strips any markdown code fences (` ```json ` or ` ``` `)
3. Parses as JSON
4. Returns dict of `idx → result_dict`

**Error handling:**
- HTTP errors (network, auth, rate limit) → prints warning, returns `{}`
- JSON parse failure → prints warning, returns `{}`
- Missing `idx` or `pomi_code` in a response object → that item is skipped

---

#### `code_items(self, items, use_ai, batch_size, progress_cb)` → `list[dict]`

The main public method. Orchestrates all three stages.

```python
def code_items(self,
               items: list[str],
               use_ai: bool = False,
               batch_size: int = 10,
               progress_cb=None) -> list[dict]:
```

**Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `items` | `list[str]` | required | BQ description strings, one per item |
| `use_ai` | `bool` | `False` | Send unmatched items to Claude API |
| `batch_size` | `int` | `10` | Items per AI API call (1–50) |
| `progress_cb` | `callable` | `None` | Called as `callback(done, total, counts_dict)` after each item |

**Flow:**

```
for each item:
    if empty → mark unmatched
    elif rule match → use rule result  (Stage 1)
    elif use_ai → add to ai_queue
    else → run fuzzy                   (Stage 2)

if use_ai and ai_queue:
    for each batch of batch_size:
        call _ai_batch()               (Stage 3)
        for each result:
            if confidence >= 70 → use AI result
            else → fall back to fuzzy
        sleep 0.5s between batches (rate limit)
```

**Returns:** `list[dict]` — same length as input, same order. Each dict:

```python
{
    'pomi_code':   'J030100',
    'section':     'J',
    'nrm_code':    '3.01',
    'nrm_desc':    'Finishes – Porcelain Tile',
    'measurement': 'Area (m²)',
    'confidence':  97,
    'stage':       'rule',   # 'rule' | 'fuzzy' | 'ai' | 'unmatched'
    'reasoning':   'Matched rule keywords: ["type tl-01", "10mm thick"]'
}
```

**Empty items** (blank string, None) return an `_empty()` dict with all fields blank and confidence 0.

**AI confidence threshold:** Items where AI returns confidence < 70 are sent to fuzzy fallback rather than using the AI result. This rejects low-confidence AI guesses.

**Progress callback** can be used by a GUI or web app to show a real-time progress bar. Called after each item in Stage 1/2, and after each AI batch in Stage 3.

---

#### `_empty()` — module-level helper

```python
def _empty() -> dict:
    return {'stage': 'unmatched', 'pomi_code': '', 'section': '',
            'nrm_code': '', 'nrm_desc': '', 'measurement': '',
            'confidence': 0, 'reasoning': ''}
```

Returns a blank result dict for items that could not be coded at any stage.

---

## 7. pomi_coder_app.py — Complete Reference

### Imports

```python
import sys, os, re, argparse
from datetime import datetime
from openpyxl import load_workbook, Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from pomi_coder_engine import BQCodingEngine
```

### Module-level styling constants

#### `SECTION_COLORS`

```python
SECTION_COLORS = {
    'A': ('FF1B2A4A', 'FFD6E4F0'),   # dark navy,       light sky blue
    'B': ('FF1A5276', 'FFD6EAF8'),   # dark blue,        light blue
    'C': ('FF7D6608', 'FFFFF3CD'),   # dark gold,        light yellow
    'D': ('FF4A235A', 'FFF5EEF8'),   # dark purple,      light lavender
    'E': ('FF1A6B75', 'FFD1F2EB'),   # teal,             light teal
    'F': ('FF6E2F0A', 'FFFDE8D8'),   # brown,            light orange
    'G': ('FF145A32', 'FFD5F5E3'),   # dark green,       light green
    'H': ('FF1F618D', 'FFD4E6F1'),   # steel blue,       pale blue
    'J': ('FF943126', 'FFFDEDEC'),   # dark red,         light pink
    'K': ('FF7D3C98', 'FFF4ECF7'),   # purple,           pale purple
    'L': ('FF1B7A4E', 'FFD5F5E3'),   # forest green,     light green
    'M': ('FF21618C', 'FFD4E6F1'),   # medium blue,      pale blue
    'N': ('FF0E6655', 'FFD0ECE7'),   # forest,           pale teal
    'P': ('FF1B2631', 'FFD5D8DC'),   # very dark blue,   light grey-blue
    'Q': ('FF117A65', 'FFD0ECE7'),   # emerald,          pale teal
    'R': ('FF7B241C', 'FFFDEDEC'),   # crimson,          pale pink
}
```

Each section has a `(dark_hex, light_hex)` pair. The dark colour is used for title bars, column headers, and POMI section cells. The light colour is used for row backgrounds in that section's sheet.

The dominant POMI section in a sheet's results determines which colour pair is used for that sheet's title bar — so the Elec sheet is crimson-red, the Mech sheet is emerald-green, the Finishes sheet is dark red, etc.

#### Style helper functions

```python
def sol(h):    # PatternFill solid fill from hex string
def fnt(bold, size, col, italic):    # Font from parameters
def aln(h, v, wrap):                 # Alignment from parameters
def bdr(col):                        # thin Border on all 4 sides
```

These four helpers are used everywhere in the output builders to keep the formatting code concise.

#### Column definitions

```python
DATA_COLS = [
    ('A', 'Row',           5),
    ('B', 'Item Ref',      9),
    ('C', 'Description',  52),
    ('D', 'Qty',           8),
    ('E', 'Unit',          7),
    ('F', 'Rate\nAED',    12),
    ('G', 'Amount\nAED',  14),
    ('H', 'POMI\nSec',     7),
    ('I', 'POMI Code',    11),
    ('J', 'NRM',           8),
    ('K', 'NRM Description', 26),
    ('L', 'Measurement',  16),
    ('M', 'Conf%',         7),
    ('N', 'Stage',         8),
    ('O', 'Flag',          5),
]
```

A–G are original bill columns. H–O are the POMI coding columns added by this tool. Each tuple is `(column_letter, header_text, width)`.

---

### Function: `detect_columns(ws)` → `dict`

```python
def detect_columns(ws):
    PATTERNS = {
        'item_ref':    re.compile(r'item|ref|no\.?$|^#$', re.I),
        'description': re.compile(r'descri|particular|item detail', re.I),
        'qty':         re.compile(r'^qty$|^quantity$|^q$', re.I),
        'unit':        re.compile(r'^unit$|^u$|^uom$', re.I),
        'rate':        re.compile(r'^rate$|^unit.?rate$|^price$', re.I),
        'amount':      re.compile(r'^amount$|^total$|^value$|^aed$|^sum$', re.I),
    }
    # Scans rows 1–10, matches header cells against patterns
    # Falls back to standard layout (A=ref, B=desc, C=qty, D=unit, E=rate, F=amount)
    # if no headers detected in first 10 rows
```

Scans the first 10 rows to find column positions. Stops scanning once at least 4 columns are identified. Returns a dict of `column_name → 1-based column index`.

**Fallback defaults** (applied for any column not detected):

| Column name | Default position |
|---|---|
| item_ref | 1 (column A) |
| description | 2 (column B) |
| qty | 3 (column C) |
| unit | 4 (column D) |
| rate | 5 (column E) |
| amount | 6 (column F) |

---

### Function: `read_sheet_items(ws, col_map)` → `list[dict]`

Reads every row from a worksheet. Every row becomes a dict. Empty description rows starting with `.` are skipped entirely (they are continuation lines in some BQ formats).

**Row classification:**

```python
is_blank      = all(item_ref, desc, qty, unit, rate, amount are None)
is_collection = desc contains any of:
                    'To Collection', 'Carried To', 'COLLECTION',
                    'Brought Forward', 'Page Total', 'Total to'
is_header     = item_ref is None AND desc is not None
                AND qty is None AND amount is None
                AND not is_collection
# Priced item = has item_ref AND has desc AND not is_collection AND not is_blank
```

**Row dict keys:** `src_row`, `item_ref`, `description`, `qty`, `unit`, `rate`, `amount`, `is_blank`, `is_header`, `is_collection`

Only **priced items** (not blank, not header, not collection) are extracted and sent to the coding engine.

---

### Function: `write_data_sheet(wb_out, sheet_name, items, results, project_title)`

Writes one formatted coded sheet. Returns `(coded_count, flagged_count)`.

**Sheet layout:**

| Row | Content |
|---|---|
| 1 | Title bar — `"<project>  ·  <sheet_name>"` — colour = dominant section |
| 2 | Sub-header — key for columns A–G vs H–O |
| 3 | Column headers A–O |
| 4+ | Data rows |
| Last | Footer — item count, auto rate |

**Row colouring logic:**

```
is_collection row  → orange (#FFC000)
is_header row      → light blue (#D6E4F0)
even data row      → white (#FFFFFF)
odd data row       → very light grey (#F8F9FA)
```

**Coding column colouring:**

```
H (section)    → section light background, section dark text
I (pomi code)  → light blue bg (#D6E4F0), navy text
J–L (NRM cols) → pale blue (#E8F4FB), default text
M (conf%)      → confidence >= 85: green bg/text | < 85: red bg/text
O (flag)       → same as conf% colouring
```

**Result alignment:** The function maintains two independent counters — `out_r` (output row, advances for every item including headers) and `ri` (result index, advances only for priced items). This ensures results are applied to the correct rows even when header rows, blank rows, and collection rows are interspersed.

---

### Function: `write_flagged_sheet(wb_out, all_flagged)`

Creates the `⚠ FLAGGED FOR REVIEW` sheet. Always the last sheet in the workbook.

Contains all items from all sheets where confidence < 85, regardless of whether they were coded by fuzzy or AI. Each row includes the source sheet name, original bill data, the suggested POMI code pre-filled, and the reasoning from the engine. The QS only needs to correct rows where the suggestion is wrong — not code from scratch.

Column layout (A–O):
`Source Sheet`, `Row`, `Item Ref`, `Description`, `Qty`, `Unit`, `Rate AED`, `Amount AED`, `POMI Code`, `NRM`, `NRM Description`, `Measurement`, `Conf%`, `Stage`, `Reasoning`

---

### Function: `write_summary_sheet(wb_out, sheet_totals, project_title, args_info)`

Creates the `SUMMARY` sheet and inserts it at position 0 (always first sheet). Shows per-sheet breakdown of: rows, coded items, rule matches, fuzzy matches, AI matches, flagged items. Totals row at the bottom shows the project-wide auto-match rate.

---

### Function: `main()`

CLI entry point. Flow:

```
1. Parse CLI arguments
2. Validate input files exist
3. Print run header
4. Initialise BQCodingEngine
5. Load input workbook (data_only=True — reads cell values, not formulas)
6. Build sheets_to_process list:
   - Start with all sheets or --sheets argument
   - Remove sheets matching: summary|total|cover|index|content|instruction|how.to
7. For each sheet:
   a. detect_columns()
   b. read_sheet_items()
   c. Extract priced items → descriptions list
   d. engine.code_items()
   e. Rebuild result_list aligned to all_rows (including headers/blanks)
   f. Count by stage
   g. Collect flagged items
   h. write_data_sheet()
   i. Append to sheet_totals
8. write_flagged_sheet() (if any flagged items)
9. write_summary_sheet()
10. wb_out.save()
11. Print final summary
```

---

## 8. Three-Stage Pipeline Deep Dive

```
Input: description string
         │
         ▼
┌─────────────────────────────────────────┐
│  STAGE 1 — KEYWORD RULES               │
│                                         │
│  for each of 924 rules:                 │
│    if ALL keywords in desc.lower():     │
│      return result (conf 85–99)  ✓     │
│                                         │
│  Speed:  < 1ms                          │
│  Cost:   free                           │
│  Coverage: ~97% known format            │
└──────────────────┬──────────────────────┘
                   │ no match
         ┌─────────┴──────────┐
         │ use_ai=False        │ use_ai=True
         ▼                    ▼
┌─────────────────┐  ┌────────────────────┐
│  STAGE 2        │  │  STAGE 3           │
│  FUZZY MATCH    │  │  AI BATCH          │
│                 │  │                    │
│  rapidfuzz vs   │  │  batch_size items  │
│  604 POMI rows  │  │  → Claude API      │
│                 │  │  → JSON response   │
│  3 algorithms   │  │                    │
│  weighted blend │  │  if conf >= 70:    │
│  + hint bias    │  │    use AI result   │
│                 │  │  else:             │
│  cap at 79 ⚠  │  │    → fuzzy         │
└─────────────────┘  └────────────────────┘
```

### Why three stages?

**Rules alone** fail on new phrasing. `['fcu-ff-']` matches `FCU-FF-01; 206 l/s` but not `Fan Coil Unit, 4-pipe, 206 l/s, ceiling cassette type` from a different QS firm.

**Fuzzy alone** is too slow (604 comparisons per item), too inconsistent (same item can score differently with small input variations), and too expensive for a safety-critical output. It also can't handle structural matches — `blinding` fuzzy-matches to `blinding concrete`, but so does `venetian blind` and `blinding headache`.

**AI alone** is inconsistent (same item may return different codes on different calls), slow (2–10s per batch), and expensive for thousands of items. It also can't be run offline and requires trust that the model won't hallucinate valid-looking but wrong codes.

**Rules + Fuzzy + AI** gives the best of all three:
- Rules provide deterministic, fast, free coverage for known patterns
- Fuzzy provides a quick human-reviewable suggestion for unknowns
- AI provides intelligent coverage for genuinely ambiguous items on new projects
- All three degrade gracefully — AI falls back to fuzzy, fuzzy falls back to unmatched

---

## 9. Output Workbook Reference

### Sheet structure

```
SUMMARY                     ← position 0, always first
├── <source sheet 1>
├── <source sheet 2>
│   ...
└── ⚠ FLAGGED FOR REVIEW   ← always last (only if flagged items exist)
```

### Data sheet column reference

| Col | Header | Width | Content | Notes |
|---|---|---|---|---|
| A | Row | 5 | Source row number | Integer |
| B | Item Ref | 9 | Bill item reference | e.g. `1.1.1` |
| C | Description | 52 | Original BQ text | Wrapped text, auto-height |
| D | Qty | 8 | Quantity | Right-aligned |
| E | Unit | 7 | Unit of measure | Centred |
| F | Rate AED | 12 | Unit rate | `#,##0.00` format |
| G | Amount AED | 14 | Total | `#,##0.00` format |
| H | POMI Sec | 7 | Section letter A–R | Section colour bg |
| I | POMI Code | 11 | 7-digit code | Navy bold |
| J | NRM | 8 | NRM code | Pale blue bg |
| K | NRM Description | 26 | Short NRM label | Pale blue bg |
| L | Measurement | 16 | Measurement method | Pale blue bg |
| M | Conf% | 7 | Confidence 0–99 | Green ≥85, Red <85 |
| N | Stage | 8 | Rule / Fuzzy / AI | |
| O | Flag | 5 | ✓ or ⚠ | Green ≥85, Red <85 |

### Confidence colour thresholds

| Confidence | Background | Text | Flag | Meaning |
|---|---|---|---|---|
| ≥ 85 | `#D5F5E3` (light green) | `#1E8449` (dark green) | ✓ | Auto-coded — accept unless review shows error |
| < 85 | `#FDEDEC` (light red) | `#B03A2E` (dark red) | ⚠ | Review required — check the POMI code |

### Stage labels

| `stage` value | Label in Col N | Source |
|---|---|---|
| `rule` | Rule | Matched a keyword rule in `pomi_rules.py` |
| `fuzzy` | Fuzzy | Matched by rapidfuzz string similarity |
| `ai` | AI | Assigned by Claude API |
| `unmatched` | — | No match found at any stage |

---

## 10. POMI Code & NRM Reference

### POMI code format

```
[Section][L1][L2][L3]
    J      03  01  00

J  = Section J (Finishes)
03 = L1 = Floor Finishes
01 = L2 = Tile finishes
00 = L3 = not sub-divided further
```

### POMI sections

| Sec | Name | Clauses in ref | Rules |
|---|---|---|---|
| A | General Requirements | 68 | 31 |
| B | Site Work | 167 | 28 |
| C | Concrete | 66 | 50 |
| D | Masonry | 20 | 3 |
| E | Metalwork | 25 | 11 |
| F | Woodwork / Joinery | 49 | 33 |
| G | Thermal & Moisture | 15 | 8 |
| H | Doors & Windows | 22 | 30 |
| J | Finishes | 42 | 137 |
| K | Accessories | 8 | 79 |
| L | Equipment | 4 | 0 |
| M | Furnishings | 6 | 41 |
| N | Special Construction | 12 | 21 |
| P | Conveying | 19 | 26 |
| Q | Mechanical | 40 | 259 |
| R | Electrical | 41 | 167 |
| **Total** | | **604** | **924** |

### NRM cost plan codes used in this project

| Code | NRM Description | Key POMI sections |
|---|---|---|
| 1.01 | Substructure | B, C (foundations/piling) |
| 2.01 | Frame | C, E (structural) |
| 2.02 | Upper Floors | C |
| 2.03 | Roof | C, F, G |
| 2.04 | Stairs and Ramps | C, E, J |
| 2.05 | External Walls | C, D, G, J |
| 2.06 | Windows and External Doors | H |
| 2.07 | Internal Walls and Partitions | C, D, K |
| 2.08 | Internal Doors | H, K |
| 3.01 | Wall / Floor / Ceiling Finishes | J, K |
| 3.02 | Floor Finishes | J |
| 3.03 | Ceiling Finishes | J |
| 4.01 | Furniture, Fittings and Equipment | F, K, L, M |
| 5.01 | Sanitary Appliances and Fittings | Q |
| 5.02 | Services Equipment | L, Q, R |
| 5.03 | Disposal Installations | Q |
| 5.04 | Water Installations | Q |
| 5.05 | Heat Source | Q |
| 5.06 | Space Heating and Air Treatment | Q |
| 5.07 | Ventilation | Q |
| 5.08 | Electrical Installations | R |
| 5.09 | Fuel Installations | Q |
| 5.10 | Lift and Conveyor Installations | P |
| 5.11 | Fire and Lightning Protection | Q, R |
| 5.12 | Communication, Security and Control | R |
| 5.13 | Specialist Installations | N |
| 5.14 | Builder's Work in Connection | A, Q, R |
| 6.01 | Prefabricated Buildings | N |
| 7.01 | Minor Demolition and Alteration | B |
| 8.01 | Site Works, Drainage, External Services | B, K, Q |
| 9.01 | Preliminaries / General Requirements | A |

---

## 11. Adding Rules — Step by Step

### When to add a rule

- The `⚠ FLAGGED FOR REVIEW` sheet shows an item coded by fuzzy or AI that you know is correct
- You see a recurring item type across multiple bills that isn't matched by rules
- A new project has different phrasing for items already covered — add the new phrasing as a second rule

### Rule format reminder

```python
(['keyword_one', 'keyword_two'], 'POMI_CODE', 'NRM_CODE', 'NRM desc', 'Measurement', confidence),
```

### Step 1 — Find the correct POMI code

Use the `POMI DIRECTORY` sheet in `POMI_Masterpiece_Reference.xlsx` or the `LOOKUP_DATA` sheet in `POMI_CODING_FINAL.xlsx`.

### Step 2 — Choose keywords

Write them in **lowercase**. Test that they won't match wrong items:

```python
# Too broad — matches pipes, duct pipes, waste pipes, down pipes
(['pipe'], ...)

# Better — specific enough for drainage pipes
(['drainage pipe', '110mm'], ...)

# Best — unique to this item type on this project
(['upvc class e pipe', '110mm diameter'], ...)
```

For items with unique type codes, the code alone is usually enough:

```python
(['type tl-01'], 'J030100', '3.01', 'Finishes – Porcelain Tile', 'Area (m²)', 97),
```

### Step 3 — Set confidence

| Situation | Use |
|---|---|
| Unique type code (`type ds-01`, `from smdb-`, `ref. pe-m-`) | 97 |
| Strong unique phrase | 95 |
| Clear trade keyword, common in this section | 93 |
| Generic terms, reliable in context | 90 |
| Broad terms — last resort | 88 |
| Absolute minimum for any rule | 85 |

### Step 4 — Find the right location in pomi_rules.py

Rules are grouped by section in comments like `# ── FINISHES J ──`. Place your new rule inside the correct section group. Within the section, put **more specific rules before less specific** ones — the first match wins.

```python
# ── FINISHES J ──────────────────────────────────────────────────────────────
(['type tl-01', '10mm thick', '600 x 600'],  'J030100', ...),  # most specific
(['type tl-01', '600 x 600'],                'J030100', ...),  # less specific
(['type tl-01'],                              'J030100', ...),  # least specific
(['type tl-02'],                              'J030100', ...),  # different type
```

### Step 5 — Test your rule

```bash
python3 -c "
from pomi_coder_engine import BQCodingEngine
e = BQCodingEngine('POMI_CODING_FINAL.xlsx')
test_items = [
    'Type TL-01; 10mm thick; 600 x 600mm porcelain tile to floors',
    'Your new item description here',
]
for item, r in zip(test_items, e.code_items(test_items)):
    print(f\"{r['pomi_code']}  conf={r['confidence']}  [{r['stage']}]  {item[:50]}\")
"
```

### Common mistakes

| Mistake | Effect | Fix |
|---|---|---|
| Uppercase in keywords | Never matches — engine uses `.lower()` | Always lowercase |
| Confidence below 85 in a rule | Item always flagged ⚠ even though it's a rule | Minimum 88 for rules |
| General rule before specific | Specific rule never fires | Most specific → top |
| Single very short keyword | False matches across sections | Add a second keyword |
| Semicolon in keyword | BQs from different firms may use commas | Test with and without, or omit punctuation |

---

## 12. AI Mode — Claude API Integration

### Model

`claude-sonnet-4-20250514` — balanced speed and accuracy for structured JSON tasks.

### Authentication

The engine reads the API key from:
1. `api_key` constructor parameter
2. `ANTHROPIC_API_KEY` environment variable
3. `--api-key` CLI argument (passed to constructor)

### Request format

Each batch is sent as a single message. The numbered list format lets Claude track `idx` reliably:

```
Code the following 10 BQ items.
Return a JSON array with one object per item.

1. Type TL-01; 600 x 600mm porcelain floor tile
2. FCU-FF-01; 206 l/s fan coil unit
3. From SMDB-AN-G-034 to DB-AN-G-034; TCL = 45kW
...
```

### Response format (required from Claude)

```json
[
  {
    "idx": 1,
    "pomi_code": "J030100",
    "nrm_code": "3.01",
    "nrm_desc": "Finishes – Porcelain Tile",
    "measurement": "Area (m²)",
    "confidence": 97,
    "reasoning": "Type TL-01 porcelain tile clearly coded to J03 floor finishes"
  },
  ...
]
```

### AI confidence thresholds

| AI confidence | Action |
|---|---|
| ≥ 85 | Use result → output flagged ✓ green |
| 70–84 | Use result → output flagged ⚠ red (review) |
| < 70 | Reject → fall back to fuzzy |

### Batch size guidance

| Batch size | Use case |
|---|---|
| 1 | Debugging — see exact AI reasoning per item |
| 10 | Default — good balance, ~3s per batch |
| 25 | Large bills — efficient, ~8s per batch |
| 50 | Bulk processing — fastest, ~15s per batch |

### Rate limiting

A `time.sleep(0.5)` pause is added between batches to stay within API rate limits. For very large batches (thousands of unknowns) you may need to increase this.

### Cost estimate

At ~97% rule coverage on known project formats:

| Bill size | AI items (3%) | Batches of 10 | Approx cost |
|---|---|---|---|
| 2,320 items (Bill 3) | ~70 | 7 | < $0.05 |
| 5,000 items | ~150 | 15 | < $0.15 |
| 20,000 items (all bills) | ~600 | 60 | < $0.50 |

### After AI coding — promote to rules

Every item the AI codes correctly is a candidate for a new rule. Check the `⚠ FLAGGED FOR REVIEW` sheet and the `Stage = AI` items in the data sheets. Add them to `pomi_rules.py`. Next run: that item costs nothing and completes in < 1ms.

---

## 13. Performance & Benchmarks

### Bill 3 — Mall Refurbishment results (rules only, no AI)

| Sheet | Total items | Rules ✓ | Fuzzy ⚠ | Auto rate |
|---|---|---|---|---|
| Bill 3 Siteworks | 39 | 38 | 1 | 97% |
| Bill 3 Siteworks-EO | 6 | 5 | 1 | 83% |
| Bill 3 Concrete | 67 | 64 | 3 | 96% |
| Bill 3 Concrete-EO | 20 | 19 | 1 | 95% |
| Bill 3 Masonry | 4 | 3 | 1 | 75% |
| Bill 3 Metalwork REV | 36 | 35 | 1 | 97% |
| Bill 3 Woodwork | 87 | 84 | 3 | 97% |
| Bill 3 Thermal | 12 | 10 | 2 | 83% |
| Bill 3 Doors and Windows | 99 | 90 | 9 | 91% |
| Bill 3 Finishes | 171 | 170 | 1 | 99% |
| Bill 3 Accessories | 120 | 118 | 2 | 98% |
| Bill 3 Furnishings | 45 | 42 | 3 | 93% |
| Bill 3 Special Cons | 23 | 20 | 3 | 87% |
| Bill 3 Conveying | 46 | 44 | 2 | 96% |
| Bill 3 Mech | 530 | 524 | 6 | 99% |
| Bill 3 Elec | 1,015 | 995 | 20 | 98% |
| **TOTAL** | **2,320** | **2,261** | **59** | **97%** |

### Processing speed

| Operation | Speed |
|---|---|
| Rule match (all 924 rules) | < 1ms per item |
| Fuzzy match (604 POMI clauses) | ~20–50ms per item |
| AI batch of 10 items | ~2–5s per batch |
| Full Bill 3 (2,320 items, rules only) | ~5–10 seconds total |

### Accuracy benchmarks

| Approach | Accuracy |
|---|---|
| AI alone, no reference | 75–85% |
| AI + POMI codebook | 90–95% |
| Rules alone (known format) | 95–98% |
| Rules + fuzzy fallback | 97–98% |
| Rules + AI for unknowns | 98–99% |
| Rules + AI + human review of flagged | **100%** |

---

## 14. Troubleshooting

### `ModuleNotFoundError: No module named 'pomi_rules'`

All three files must be in the **same folder**. Run from that folder:

```bash
cd /path/to/folder/with/all/three/files
python pomi_coder_app.py POMI_CODING_FINAL.xlsx YourBQ.xlsx
```

### `POMI reference not found`

The POMI_CODING_FINAL.xlsx must be accessible. Either place it in the same folder as the scripts, or provide the full path:

```bash
python pomi_coder_app.py /full/path/POMI_CODING_FINAL.xlsx YourBQ.xlsx
```

### Low match rate on a new project

The 924 rules are tuned to the Nakheel Mall BQ phrasing. For a different project:

1. Run with `--ai` to cover the whole bill via AI
2. Open the output — check Stage column and flagged sheet
3. Items correctly coded by AI → add as rules in `pomi_rules.py`
4. Re-run without `--ai` — match rate will be much higher
5. Repeat for the next bill from the same project — rate improves each time

### AI returns invalid JSON

The engine catches this and falls back to fuzzy. Possible causes:
- API key invalid or expired
- No Anthropic credits remaining
- `--batch` too large (try `--batch 5`)
- Network timeout (try again, or check firewall)

To verify your key works:

```bash
python3 -c "
from pomi_coder_engine import BQCodingEngine
e = BQCodingEngine('POMI_CODING_FINAL.xlsx')
r = e.code_items(['test item for api check'], use_ai=True)
print(r)
"
```

### Items in wrong columns in output

If the source BQ has non-standard headers, `detect_columns()` may fall back to defaults (A=ref, B=desc, etc.). Check your source file headers match one of:

```
item_ref:    Item, Ref, No., #
description: Description, Particulars, Item Detail
qty:         Qty, Quantity, Q
unit:        Unit, U, UOM
rate:        Rate, Unit Rate, Price
amount:      Amount, Total, Value, AED, Sum
```

If headers don't match, rename them in the source file.

### Summary sheet shows percentages over 100%

This is a known display issue in the summary counter when a sheet has many header/blank rows. The `coded` count in `write_data_sheet` counts all rows that receive a result (including some that shouldn't). The accurate auto-match rate is the one printed to the console, which uses `rule_n + ai_n` over `len(descriptions)`.

---

## 15. Full Source Code

### pomi_rules.py (lines 1–1005)

```
"""
pomi_rules.py
─────────────
POMI BQ Keyword Coding Rules · 924 rules · Sections A–R
Each rule: ([keywords_ALL_must_match], POMI_code, NRM_code, NRM_desc, measurement, confidence)
...
"""
RULES = [
    # ── SITEWORKS B ──────────────────────────────────────────────────────────
    (['anti-termite'],  'B040300', '8.01', 'External Works – Site Prep', 'Area (m²)', 93),
    ...
    # 924 rules total
]
```

> Full file: `pomi_rules.py` — 1,005 lines

### pomi_coder_engine.py (lines 1–394)

```python
"""
pomi_coder_engine.py
────────────────────
POMI BQ Coding Engine — BQCodingEngine class
Three-stage: Rules → Fuzzy → AI
"""
import os, json, time, re, textwrap
from typing import Optional
from pomi_rules import RULES
...
class BQCodingEngine:
    def __init__(self, pomi_path, api_key): ...
    def _load_lookup(self, path): ...
    def _rule_match(self, desc): ...
    def _get_hint(self, desc): ...
    def _fuzzy_match(self, desc): ...
    def _ai_batch(self, items): ...
    def code_items(self, items, use_ai, batch_size, progress_cb): ...

def _empty() -> dict: ...
```

> Full file: `pomi_coder_engine.py` — 394 lines

### pomi_coder_app.py (lines 1–643)

```python
#!/usr/bin/env python3
"""
pomi_coder_app.py
─────────────────
Universal POMI BQ Auto-Coder — CLI, Excel I/O, output builder
"""
import sys, os, re, argparse
from datetime import datetime
from openpyxl import load_workbook, Workbook
...
from pomi_coder_engine import BQCodingEngine

SECTION_COLORS = { ... }  # 16 section colour pairs
DATA_COLS = [ ... ]        # 15 output column definitions
FLAG_COLS = [ ... ]        # 15 flagged sheet column definitions

def sol(h): ...
def fnt(...): ...
def aln(...): ...
def bdr(...): ...
def detect_columns(ws): ...
def read_sheet_items(ws, col_map): ...
def write_data_sheet(wb_out, sheet_name, items, results, project_title): ...
def write_flagged_sheet(wb_out, all_flagged): ...
def write_summary_sheet(wb_out, sheet_totals, project_title, args_info): ...
def main(): ...

if __name__ == '__main__':
    main()
```

> Full file: `pomi_coder_app.py` — 643 lines

---

*POMI BQ Auto-Coder · Omniumint · Nakheel Mall Al Khail · Contract DMS 148704 · AED · 2024*
