"""
POMI reference knowledge used to map BOQ items to POMI codes.

Two layers:
  * SECTION_GUIDE  — a compact, human-written summary of each POMI section (A–R)
                     and how its work is measured. Drawn from the RICS POMI 1979
                     standard. Used in the Claude prompt and to bias the offline
                     fallback toward the right section.
  * load_codes()   — the full 604-row POMI code table (pomi_codes.json), the set
                     of valid target codes with their NRM mapping & unit.
"""

from __future__ import annotations

import json
import os
from functools import lru_cache

_HERE = os.path.dirname(__file__)
_CODES_PATH = os.path.join(_HERE, "pomi_codes.json")


# Section letter -> (title, keyword hints, typical measurement units)
SECTION_GUIDE: dict[str, dict] = {
    "A": {"title": "General Requirements",
          "keywords": ["preliminaries", "insurance", "bond", "supervision", "site office",
                       "mobilisation", "administration", "temporary", "security", "welfare"],
          "units": ["Item"]},
    "B": {"title": "Site Work",
          "keywords": ["excavation", "excavate", "earthwork", "filling", "disposal", "dewatering",
                       "pile", "piling", "borehole", "demolition", "shoring", "drainage", "paving",
                       "fencing", "landscaping", "site clearance", "anti-termite", "tunnel", "dredging"],
          "units": ["m³", "m²", "m", "Nr"]},
    "C": {"title": "Concrete Work",
          "keywords": ["concrete", "reinforcement", "rebar", "formwork", "shuttering", "blinding",
                       "precast", "prestressed", "screed", "slab", "column", "beam", "raft", "pile cap"],
          "units": ["m³", "m²", "kg", "t", "m"]},
    "D": {"title": "Masonry",
          "keywords": ["blockwork", "block", "brick", "brickwork", "masonry", "wall", "pier",
                       "cavity", "coping", "sill", "aerated"],
          "units": ["m²", "m", "Nr"]},
    "E": {"title": "Metalwork",
          "keywords": ["steel", "structural steel", "metalwork", "balustrade", "handrail", "grating",
                       "stanchion", "purlin", "rolled section", "stainless"],
          "units": ["kg", "t", "m", "m²", "Nr"]},
    "F": {"title": "Woodwork",
          "keywords": ["timber", "wood", "joinery", "skirting", "architrave", "shelving",
                       "ironmongery", "softwood", "hardwood", "plywood", "mdf", "carpentry"],
          "units": ["m", "m²", "Nr"]},
    "G": {"title": "Thermal & Moisture Protection",
          "keywords": ["waterproofing", "tanking", "membrane", "damp proof", "dpc", "dpm",
                       "insulation", "roofing felt", "bituminous", "vapour barrier", "protection board"],
          "units": ["m²", "m"]},
    "H": {"title": "Doors and Windows",
          "keywords": ["door", "window", "glazing", "glass", "screen", "curtain wall", "shutter",
                       "louvre", "skylight", "frame", "ironmongery", "patent glazing"],
          "units": ["Nr", "m²", "m"]},
    "J": {"title": "Finishes",
          "keywords": ["plaster", "render", "tiling", "tile", "paint", "painting", "decoration",
                       "screed", "flooring", "carpet", "vinyl", "ceiling", "gypsum", "skim", "finish",
                       "epoxy", "marble", "granite", "cladding"],
          "units": ["m²", "m"]},
    "K": {"title": "Accessories",
          "keywords": ["partition", "demountable partition", "toilet cubicle", "signage", "accessory",
                       "proprietary", "wc cubicle"],
          "units": ["m", "Nr"]},
    "L": {"title": "Equipment",
          "keywords": ["kitchen equipment", "laboratory equipment", "catering", "specialist equipment",
                       "stage equipment", "food service"],
          "units": ["Item", "Nr"]},
    "M": {"title": "Furnishings",
          "keywords": ["furniture", "furnishing", "curtain", "blind", "rug", "artwork", "loose"],
          "units": ["Item", "Nr", "m"]},
    "N": {"title": "Special Construction",
          "keywords": ["enclosure", "prefabricated building", "radiation protection", "cold room",
                       "clean room", "swimming pool", "special construction"],
          "units": ["Item", "Nr"]},
    "P": {"title": "Conveying Systems",
          "keywords": ["lift", "elevator", "escalator", "hoist", "conveyor", "travelator", "dumbwaiter"],
          "units": ["Nr", "Item"]},
    "Q": {"title": "Mechanical Engineering Installations",
          "keywords": ["pipework", "pipe", "ductwork", "duct", "hvac", "chilled water", "drainage pipe",
                       "valve", "pump", "fan", "air handling", "ahu", "fcu", "sanitary", "plumbing",
                       "mechanical", "ventilation", "fire fighting", "sprinkler", "insulation to pipe"],
          "units": ["m", "Nr", "kg", "m²", "Item"]},
    "R": {"title": "Electrical Engineering Installations",
          "keywords": ["cable", "conduit", "wiring", "electrical", "lighting", "luminaire", "socket",
                       "switchgear", "distribution board", "db", "transformer", "earthing", "containment",
                       "trunking", "fire alarm", "data", "bus bar", "generator"],
          "units": ["m", "Nr", "Item"]},
}


@lru_cache(maxsize=1)
def load_codes() -> list[dict]:
    with open(_CODES_PATH, encoding="utf-8") as fh:
        return json.load(fh)


@lru_cache(maxsize=1)
def codes_by_section() -> dict[str, list[dict]]:
    out: dict[str, list[dict]] = {}
    for c in load_codes():
        out.setdefault(c["section"], []).append(c)
    return out


def section_summary_text() -> str:
    """A compact A–R section list for the Claude system prompt."""
    lines = []
    for letter, g in SECTION_GUIDE.items():
        lines.append(f"{letter} — {g['title']}: typical work e.g. "
                     f"{', '.join(g['keywords'][:8])}. Units: {', '.join(g['units'])}.")
    return "\n".join(lines)
