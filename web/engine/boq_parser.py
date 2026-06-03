"""
BOQ structure parser.

Takes an arbitrary Bill of Quantities spreadsheet (.xlsx / .xls) whose layout is
NOT known in advance and extracts a flat list of measured items.

The challenge: every BOQ is laid out differently. Some have one sheet, some have
40+ (e.g. Citywalk Plot 5.11). Headers may sit several rows down. The "item"
reference (A, B, C / 1.01 / etc.) may be in column A, descriptions span trades,
and totals/sub-headings are interleaved with priced lines.

Strategy (heuristic, layout-agnostic):
  1. Read every sheet into a grid of cells.
  2. For each sheet, locate the header row by scoring rows against a set of
     known BOQ column keywords (Description, Qty, Unit, Rate, Amount...).
  3. Map the real columns from that header (fuzzy), so we don't rely on position.
  4. Walk the data rows below the header. A row is a *measured item* when it has
     a description AND at least one of (quantity+unit) or (rate) or (amount).
  5. Carry the running section/sub-heading context (caps-only lines, the trade
     code from the sheet name) so each item knows where it sits in the bill.

Output: ParsedBOQ -> list[BOQItem]. No POMI mapping happens here; that is the
mapper's job. This module only answers "what items are in this file?".
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field, asdict
from typing import Any, Optional

try:
    import openpyxl
except ImportError:  # pragma: no cover
    openpyxl = None


# --- Column detection vocabulary -------------------------------------------------
# Each logical field maps to substrings we might see in a header cell. Order of
# fields matters only for reporting; matching is independent per column.
COLUMN_KEYWORDS: dict[str, list[str]] = {
    "ref":         ["item", "ref", "code", "bill", "sr", "s.no", "sno", "no."],
    "description": ["description", "particular", "desc", "details", "item description"],
    "quantity":    ["quantity", "qty", "qnty", "quant"],
    "unit":        ["unit", "uom", "u/m", "units"],
    "rate":        ["rate", "unit rate", "price", "unit price"],
    "amount":      ["amount", "total", "value", "extension", "amt"],
}

# Rows whose description matches these are structural, not measured items.
NOISE_PATTERNS = [
    re.compile(r"^\s*(sub\s*-?\s*total|total|carried|brought|collection|summary|grand total)\b", re.I),
    re.compile(r"^\s*page\s+\d", re.I),
    re.compile(r"^\s*bill\s+no", re.I),
]

# Continuation / running headers (e.g. "EARTHWORKS (Cont'd)", "Dayworks
# (Cont'd...)") repeated at page breaks. They are sub-headings, not specification
# text — treat like a heading. Tolerates trailing dots/spaces inside the bracket.
CONTINUATION_RE = re.compile(r"\(\s*cont(?:inued|'?\s*d)[^)]*\)", re.I)

UNIT_NORMALISE = {
    "m2": "m²", "sqm": "m²", "sq.m": "m²", "m²": "m²",
    "m3": "m³", "cum": "m³", "cu.m": "m³", "m³": "m³",
    "nr": "Nr", "no": "Nr", "no.": "Nr", "nr.": "Nr", "each": "Nr", "ea": "Nr",
    "lm": "m", "rm": "m", "lin.m": "m", "m": "m",
    "kg": "kg", "ton": "t", "tonne": "t", "t": "t",
    "item": "Item", "ls": "Item", "l/s": "Item", "sum": "Item",
}


@dataclass
class BOQItem:
    sheet: str
    row: int
    ref: str = ""
    description: str = ""        # the priced line's own text (often a short locator)
    spec: str = ""              # preceding specification paragraph(s) this item belongs to
    full_description: str = ""  # spec + description, the text used for POMI mapping
    quantity: Optional[float] = None
    unit: str = ""
    rate: Optional[float] = None
    amount: Optional[float] = None
    section_context: str = ""   # nearest CAPS heading above this item
    sheet_title: str = ""       # human title of the sheet/bill, if detected


@dataclass
class SheetReport:
    name: str
    header_row: Optional[int]
    column_map: dict[str, int]
    item_count: int
    skipped_rows: int


@dataclass
class ParsedBOQ:
    file: str
    sheets: list[SheetReport] = field(default_factory=list)
    items: list[BOQItem] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "file": self.file,
            "sheets": [asdict(s) for s in self.sheets],
            "item_count": len(self.items),
            "items": [asdict(i) for i in self.items],
        }


# --- helpers --------------------------------------------------------------------

def _norm(s: Any) -> str:
    return re.sub(r"\s+", " ", str(s)).strip().lower() if s is not None else ""


def _to_number(v: Any) -> Optional[float]:
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v)
    s = str(v).strip().replace(",", "")
    if not s or s in {"-", "—"}:
        return None
    m = re.fullmatch(r"-?\d*\.?\d+", s)
    return float(s) if m else None


def _normalise_unit(v: Any) -> str:
    s = _norm(v).replace(" ", "")
    return UNIT_NORMALISE.get(s, str(v).strip() if v is not None else "")


def _score_header_row(cells: list[Any]) -> tuple[int, dict[str, int]]:
    """Return (#fields matched, {field: col_index}) for a candidate header row."""
    col_map: dict[str, int] = {}
    for ci, cell in enumerate(cells):
        text = _norm(cell)
        if not text or len(text) > 40:
            continue
        for field_name, kws in COLUMN_KEYWORDS.items():
            if field_name in col_map:
                continue
            if any(text == kw or text.startswith(kw) or kw in text for kw in kws):
                col_map[field_name] = ci
                break
    return len(col_map), col_map


def _detect_header(grid: list[list[Any]], scan_rows: int = 25) -> tuple[Optional[int], dict[str, int]]:
    """Find the most likely header row in the first `scan_rows` rows."""
    best_idx, best_map, best_score = None, {}, 0
    for ri, row in enumerate(grid[:scan_rows]):
        score, cmap = _score_header_row(row)
        # A real BOQ header needs a description column + at least one numeric col.
        has_desc = "description" in cmap
        has_num = any(k in cmap for k in ("quantity", "rate", "amount"))
        if has_desc and has_num and score > best_score:
            best_idx, best_map, best_score = ri, cmap, score
    return best_idx, best_map


def _is_caps_heading(text: str) -> bool:
    letters = [c for c in text if c.isalpha()]
    if len(letters) < 3:
        return False
    upper = sum(1 for c in letters if c.isupper())
    return upper / len(letters) > 0.8


def _is_noise(text: str) -> bool:
    return any(p.search(text) for p in NOISE_PATTERNS)


# --- core -----------------------------------------------------------------------

def parse_file(path: str) -> ParsedBOQ:
    if openpyxl is None:
        raise RuntimeError("openpyxl not installed. Run: pip install openpyxl")

    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    result = ParsedBOQ(file=path)

    for ws in wb.worksheets:
        grid = [list(r) for r in ws.iter_rows(values_only=True)]
        if not grid:
            result.sheets.append(SheetReport(ws.title, None, {}, 0, 0))
            continue

        header_idx, col_map = _detect_header(grid)
        sheet_title = _detect_sheet_title(grid, header_idx)

        if header_idx is None:
            # No measurable table on this sheet (cover page, flysheet, summary).
            result.sheets.append(SheetReport(ws.title, None, {}, 0, len(grid)))
            continue

        is_summary_sheet = bool(re.search(r"sum\b|summary", ws.title, re.I))

        items, skipped, section = [], 0, ""
        pending_spec: list[str] = []  # spec paragraphs awaiting their priced line
        spec_consumed = False         # has the current spec already priced a line?
        for ri in range(header_idx + 1, len(grid)):
            row = grid[ri]
            desc = _cell(row, col_map.get("description"))
            desc_txt = str(desc).strip() if desc is not None else ""

            qty = _to_number(_cell(row, col_map.get("quantity")))
            rate = _to_number(_cell(row, col_map.get("rate")))
            amount = _to_number(_cell(row, col_map.get("amount")))
            unit = _normalise_unit(_cell(row, col_map.get("unit")))
            ref = _cell(row, col_map.get("ref"))
            ref_txt = str(ref).strip() if ref is not None else ""

            if not desc_txt:
                continue

            # CAPS-only heading rows define the current section and reset the spec
            # buffer (a new trade/heading starts a fresh specification context).
            # Continuation header ("X (Cont'd)") — strip the marker, treat as the
            # current sub-heading, and do NOT let it pollute the spec buffer.
            if CONTINUATION_RE.search(desc_txt) and qty is None and rate is None:
                cleaned = CONTINUATION_RE.sub("", desc_txt).strip(" -—")
                # Keep only the leading heading phrase (first clause) as context.
                section = re.split(r"\s{2,}|;|—", cleaned)[0].strip() or section
                pending_spec.clear()
                spec_consumed = False
                continue

            if _is_caps_heading(desc_txt) and qty is None and rate is None and amount is None:
                section = desc_txt
                pending_spec.clear()
                spec_consumed = False
                continue

            if _is_noise(desc_txt):
                pending_spec.clear()
                spec_consumed = False
                skipped += 1
                continue

            has_signal = (qty is not None and unit) or rate is not None or amount is not None

            if not has_signal:
                # No numbers => specification paragraph for the priced line(s) below.
                # If the previous spec already priced a line, this new paragraph
                # starts a fresh spec block, so reset first.
                if spec_consumed:
                    pending_spec.clear()
                    spec_consumed = False
                pending_spec.append(desc_txt)
                if len(pending_spec) > 6:
                    pending_spec.pop(0)
                continue

            # Summary sheets only carry section roll-ups, not measurable items.
            if is_summary_sheet:
                skipped += 1
                continue

            spec_txt = " ".join(pending_spec).strip()
            full = (spec_txt + " — " + desc_txt).strip(" —") if spec_txt else desc_txt
            items.append(BOQItem(
                sheet=ws.title, row=ri + 1, ref=ref_txt, description=desc_txt,
                spec=spec_txt, full_description=full,
                quantity=qty, unit=unit, rate=rate, amount=amount,
                section_context=section, sheet_title=sheet_title,
            ))
            # Mark spec consumed: sibling priced lines (A/B/C) keep sharing this spec
            # until a new spec paragraph appears, which then resets the buffer.
            spec_consumed = True

        result.sheets.append(SheetReport(ws.title, header_idx + 1, col_map, len(items), skipped))
        result.items.extend(items)

    return result


def _cell(row: list[Any], idx: Optional[int]) -> Any:
    if idx is None or idx >= len(row):
        return None
    return row[idx]


def _detect_sheet_title(grid: list[list[Any]], header_idx: Optional[int]) -> str:
    """Grab the first substantial text line above the header as the sheet title."""
    limit = header_idx if header_idx is not None else min(len(grid), 10)
    for row in grid[:limit]:
        for cell in row:
            t = str(cell).strip() if cell is not None else ""
            if len(t) >= 4 and any(c.isalpha() for c in t):
                return t
    return ""


if __name__ == "__main__":
    import sys, json
    if len(sys.argv) < 2:
        print("usage: python boq_parser.py <file.xlsx>", file=sys.stderr)
        sys.exit(1)
    parsed = parse_file(sys.argv[1])
    print(json.dumps(parsed.to_dict(), ensure_ascii=False, indent=2))
