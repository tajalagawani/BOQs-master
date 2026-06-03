"""
BOQ -> POMI pipeline entrypoint ("the exe").

Usage:
    python -m engine.run <file.xlsx> [--offline] [--limit N] [--out out.json]

Reads a BOQ spreadsheet of unknown structure, extracts every measured item, maps
each to a POMI code, and emits a single JSON document on stdout (or --out file).
This is what the Next.js API route shells out to.

JSON shape:
{
  "file": "...",
  "summary": {"items": N, "mapped": N, "needs_review": N, "engine": "...",
              "by_section": {"C": 12, ...}, "total_amount": 123.0},
  "sheets": [ {name, header_row, column_map, item_count, skipped_rows} ],
  "items":  [ { ...BOQItem fields..., "pomi": { ...Mapping fields... } } ]
}
"""

from __future__ import annotations

import argparse
import dataclasses
import json
import sys

from .boq_parser import parse_file
from .pomi_mapper import map_items, mapping_to_dict


def run(path: str, force_offline: bool = False, limit: int | None = None) -> dict:
    parsed = parse_file(path)
    items = parsed.items[:limit] if limit else parsed.items

    item_dicts = [dataclasses.asdict(it) for it in items]
    mappings = map_items(item_dicts, force_offline=force_offline)

    by_section: dict[str, int] = {}
    needs_review = 0
    total_amount = 0.0
    out_items = []
    for it, m in zip(item_dicts, mappings):
        if m.section:
            by_section[m.section] = by_section.get(m.section, 0) + 1
        if m.needs_review:
            needs_review += 1
        if it.get("amount"):
            total_amount += it["amount"]
        out_items.append({**it, "pomi": mapping_to_dict(m)})

    engine = mappings[0].engine if mappings else "offline"
    return {
        "file": path,
        "summary": {
            "items": len(out_items),
            "mapped": sum(1 for m in mappings if m.code),
            "needs_review": needs_review,
            "engine": engine,
            "by_section": dict(sorted(by_section.items())),
            "total_amount": round(total_amount, 2),
        },
        "sheets": [dataclasses.asdict(s) for s in parsed.sheets],
        "items": out_items,
    }


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Parse a BOQ and map items to POMI codes.")
    ap.add_argument("file", help="Path to BOQ .xlsx/.xls")
    ap.add_argument("--offline", action="store_true", help="Force offline (no Claude) mapping")
    ap.add_argument("--limit", type=int, default=None, help="Only process first N items")
    ap.add_argument("--out", default=None, help="Write JSON here instead of stdout")
    args = ap.parse_args(argv)

    result = run(args.file, force_offline=args.offline, limit=args.limit)
    text = json.dumps(result, ensure_ascii=False, indent=2)
    if args.out:
        with open(args.out, "w", encoding="utf-8") as fh:
            fh.write(text)
        print(f"wrote {args.out} ({result['summary']['items']} items)", file=sys.stderr)
    else:
        sys.stdout.write(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
