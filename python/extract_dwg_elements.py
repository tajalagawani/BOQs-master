#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
extract_dwg_elements.py — Path-B layer-based DWG extractor.

Reads a DWG/DXF architectural drawing, classifies every entity by layer
against a layer→NRM mapping JSON, and aggregates counts/quantities per
NRM L2 code. Used by pomi_coder_app.py to drive BoQ ↔ drawing
reconciliation.

CLI:
    python3 extract_dwg_elements.py PATH.dwg [--mapping dictionaries/layer_to_nrm.default.json]
                                              [--json out.json]
                                              [--verbose]

Python:
    from extract_dwg_elements import extract_dwg_elements
    result = extract_dwg_elements('plan.dwg', 'dictionaries/layer_to_nrm.default.json')
    # result is a dict with .by_nrm, .total_entities, .unclassified, etc.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import shutil
import subprocess
import sys
import tempfile
from collections import Counter, defaultdict
from dataclasses import dataclass, field, asdict
from pathlib import Path

try:
    import ezdxf
except ImportError:
    print("error: ezdxf not installed. Run: pip install ezdxf", file=sys.stderr)
    sys.exit(2)


# ── conversion helper ───────────────────────────────────────────────────────
def _convert_dwg_to_dxf(dwg_path: str, dxf_out_dir: str | None = None) -> str:
    """Convert a DWG file to DXF using libredwg's dwg2dxf tool.
    Returns path to the resulting DXF. Raises on failure."""
    converter = shutil.which("dwg2dxf")
    if not converter:
        raise RuntimeError(
            "dwg2dxf not found on PATH. Install libredwg: brew install libredwg"
        )
    out_dir = dxf_out_dir or tempfile.mkdtemp(prefix="dwg2dxf_")
    cmd = [converter, dwg_path]
    proc = subprocess.run(cmd, cwd=out_dir, capture_output=True, text=True)
    # dwg2dxf emits warnings on stderr but still produces a file; check for it
    base = os.path.splitext(os.path.basename(dwg_path))[0]
    dxf_path = os.path.join(out_dir, base + ".dxf")
    if not os.path.exists(dxf_path):
        raise RuntimeError(f"dwg2dxf failed for {dwg_path}:\n{proc.stderr[:1000]}")
    return dxf_path


# ── geometry helpers ────────────────────────────────────────────────────────
def _polyline_length(entity) -> float:
    """Sum segment lengths of an LWPOLYLINE."""
    try:
        pts = [tuple(p[:2]) for p in entity.get_points('xy')]
    except Exception:
        return 0.0
    if len(pts) < 2:
        return 0.0
    total = 0.0
    for i in range(len(pts) - 1):
        ax, ay = pts[i]
        bx, by = pts[i + 1]
        total += math.hypot(bx - ax, by - ay)
    if getattr(entity, "closed", False) or getattr(entity.dxf, "flags", 0) & 1:
        ax, ay = pts[-1]
        bx, by = pts[0]
        total += math.hypot(bx - ax, by - ay)
    return total


def _polyline_area(entity) -> float:
    """Shoelace area of a closed LWPOLYLINE. Returns 0 for open polylines."""
    try:
        pts = [tuple(p[:2]) for p in entity.get_points('xy')]
    except Exception:
        return 0.0
    if len(pts) < 3:
        return 0.0
    is_closed = getattr(entity, "closed", False) or (
        getattr(entity.dxf, "flags", 0) & 1
    )
    if not is_closed:
        return 0.0
    s = 0.0
    for i in range(len(pts)):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 1) % len(pts)]
        s += (x1 * y2) - (x2 * y1)
    # Drawing units are typically mm; convert to m² (1 m² = 1,000,000 mm²)
    return abs(s) / 2.0 / 1_000_000.0


def _length_in_metres(raw_length: float) -> float:
    """Drawing units → metres. LACASA drawings are in millimetres."""
    return raw_length / 1000.0


# ── classifier ──────────────────────────────────────────────────────────────
def _trailing_segment(layer_name: str) -> str:
    """Pull the meaningful trailing segment from a deeply-nested XREF layer."""
    if not layer_name:
        return ""
    last = layer_name.rsplit("$", 1)[-1]
    last = last.rsplit("|", 1)[-1]
    return last.strip()


def _classify_layer(layer_name: str, mapping: dict) -> dict | None:
    """Return the first matching pattern for a layer, or None.
    Honours ignore_layers, then iterates patterns in order."""
    if not layer_name:
        return None
    tail = _trailing_segment(layer_name).upper()
    full_upper = layer_name.upper()

    for ignore in mapping.get("ignore_layers", []):
        if ignore.upper() == tail:        # exact match on trailing segment only
            return None

    for pat in mapping.get("patterns", []):
        needle = pat["pattern"].upper()
        if needle in tail or needle in full_upper:
            return pat
    return None


# ── result container ────────────────────────────────────────────────────────
@dataclass
class NrmBucket:
    nrm_l2: str
    category: str
    unit: str
    confidence: str
    count: int = 0          # number of items (INSERT-style)
    qty_total: float = 0.0  # accumulated metric (m, m², or count)
    items: list = field(default_factory=list)


@dataclass
class DwgExtract:
    source_file: str
    dxf_used: str
    total_entities: int
    by_nrm: dict           # nrm_l2 → NrmBucket
    layer_stats: dict      # layer pattern → entity count
    unclassified: dict     # {entity_count, sample_layers, types}

    def to_dict(self) -> dict:
        d = asdict(self)
        d["by_nrm"] = {k: asdict(v) for k, v in self.by_nrm.items()}
        return d


# ── main extractor ──────────────────────────────────────────────────────────
def extract_dwg_elements(
    drawing_path: str,
    mapping_path: str,
    verbose: bool = False,
) -> DwgExtract:
    """Classify a drawing's entities by layer and aggregate per NRM L2."""
    drawing_path = os.path.abspath(drawing_path)
    if not os.path.exists(drawing_path):
        raise FileNotFoundError(drawing_path)

    with open(mapping_path) as f:
        mapping = json.load(f)

    # Convert to DXF if needed
    ext = os.path.splitext(drawing_path)[1].lower()
    if ext == ".dwg":
        if verbose:
            print(f"  converting {os.path.basename(drawing_path)} → DXF …",
                  file=sys.stderr)
        dxf_path = _convert_dwg_to_dxf(drawing_path)
    elif ext == ".dxf":
        dxf_path = drawing_path
    else:
        raise ValueError(f"Unsupported extension: {ext}")

    doc = ezdxf.readfile(dxf_path)

    buckets: dict[str, NrmBucket] = {}
    layer_hits: Counter = Counter()
    unclassified_layers: Counter = Counter()
    unclassified_types: Counter = Counter()
    unclassified_count = 0
    total_entities = 0

    def _process_entity(e, source_label: str):
        nonlocal unclassified_count, total_entities
        total_entities += 1
        try:
            layer = e.dxf.layer
        except AttributeError:
            return
        pat = _classify_layer(layer, mapping)
        if pat is None:
            unclassified_count += 1
            unclassified_layers[_trailing_segment(layer)] += 1
            unclassified_types[e.dxftype()] += 1
            return
        layer_hits[pat["pattern"]] += 1
        nrm = pat["nrm_l2"]
        b = buckets.get(nrm)
        if b is None:
            b = NrmBucket(
                nrm_l2=nrm,
                category=pat["category"],
                unit=pat["unit"],
                confidence=pat["confidence"],
            )
            buckets[nrm] = b
        else:
            # Category collisions across multiple patterns mapping to same NRM
            # are normal; preserve the first label but track the second
            pass

        kind = e.dxftype()
        count_from = pat.get("count_from", [])
        added_qty = 0.0
        added_count = 0
        if kind == "INSERT" and "INSERT" in count_from:
            added_count = 1
            added_qty = 1
        elif kind == "LWPOLYLINE" and "LWPOLYLINE_LEN" in count_from:
            added_qty = _length_in_metres(_polyline_length(e))
        elif kind == "LWPOLYLINE" and "LWPOLYLINE_AREA" in count_from:
            added_qty = _polyline_area(e)
        else:
            return  # entity is on a classified layer but not a counted type

        b.count += added_count
        b.qty_total += added_qty
        if len(b.items) < 50:  # keep a sample for the drilldown
            item = {"source": source_label, "type": kind, "layer": layer}
            if kind == "INSERT":
                item["block_name"] = getattr(e.dxf, "name", "")
                try:
                    item["insertion_point"] = list(e.dxf.insert[:2])
                except Exception:
                    pass
            elif kind == "LWPOLYLINE":
                item["qty"] = round(added_qty, 3)
            b.items.append(item)

    # Modelspace
    for e in doc.modelspace():
        _process_entity(e, "modelspace")
    # Block definitions (the LAC drawings nest most content here)
    for block in doc.blocks:
        for e in block:
            _process_entity(e, f"block:{block.name}")

    # Round quantities for display
    for b in buckets.values():
        b.qty_total = round(b.qty_total, 3)

    return DwgExtract(
        source_file=drawing_path,
        dxf_used=dxf_path,
        total_entities=total_entities,
        by_nrm=buckets,
        layer_stats=dict(layer_hits),
        unclassified={
            "entity_count": unclassified_count,
            "sample_layers": dict(unclassified_layers.most_common(15)),
            "types": dict(unclassified_types.most_common(8)),
        },
    )


# ── CLI ─────────────────────────────────────────────────────────────────────
def main():
    ap = argparse.ArgumentParser(description="Layer-based DWG/DXF extractor → NRM L2 counts")
    ap.add_argument("drawing", help="Path to .dwg or .dxf")
    ap.add_argument("--mapping", default=str(
        Path(__file__).parent.parent / "dictionaries" / "layer_to_nrm.default.json"),
        help="Layer→NRM mapping JSON")
    ap.add_argument("--json", help="Write full result as JSON to this path")
    ap.add_argument("--verbose", action="store_true")
    args = ap.parse_args()

    result = extract_dwg_elements(args.drawing, args.mapping, verbose=args.verbose)

    print(f"═══ DWG Extract — {os.path.basename(result.source_file)} ═══")
    print(f"  Total entities scanned:  {result.total_entities:,}")
    print(f"  Unclassified entities:   {result.unclassified['entity_count']:,}")
    print(f"  NRM groups populated:    {len(result.by_nrm)}")
    print()
    print(f"  ── Per NRM L2 ──")
    print(f"  {'NRM':<6} {'Category':<30} {'Count':>6} {'Qty':>12} {'Unit':<6} {'Conf':<6}")
    print(f"  {'-'*6} {'-'*30} {'-'*6} {'-'*12} {'-'*6} {'-'*6}")
    for nrm, b in sorted(result.by_nrm.items()):
        qty_disp = (f"{b.qty_total:,.2f}" if b.qty_total != b.count else "")
        print(f"  {nrm:<6} {b.category[:30]:<30} {b.count:>6} {qty_disp:>12} {b.unit:<6} {b.confidence:<6}")
    if result.unclassified["sample_layers"]:
        print()
        print(f"  ── Top unclassified layers (first 10) ──")
        for layer, n in list(result.unclassified["sample_layers"].items())[:10]:
            print(f"  {n:>6}  {layer}")

    if args.json:
        with open(args.json, "w") as f:
            json.dump(result.to_dict(), f, indent=2, default=str)
        print(f"\nFull result → {args.json}")


if __name__ == "__main__":
    main()
