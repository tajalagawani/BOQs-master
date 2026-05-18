#!/usr/bin/env python3
"""
_rewrite_rules.py — one-shot script that rewrites pomi_rules.py with
corrected NRM mappings, using pomi_to_nrm_corrected.json as authority.

Algorithm per rule:
  1. Apply resolver:    keywords → check entry's nrm_overrides → match → use override
                        else use entry's nrm_default
  2. If resolver did NOT use an override AND code is in FORCE_NRM → use FORCE_NRM
  3. Else use resolver result (override or default)
  4. If pomi_code not in corrected JSON → keep original NRM
After per-rule transform, ADD splitter rules for codes in §1.5 that
legitimately span multiple NRM groups.
"""
from __future__ import annotations
import json
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).parent

# ---- load original rules by exec'ing the backup file -----------------------
ns: dict = {}
exec((ROOT / "pomi_rules.py.bak").read_text(), ns)
ORIG_RULES  = list(ns["RULES"])
HINT_KW     = dict(ns["HINT_KW"])

# ---- load corrected JSON ----------------------------------------------------
with (ROOT / "pomi_to_nrm_corrected.json").open() as f:
    CORR = json.load(f)
BY_CODE = {e["pomi_code"]: e for e in CORR["entries"]}

# ---- resolver --------------------------------------------------------------
def resolve(pomi_code: str, desc_text: str):
    """Return (nrm_code, nrm_desc, used_override_bool, found_bool)."""
    entry = BY_CODE.get(pomi_code)
    if not entry:
        return None, None, False, False
    lo = (desc_text or "").lower()
    for ov in entry.get("nrm_overrides", []):
        for kw in ov["when_description_contains"]:
            if kw.lower() in lo:
                return ov["nrm_code"], ov["nrm_description"], True, True
    d = entry["nrm_default"]
    return d["code"], d["description"], False, True

# ---- forced overrides for ambiguous keyword sets ---------------------------
FORCE_NRM: dict[str, tuple[str, str]] = {
    # Section B Piling → Substructure
    "B030100": ("1.01", "Substructure – Piling"),
    "B130000": ("1.01", "Substructure – Piling"),
    "B140000": ("1.01", "Substructure – Driven Piling"),
    "B150000": ("1.01", "Substructure – Bored Piling"),
    "B160000": ("1.01", "Substructure – Sheet Piling"),
    "B170000": ("1.01", "Substructure – Performance Piling"),
    "B180000": ("1.01", "Substructure – Piling Tests"),
    "B070100": ("1.01", "Substructure – Underpinning"),
    "C010100": ("1.01", "Substructure – Piles"),
    # Section C foundation/pile cap codes
    "C020101": ("1.01", "Substructure – Foundation"),
    # Note: C020102 NOT forced — original rules misuse this code for many
    # frame elements (suspended slab, beam, column, staircase, etc).
    # Splitter rules below catch these with canonical codes BEFORE the
    # original rules' (kept) NRM falls through.
    "C020103": ("1.01", "Substructure – Blinding"),
    "C020104": ("1.01", "Substructure – Slab on Grade"),
    # Section C upper floors
    "C020105": ("2.02", "Upper Floors – Suspended Slab"),
    # Section C stairs
    "C020109": ("2.04", "Stairs and Ramps"),
    "C040110": ("2.04", "Stairs and Ramps – Formwork"),
    # Section C formwork to substructure
    "C040104": ("1.01", "Substructure – Formwork"),
    # Section F joinery
    "F060200": ("4.01", "FF&E – Bespoke Joinery"),
    "F100100": ("4.01", "FF&E – Ironmongery"),
    # Section H ironmongery to internal doors
    "H040100": ("2.08", "Internal Doors – Ironmongery"),
    # Section J ceilings
    "J050100": ("3.03", "Ceiling Finishes"),
    # Section K sanitary accessories
    "K010100": ("5.01", "Sanitary Appliances and Fittings"),
    # Section M furnishings
    "M010100": ("4.01", "FF&E – Loose Furniture"),
    # Section P builder's work
    "P030100": ("5.14", "Builder's Work in Connection with Services"),
    # Section A builder's work
    "A020100": ("5.14", "Builder's Work in Connection with Services"),
    # Section R earthing/lightning
    "R080100": ("5.11", "Fire and Lightning Protection – Earthing"),
    # ── Codes NOT in corrected JSON (fallback mappings inferred from keywords) ──
    # C020401: reinforcement variants — defaults to Frame, but most rules carry
    # location keywords (pile cap, footing, slab, etc.) so we leave the per-rule
    # resolver alone and rely on the heuristic in resolve_unknown() below.
    "A030200": ("9.01", "Preliminaries – Testing & Commissioning"),
    "B090500": ("8.01", "External Works – Disposal"),
    "P020200": ("5.10", "Conveying – Travelator"),
    "Q020500": ("5.04", "Water Installations – Pump"),
    "Q020600": ("5.06", "Air Treatment / Services – Valves"),
    "Q060200": ("8.01", "External Works – Irrigation"),
    "R050200": ("5.11", "Fire and Lightning Protection – Emergency Lighting"),
    "R060200": ("5.08", "Electrical Installations – Generator / ATS"),
    "R080200": ("5.11", "Fire and Lightning Protection – Lightning Protection"),
    "R080300": ("5.12", "Communications – ICT"),
    "R080400": ("5.12", "Communications, Security – CCTV"),
    "R080500": ("5.12", "Communications, Security – Access Control"),
}

# Keyword-based heuristic for codes not in JSON and not in FORCE_NRM
# (covers C020401 reinforcement variants by location)
def resolve_unknown(pomi: str, kws: list[str], old_nrm: str, old_desc: str):
    """Best-effort NRM for codes outside the corrected JSON.
    Looks at keywords + the original description text to guess the NRM."""
    text = (" ".join(kws) + " " + (old_desc or "")).lower()
    # C020401 = reinforcement; split by element keyword
    if pomi == "C020401":
        if any(k in text for k in ("pile cap", "footing", "ground beam", "blinding", "raft", "slab on grade", "substructure")):
            return ("1.01", "Substructure – Reinforcement")
        if "suspended slab" in text or "upper floor" in text:
            return ("2.02", "Upper Floors – Reinforcement")
        if "external wall" in text:
            return ("2.05", "External Walls – Reinforcement")
        if "internal wall" in text or "partition" in text:
            return ("2.07", "Internal Walls – Reinforcement")
        if "stair" in text:
            return ("2.04", "Stairs and Ramps – Reinforcement")
        if "roof" in text:
            return ("2.03", "Roof – Reinforcement")
        return ("2.01", "Frame – Reinforcement")  # default
    # H010300 = mixed door/window adjuncts
    if pomi == "H010300":
        if "gutter" in text:    return ("2.03", "Roof – Gutter")
        if "glass" in text or "glazing" in text or "dgu" in text:
            return ("2.06", "Windows and Glazed Screens")
        if "facade" in text or "curtain wall" in text or "pulse" in text:
            return ("2.05", "External Walls – Facade")
        return (old_nrm, old_desc)
    return (None, None)

# ---- per-rule transform ----------------------------------------------------
nrm_changes: dict[str, list[tuple[str, str]]] = defaultdict(list)  # pomi_code → [(old_nrm,new_nrm)]
unchanged = 0
changed   = 0
unknown_codes: Counter = Counter()

def transform(rule):
    kws, pomi, old_nrm, old_desc, meas, conf = rule
    desc_text = " ".join(kws)
    new_nrm, new_desc, used_ov, found = resolve(pomi, desc_text)
    if not found:
        unknown_codes[pomi] += 1
        # Try unknown-code heuristic, then FORCE_NRM, else keep original
        hn, hd = resolve_unknown(pomi, kws, old_nrm, old_desc)
        if hn:
            final_nrm, final_desc = hn, hd
        elif pomi in FORCE_NRM:
            final_nrm, final_desc = FORCE_NRM[pomi]
        else:
            return rule
    elif used_ov:
        final_nrm, final_desc = new_nrm, new_desc
    elif pomi in FORCE_NRM:
        final_nrm, final_desc = FORCE_NRM[pomi]
    else:
        final_nrm, final_desc = new_nrm, new_desc
    if final_nrm != old_nrm:
        nrm_changes[pomi].append((old_nrm, final_nrm))
        return (kws, pomi, final_nrm, final_desc, meas, conf)
    return rule

NEW_RULES: list = []
for r in ORIG_RULES:
    nr = transform(r)
    NEW_RULES.append(nr)
    if nr is r or nr[2] == r[2]:
        unchanged += 1
    else:
        changed += 1

# ---- splitter rules (§1.5) -------------------------------------------------
# These are ADDITIONAL high-confidence rules added BEFORE existing rules for
# each code that legitimately spans multiple NRM groups. They fire on more
# specific location/system keywords. They are inserted into the appropriate
# section block of the output by section letter.
SPLITTERS: list = [
    # ── Canonical concrete elements (re-routes from wrong original codes) ──
    # These fire BEFORE the original rules that misuse C020102 for everything.
    (["raft foundation"],                      "C020101", "1.01", "Substructure – Raft Foundation","Volume (m³)", 96),
    (["raft", "concrete"],                     "C020101", "1.01", "Substructure – Raft Foundation","Volume (m³)", 93),
    (["concrete suspended slab"],              "C020105", "2.02", "Upper Floors – Suspended Slab", "Volume (m³)", 96),
    (["suspended slab", "concrete"],           "C020105", "2.02", "Upper Floors – Suspended Slab", "Volume (m³)", 96),
    (["upper floor slab", "concrete"],         "C020105", "2.02", "Upper Floors – Concrete Slab", "Volume (m³)", 95),
    (["concrete beam"],                        "C020108", "2.01", "Frame – Beam",                  "Volume (m³)", 95),
    (["concrete column"],                      "C020107", "2.01", "Frame – Column",                "Volume (m³)", 95),
    (["concrete staircase"],                   "C020109", "2.04", "Stairs and Ramps – Concrete",   "Volume (m³)", 96),
    (["staircase", "concrete"],                "C020109", "2.04", "Stairs and Ramps – Concrete",   "Volume (m³)", 96),
    (["staircase", "reinforced"],              "C020109", "2.04", "Stairs and Ramps – Concrete",   "Volume (m³)", 96),
    (["roof slab", "concrete"],                "C020104", "2.03", "Roof – Concrete Slab",          "Volume (m³)", 95),

    # ── C020106 concrete walls — external vs internal ──
    (["external wall", "reinforced concrete"], "C020106", "2.05", "External Walls – Concrete", "Volume (m³)", 95),
    (["external wall", "concrete"],            "C020106", "2.05", "External Walls – Concrete", "Volume (m³)", 93),
    (["parapet", "concrete"],                  "C020106", "2.05", "External Walls – Parapet",  "Volume (m³)", 93),
    (["internal wall", "reinforced concrete"], "C020106", "2.07", "Internal Walls – Concrete", "Volume (m³)", 95),
    (["internal wall", "concrete"],            "C020106", "2.07", "Internal Walls – Concrete", "Volume (m³)", 93),
    (["partition", "concrete"],                "C020106", "2.07", "Internal Walls – Concrete", "Volume (m³)", 93),

    # ── C030100 rebar — split by structural element ──
    (["reinforcement", "foundation"],          "C030100", "1.01", "Substructure – Reinforcement",     "Mass (t)", 95),
    (["reinforcement", "pile cap"],            "C030100", "1.01", "Substructure – Reinforcement",     "Mass (t)", 95),
    (["reinforcement", "ground beam"],         "C030100", "1.01", "Substructure – Reinforcement",     "Mass (t)", 95),
    (["reinforcement", "slab on grade"],       "C030100", "1.01", "Substructure – Reinforcement",     "Mass (t)", 95),
    (["reinforcement", "suspended slab"],      "C030100", "2.02", "Upper Floors – Reinforcement",     "Mass (t)", 95),
    (["reinforcement", "upper floor"],         "C030100", "2.02", "Upper Floors – Reinforcement",     "Mass (t)", 95),
    (["reinforcement", "external wall"],       "C030100", "2.05", "External Walls – Reinforcement",   "Mass (t)", 95),
    (["reinforcement", "internal wall"],       "C030100", "2.07", "Internal Walls – Reinforcement",   "Mass (t)", 95),
    (["reinforcement", "staircase"],           "C030100", "2.04", "Stairs and Ramps – Reinforcement", "Mass (t)", 95),
    (["reinforcement", "column"],              "C030100", "2.01", "Frame – Reinforcement",            "Mass (t)", 95),
    (["reinforcement", "beam"],                "C030100", "2.01", "Frame – Reinforcement",            "Mass (t)", 95),
    (["reinforcement", "roof"],                "C030100", "2.03", "Roof – Reinforcement",             "Mass (t)", 93),

    # ── C040100..C040110 formwork — split by location ──
    (["formwork", "foundation"],               "C040100", "1.01", "Substructure – Formwork",   "Area (m²)", 95),
    (["formwork", "pile cap"],                 "C040100", "1.01", "Substructure – Formwork",   "Area (m²)", 95),
    (["formwork", "ground beam"],              "C040100", "1.01", "Substructure – Formwork",   "Area (m²)", 95),
    (["formwork", "slab on grade"],            "C040100", "1.01", "Substructure – Formwork",   "Area (m²)", 95),
    (["formwork", "suspended slab"],           "C040100", "2.02", "Upper Floors – Formwork",   "Area (m²)", 95),
    (["formwork", "external wall"],            "C040100", "2.05", "External Walls – Formwork", "Area (m²)", 95),
    (["formwork", "internal wall"],            "C040100", "2.07", "Internal Walls – Formwork", "Area (m²)", 95),
    (["formwork", "staircase"],                "C040100", "2.04", "Stairs and Ramps – Formwork","Area (m²)", 95),
    (["formwork", "column"],                   "C040100", "2.01", "Frame – Formwork",          "Area (m²)", 95),
    (["formwork", "beam"],                     "C040100", "2.01", "Frame – Formwork",          "Area (m²)", 95),
    (["formwork", "roof"],                     "C040100", "2.03", "Roof – Formwork",           "Area (m²)", 93),

    # ── D020100 blockwork — external vs internal ──
    (["blockwork", "external"],                "D020100", "2.05", "External Walls – Blockwork", "Area (m²)", 93),
    (["blockwork", "external wall"],           "D020100", "2.05", "External Walls – Blockwork", "Area (m²)", 95),
    (["blockwork", "internal"],                "D020100", "2.07", "Internal Walls – Blockwork", "Area (m²)", 93),
    (["blockwork", "partition"],               "D020100", "2.07", "Internal Walls – Blockwork", "Area (m²)", 93),

    # ── E020100 structural steel — frame vs roof ──
    (["structural steel", "frame"],            "E020100", "2.01", "Frame – Structural Steel", "Mass (t)", 95),
    (["structural steel", "column"],           "E020100", "2.01", "Frame – Structural Steel", "Mass (t)", 95),
    (["structural steel", "beam"],             "E020100", "2.01", "Frame – Structural Steel", "Mass (t)", 95),
    (["structural steel", "roof"],             "E020100", "2.03", "Roof – Structural Steel",  "Mass (t)", 95),
    (["structural steel", "truss"],            "E020100", "2.03", "Roof – Trusses",           "Mass (t)", 93),

    # ── E030100 handrails — stair vs wall ──
    (["handrail", "staircase"],                "E030100", "2.04", "Stairs and Ramps – Handrail", "Length (m)", 95),
    (["handrail", "stair"],                    "E030100", "2.04", "Stairs and Ramps – Handrail", "Length (m)", 95),
    (["handrail", "ramp"],                     "E030100", "2.04", "Stairs and Ramps – Handrail", "Length (m)", 93),
    (["handrail", "wall"],                     "E030100", "2.07", "Internal Walls – Handrail",   "Length (m)", 90),
    (["balustrade", "stair"],                  "E030100", "2.04", "Stairs and Ramps – Balustrade","Length (m)", 95),

    # ── F020100 timbers — floor joist vs roof rafter vs stud ──
    (["floor joist"],                          "F020100", "2.02", "Upper Floors – Joists",       "Length (m)", 95),
    (["roof rafter"],                          "F020100", "2.03", "Roof – Rafters",              "Length (m)", 95),
    (["roof truss"],                           "F020100", "2.03", "Roof – Trusses",              "Length (m)", 95),
    (["stud wall", "timber"],                  "F020100", "2.07", "Internal Walls – Timber Stud","Length (m)", 93),
    (["stud", "partition"],                    "F020100", "2.07", "Internal Walls – Timber Stud","Length (m)", 90),

    # ── F030100/F030200 boarding — floor/roof/cladding ──
    (["floor board"],                          "F030100", "2.02", "Upper Floors – Boarding",   "Area (m²)", 95),
    (["floor boarding"],                       "F030100", "2.02", "Upper Floors – Boarding",   "Area (m²)", 95),
    (["roof board"],                           "F030100", "2.03", "Roof – Boarding",           "Area (m²)", 95),
    (["roof boarding"],                        "F030100", "2.03", "Roof – Boarding",           "Area (m²)", 95),
    (["wall cladding", "timber"],              "F030200", "2.05", "External Walls – Cladding", "Area (m²)", 93),
    (["external cladding"],                    "F030200", "2.05", "External Walls – Cladding", "Area (m²)", 93),

    # ── G020100 waterproofing — by surface ──
    (["waterproofing", "foundation"],          "G020100", "1.01", "Substructure – Tanking",     "Area (m²)", 95),
    (["waterproofing", "basement"],            "G020100", "1.01", "Substructure – Tanking",     "Area (m²)", 95),
    (["waterproofing", "tanking"],             "G020100", "1.01", "Substructure – Tanking",     "Area (m²)", 95),
    (["waterproofing", "roof"],                "G020100", "2.03", "Roof – Waterproofing",       "Area (m²)", 95),
    (["waterproofing", "external wall"],       "G020100", "2.05", "External Walls – Waterproofing", "Area (m²)", 93),
    (["waterproofing", "wet area"],            "G020100", "3.02", "Floor Finishes – Waterproofing","Area (m²)", 95),
    (["waterproofing", "bathroom"],            "G020100", "3.02", "Floor Finishes – Waterproofing","Area (m²)", 93),
    (["waterproofing", "toilet"],              "G020100", "3.02", "Floor Finishes – Waterproofing","Area (m²)", 93),

    # ── G040100 insulation — roof vs wall vs floor ──
    (["insulation", "roof"],                   "G040100", "2.03", "Roof – Insulation",          "Area (m²)", 95),
    (["insulation", "external wall"],          "G040100", "2.05", "External Walls – Insulation","Area (m²)", 95),
    (["insulation", "internal wall"],          "G040100", "2.07", "Internal Walls – Insulation","Area (m²)", 93),
    (["insulation", "floor"],                  "G040100", "2.02", "Upper Floors – Insulation",  "Area (m²)", 93),
    (["thermal insulation"],                   "G040100", "2.05", "External Walls – Insulation","Area (m²)", 88),

    # ── H010100 doors — external vs internal ──
    (["external door"],                        "H010100", "2.06", "External Doors", "Enumerated (nr)", 95),
    (["entrance door"],                        "H010100", "2.06", "External Doors", "Enumerated (nr)", 95),
    (["internal door"],                        "H010100", "2.08", "Internal Doors", "Enumerated (nr)", 95),
    (["fire door", "internal"],                "H010100", "2.08", "Internal Doors – Fire Door", "Enumerated (nr)", 95),

    # ── J020100/J020200 plaster/screed — wall vs floor ──
    (["plaster", "wall"],                      "J020100", "3.01", "Wall Finishes – Plaster",  "Area (m²)", 95),
    (["plaster", "ceiling"],                   "J020100", "3.03", "Ceiling Finishes – Plaster","Area (m²)", 93),
    (["screed", "floor"],                      "J020200", "3.02", "Floor Finishes – Screed",  "Area (m²)", 95),
    (["floor screed"],                         "J020200", "3.02", "Floor Finishes – Screed",  "Area (m²)", 95),

    # ── J030100/J030200 tiles/cladding — floor vs wall vs stair ──
    (["tile", "floor"],                        "J030100", "3.02", "Floor Finishes – Tile",  "Area (m²)", 95),
    (["floor tile"],                           "J030100", "3.02", "Floor Finishes – Tile",  "Area (m²)", 95),
    (["tile", "wall"],                         "J030200", "3.01", "Wall Finishes – Tile",   "Area (m²)", 95),
    (["wall tile"],                            "J030200", "3.01", "Wall Finishes – Tile",   "Area (m²)", 95),
    (["tile", "staircase"],                    "J030100", "2.04", "Stairs and Ramps – Tile","Area (m²)", 93),
    (["wall cladding"],                        "J030200", "3.01", "Wall Finishes – Cladding","Area (m²)", 90),

    # ── J060100 paint — wall vs floor vs ceiling vs stair ──
    (["paint", "wall"],                        "J060100", "3.01", "Wall Finishes – Paint",   "Area (m²)", 95),
    (["paint", "ceiling"],                     "J060100", "3.03", "Ceiling Finishes – Paint","Area (m²)", 95),
    (["paint", "floor"],                       "J060100", "3.02", "Floor Finishes – Paint",  "Area (m²)", 93),
    (["paint", "staircase"],                   "J060100", "2.04", "Stairs and Ramps – Paint","Area (m²)", 93),

    # ── Q020100 pipework — drainage/water/heat/gas/fire ──
    (["pipework", "drainage"],                 "Q020100", "5.03", "Disposal Installations – Pipework",  "Length (m)", 95),
    (["drainage", "pipe"],                     "Q020100", "5.03", "Disposal Installations – Pipework",  "Length (m)", 95),
    (["pipework", "water"],                    "Q020100", "5.04", "Water Installations – Pipework",     "Length (m)", 95),
    (["water", "pipe"],                        "Q020100", "5.04", "Water Installations – Pipework",     "Length (m)", 93),
    (["pipework", "heating"],                  "Q020100", "5.05", "Heat Source – Pipework",             "Length (m)", 95),
    (["pipework", "gas"],                      "Q020100", "5.09", "Fuel Installations – Pipework",      "Length (m)", 95),
    (["pipework", "fire"],                     "Q020100", "5.11", "Fire Protection – Pipework",         "Length (m)", 95),
    (["sprinkler", "pipe"],                    "Q020100", "5.11", "Fire Protection – Sprinkler Pipework","Length (m)", 95),

    # ── Q030100 ductwork — HVAC/vent/smoke ──
    (["ductwork", "hvac"],                     "Q030100", "5.06", "Air Treatment – Ductwork",  "Length (m)", 95),
    (["ductwork", "supply air"],               "Q030100", "5.06", "Air Treatment – Ductwork",  "Length (m)", 93),
    (["ductwork", "ventilation"],              "Q030100", "5.07", "Ventilation – Ductwork",     "Length (m)", 95),
    (["ductwork", "exhaust"],                  "Q030100", "5.07", "Ventilation – Exhaust",     "Length (m)", 95),
    (["ductwork", "smoke"],                    "Q030100", "5.11", "Fire Protection – Smoke Extract","Length (m)", 95),

    # ── Q040100 equipment — sanitary/boiler/AHU/pump/fire/tank ──
    (["sanitary", "appliance"],                "Q040100", "5.01", "Sanitary Appliances",      "Enumerated (nr)", 95),
    (["wc", "suite"],                          "Q040100", "5.01", "Sanitary Appliances – WC", "Enumerated (nr)", 95),
    (["wash basin"],                           "Q040100", "5.01", "Sanitary Appliances – Wash Basin","Enumerated (nr)", 95),
    (["boiler"],                               "Q040100", "5.05", "Heat Source – Boiler",     "Enumerated (nr)", 95),
    (["chiller"],                              "Q040100", "5.06", "Air Treatment – Chiller",  "Enumerated (nr)", 95),
    (["ahu"],                                  "Q040100", "5.06", "Air Treatment – AHU",      "Enumerated (nr)", 95),
    (["air handling unit"],                    "Q040100", "5.06", "Air Treatment – AHU",      "Enumerated (nr)", 95),
    (["pump", "water"],                        "Q040100", "5.04", "Water Installations – Pump","Enumerated (nr)", 93),
    (["pump", "fire"],                         "Q040100", "5.11", "Fire Protection – Pump",   "Enumerated (nr)", 95),
    (["fire extinguisher"],                    "Q040100", "5.11", "Fire Protection – Extinguisher","Enumerated (nr)", 95),
    (["water tank"],                           "Q040100", "5.04", "Water Installations – Tank","Enumerated (nr)", 95),
    (["fuel tank"],                            "Q040100", "5.09", "Fuel Installations – Tank","Enumerated (nr)", 95),

    # ── R020100, R040100, R060100, R070100 — electrical / fire alarm / comms ──
    (["fire alarm"],                           "R020100", "5.11", "Fire Protection – Fire Alarm",      "Item", 95),
    (["smoke detector"],                       "R020100", "5.11", "Fire Protection – Smoke Detector",  "Enumerated (nr)", 95),
    (["data", "cable"],                        "R040100", "5.12", "Communications – Data Cable",        "Length (m)", 95),
    (["data outlet"],                          "R040100", "5.12", "Communications – Data Outlet",       "Enumerated (nr)", 95),
    (["telephone", "cable"],                   "R040100", "5.12", "Communications – Telephone",         "Length (m)", 93),
    (["cctv"],                                 "R060100", "5.12", "Security – CCTV",                    "Enumerated (nr)", 95),
    (["access control"],                       "R060100", "5.12", "Security – Access Control",          "Enumerated (nr)", 95),
    (["intercom"],                             "R060100", "5.12", "Security – Intercom",                "Enumerated (nr)", 95),
    (["bms"],                                  "R070100", "5.12", "Controls – BMS",                     "Item", 95),
    (["building management"],                  "R070100", "5.12", "Controls – BMS",                     "Item", 93),
    (["emergency lighting"],                   "R020100", "5.11", "Fire Protection – Emergency Lighting","Enumerated (nr)", 95),
    (["exit sign"],                            "R020100", "5.11", "Fire Protection – Exit Sign",       "Enumerated (nr)", 95),
    (["lightning", "protection"],              "R080100", "5.11", "Lightning Protection",               "Item", 95),
    (["earthing"],                             "R080100", "5.11", "Fire and Lightning – Earthing",      "Item", 95),

    # ── Additional single-word splitters (validation spot-checks) ──
    (["gypsum ceiling"],                       "J050100", "3.03", "Ceiling Finishes – Gypsum",          "Area (m²)", 95),
    (["water closet"],                         "Q040100", "5.01", "Sanitary Appliances – Water Closet", "Enumerated (nr)", 96),
    (["sprinkler"],                            "Q040100", "5.11", "Fire Protection – Sprinkler",        "Enumerated (nr)", 93),
    (["rj45"],                                 "R040100", "5.12", "Communications – RJ45 Outlet",       "Enumerated (nr)", 95),
    (["fcu"],                                  "Q040100", "5.06", "Air Treatment – FCU",                "Enumerated (nr)", 95),
    (["fan coil unit"],                        "Q040100", "5.06", "Air Treatment – Fan Coil Unit",      "Enumerated (nr)", 95),
    (["exhaust duct"],                         "Q030100", "5.07", "Ventilation – Exhaust Duct",         "Length (m)", 95),
    (["exhaust fan"],                          "Q040100", "5.07", "Ventilation – Exhaust Fan",          "Enumerated (nr)", 95),
    (["passenger elevator"],                   "P010100", "5.10", "Lifts – Passenger Elevator",         "Enumerated (nr)", 96),
    (["passenger lift"],                       "P010100", "5.10", "Lifts – Passenger Lift",             "Enumerated (nr)", 96),
    (["goods lift"],                           "P010100", "5.10", "Lifts – Goods Lift",                 "Enumerated (nr)", 96),
    (["service lift"],                         "P010100", "5.10", "Lifts – Service Lift",               "Enumerated (nr)", 95),
    (["escalator"],                            "P020100", "5.10", "Lifts and Conveyors – Escalator",    "Enumerated (nr)", 96),
    (["travelator"],                           "P020200", "5.10", "Conveying – Travelator",             "Enumerated (nr)", 96),
    (["chiller"],                              "Q040100", "5.06", "Air Treatment – Chiller",            "Enumerated (nr)", 95),
    (["ahu"],                                  "Q040100", "5.06", "Air Treatment – AHU",                "Enumerated (nr)", 95),
    (["curtain wall"],                         "H020100", "2.06", "Windows & External Doors – Curtain Wall", "Area (m²)", 95),
    (["floor mounted wc"],                     "Q040100", "5.01", "Sanitary Appliances – Floor WC",     "Enumerated (nr)", 96),
    (["wall hung wc"],                         "Q040100", "5.01", "Sanitary Appliances – Wall-hung WC", "Enumerated (nr)", 96),
    (["urinal"],                               "Q040100", "5.01", "Sanitary Appliances – Urinal",       "Enumerated (nr)", 95),
    (["bidet"],                                "Q040100", "5.01", "Sanitary Appliances – Bidet",        "Enumerated (nr)", 95),
    (["shower tray"],                          "Q040100", "5.01", "Sanitary Appliances – Shower Tray",  "Enumerated (nr)", 95),
    (["mixer", "tap"],                         "Q040100", "5.01", "Sanitary Fittings – Mixer Tap",      "Enumerated (nr)", 93),
    (["mixer", "shower"],                      "Q040100", "5.01", "Sanitary Fittings – Shower Mixer",   "Enumerated (nr)", 93),
    (["soap dispenser"],                       "Q040100", "5.01", "Sanitary Fittings – Soap Dispenser", "Enumerated (nr)", 90),
]

# ---- group rules by section for clean output -------------------------------
def section_of(rule):
    code = rule[1]
    if not code: return "Z"
    s = code[0].upper()
    return s if s.isalpha() else "Z"

SECTION_LABELS = {
    "A": "PRELIMINARIES & GENERAL REQUIREMENTS A   →  9.01 (BWIC → 5.14)",
    "B": "SITE WORK / EXCAVATION / PILING B         →  1.01 / 7.01 / 8.01",
    "C": "CONCRETE C                                →  1.01 / 2.01–2.07",
    "D": "MASONRY D                                 →  2.05 / 2.07",
    "E": "METALWORK E                               →  2.01 / 2.03 / 2.04",
    "F": "WOODWORK / JOINERY F                      →  2.02 / 2.03 / 2.07 / 4.01",
    "G": "THERMAL & MOISTURE PROTECTION G           →  1.01 / 2.03 / 2.05 / 3.02",
    "H": "DOORS & WINDOWS H                         →  2.06 / 2.08",
    "J": "FINISHES J                                →  2.04 / 3.01 / 3.02 / 3.03",
    "K": "ACCESSORIES / SPECIALTIES K               →  2.07 / 4.01 / 5.01 / 8.01",
    "L": "EQUIPMENT L                               →  4.01 / 5.01",
    "M": "FURNISHINGS M                             →  4.01",
    "N": "SPECIAL CONSTRUCTION N                    →  4.01 / 8.01",
    "P": "CONVEYING SYSTEMS P                       →  5.10 / 5.14",
    "Q": "MECHANICAL Q                              →  5.01–5.11",
    "R": "ELECTRICAL R                              →  5.08 / 5.11 / 5.12 / 5.14 / 8.01",
    "Z": "MISCELLANEOUS",
}

# Build final rule list in original order, but with section comment headers
# inserted as we cross section boundaries. Splitter rules for each section
# are inserted at the TOP of that section so they take precedence in the
# rule engine (which fires the first matching rule).
buckets: dict[str, list] = defaultdict(list)
for r in NEW_RULES:
    buckets[section_of(r)].append(r)

# ── Top-priority overrides: must fire BEFORE any element-specific rule ──
# These go into section A so they appear at the top of the rule list and
# take precedence over splitters and originals. They catch demolition /
# alteration / strengthening work that would otherwise be misclassified
# as the original element (e.g. "Demolition of staircase" → must NOT be
# tagged as 2.04 Stairs and Ramps, it's 7.01 Minor Demo).
TOP_PRIORITY: list = [
    (["demolition of"],                        "B070100", "7.01", "Minor Demolition – Demolition", "Item", 97),
    (["demolition", "removal"],                "B070100", "7.01", "Minor Demolition – Demo & Remove","Item", 96),
    (["demolish"],                             "B070100", "7.01", "Minor Demolition – Demolish",   "Item", 97),
    (["dismantling"],                          "B070100", "7.01", "Minor Demolition – Dismantling","Item", 95),
    (["removal of existing"],                  "B070100", "7.01", "Minor Demolition – Removal",    "Item", 95),
    (["cutting of existing"],                  "B070100", "7.01", "Minor Demolition – Cutting",    "Item", 95),
    (["existing slab", "cutting"],             "B070100", "7.01", "Minor Demolition – Slab Cutting","Item", 95),
    (["existing slab", "cut"],                 "B070100", "7.01", "Minor Demolition – Slab Cutting","Item", 95),
    (["existing wall", "remove"],              "B070100", "7.01", "Minor Demolition – Wall Removal","Item", 95),
    (["alterations to existing"],              "B070100", "7.01", "Minor Demolition – Alterations","Item", 95),
    (["strengthening", "existing"],            "B070100", "7.01", "Minor Demolition – Strengthening","Item", 95),
    (["temporary", "shoring"],                 "B070100", "7.01", "Minor Demolition – Temp Shoring","Item", 95),
    (["temporary", "propping"],                "B070100", "7.01", "Minor Demolition – Temp Propping","Item", 95),
    # Prelim verbiage that should NEVER code as element
    (["the contractor shall"],                 "A010100", "9.01", "Preliminaries – Contract Clause","Item", 92),
    (["allow for"],                            "A010100", "9.01", "Preliminaries – Allowance",      "Item", 88),
    (["provisional sum"],                      "A010100", "9.01", "Preliminaries – Provisional Sum","Item", 95),
    (["provisional amount"],                   "A010100", "9.01", "Preliminaries – Provisional Sum","Item", 95),
    (["dayworks"],                             "A010100", "9.01", "Preliminaries – Dayworks",       "Item", 95),
    (["performance security"],                 "A010100", "9.01", "Preliminaries – Performance Security","Item", 95),
    (["performance bond"],                     "A010100", "9.01", "Preliminaries – Performance Bond","Item", 95),
    (["insurance"],                            "A010100", "9.01", "Preliminaries – Insurance",      "Item", 90),
]

# Distribute splitters by section letter
splitters_by_section: dict[str, list] = defaultdict(list)
for s in SPLITTERS:
    splitters_by_section[section_of(s)].append(s)
# Top-priority rules into section A so they appear FIRST in the rule list
splitters_by_section["A"] = TOP_PRIORITY + splitters_by_section["A"]

# ---- emit pomi_rules.py ----------------------------------------------------
HEADER_DOC = '''#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
pomi_rules.py — v2.0 CORRECTED
═══════════════════════════════════════════════════════════════════════════════
Stage-1 rules for the POMI BQ Auto-Coder.

This is a CORRECTED rewrite of the original rules. The original tagged every
POMI section with a single NRM code, which produced ~140 misclassifications
when items spanned multiple NRM groups.

Rule format:
    (keywords_list, pomi_code, nrm_code, nrm_desc, measurement, confidence)

ALL keywords in `keywords_list` must appear in the BQ description for the rule
to fire (case-insensitive substring match).

KEY FIXES applied (see pomi_to_nrm_corrected.json for full audit):

  Section B Piling B13-B18         : 8.01 External  →  1.01 Substructure
  Section B Underpinning B7        : 8.01 External  →  1.01 Substructure
  Section B Excavation for foundn  : 8.01 External  →  1.01 Substructure
  Section C Foundations / pile cap : 2.01 Frame     →  1.01 Substructure
  Section C Suspended slabs        : 2.01 Frame     →  2.02 Upper Floors
  Section C Walls                  : 2.01 Frame     →  2.05/2.07 by location
  Section C Staircases             : 2.01 Frame     →  2.04 Stairs and Ramps
  Section F Floor joists           : 2.01 Frame     →  2.02 Upper Floors
  Section F Roof timbers           : 2.01 Frame     →  2.03 Roof
  Section F Joinery / FF&E         : 2.01 Frame     →  4.01 FF&E
  Section H Internal doors         : 2.06 Ext Doors →  2.08 Internal Doors
  Section J Floor finishes         : 3.01 Walls     →  3.02 Floor Finishes
  Section J Ceiling finishes       : 3.01 Walls     →  3.03 Ceiling Finishes
  Section J Staircase finishes     : 3.01 Walls     →  2.04 Stairs and Ramps
  Section K Sanitary accessories   : 4.01 FF&E      →  5.01 Sanitary Appliances
  Section P Builder's work         : 5.10 Lifts     →  5.14 BWIC
  Section Q Sanitary fittings      : 5.06 Heating   →  5.01 Sanitary Appliances
  Section Q Drainage               : 5.06 Heating   →  5.03 Disposal
  Section Q Water supply           : 5.06 Heating   →  5.04 Water
  Section Q Heat source            : 5.06 Heating   →  5.05 Heat Source
  Section Q Ventilation            : 5.06 Heating   →  5.07 Ventilation
  Section Q Fuel installations     : 5.06 Heating   →  5.09 Fuel
  Section Q Fire protection        : 5.06 Heating   →  5.11 Fire Protection
  Section R Fire alarm             : 5.08 Electric  →  5.11 Fire & Lightning
  Section R Data / comms / CCTV    : 5.08 Electric  →  5.12 Comms & Security
  Section R Emergency lighting     : 5.08 Electric  →  5.11 Fire & Lightning
  Section R Earthing & lightning   : 5.08 Electric  →  5.11 Fire & Lightning
  Section R Builder's work         : 5.08 Electric  →  5.14 BWIC
  Section R External mains         : 5.08 Electric  →  8.01 External Works
═══════════════════════════════════════════════════════════════════════════════
"""

'''

def py_repr(v) -> str:
    if isinstance(v, str):
        # Use single-quoted repr but ensure printable
        return repr(v)
    return repr(v)

def fmt_rule(r) -> str:
    kws, pomi, nrm, desc, meas, conf = r
    kws_str = "[" + ", ".join(py_repr(k) for k in kws) + "],"
    return f"    ({kws_str:<72} {py_repr(pomi)}, {py_repr(nrm)}, {py_repr(desc)}, {py_repr(meas)}, {conf}),"

out_lines: list[str] = [HEADER_DOC, "RULES = [\n"]
SECTION_ORDER = ["A", "B", "C", "D", "E", "F", "G", "H", "J", "K", "L", "M", "N", "P", "Q", "R", "Z"]
for sec in SECTION_ORDER:
    rules_for_sec = buckets.get(sec, [])
    splits_for_sec = splitters_by_section.get(sec, [])
    if not rules_for_sec and not splits_for_sec:
        continue
    label = SECTION_LABELS.get(sec, f"SECTION {sec}")
    out_lines.append(f"    # ═══════════════════════════════════════════════════════════════════════\n")
    out_lines.append(f"    # SECTION {sec} — {label}\n")
    out_lines.append(f"    # ═══════════════════════════════════════════════════════════════════════\n")
    if splits_for_sec:
        out_lines.append(f"    # ── Splitter rules (high-confidence; fire BEFORE generic rules) ──\n")
        for r in splits_for_sec:
            out_lines.append(fmt_rule(r) + "\n")
        out_lines.append("\n")
    if rules_for_sec:
        out_lines.append(f"    # ── Original rules (NRM corrected) ──\n")
        for r in rules_for_sec:
            out_lines.append(fmt_rule(r) + "\n")
        out_lines.append("\n")

out_lines.append("]\n\n")

# HINT_KW — preserve original, with small additions
hint_lines = ["HINT_KW = {\n"]
for letter in sorted(HINT_KW.keys()):
    kws = HINT_KW[letter]
    # Render compactly across 1 or 2 lines
    parts = ", ".join(repr(k) for k in kws)
    hint_lines.append(f"    {repr(letter)}: [{parts}],\n")
hint_lines.append("}\n\n")
out_lines.extend(hint_lines)

out_lines.append("LEARNED_RULES = [\n    # Auto-appended at runtime by engine.save_new_rules().\n]\n")

(ROOT / "pomi_rules.py").write_text("".join(out_lines))

# ---- report -----------------------------------------------------------------
print(f"Original rules:           {len(ORIG_RULES)}")
print(f"  unchanged NRM:          {unchanged}")
print(f"  NRM changed:            {changed}")
print(f"Splitter rules added:     {len(SPLITTERS)}")
print(f"New total RULES:          {sum(len(b) for b in buckets.values()) + len(SPLITTERS)}")
print()
if unknown_codes:
    print(f"⚠ Codes not in corrected JSON ({len(unknown_codes)} unique): {dict(unknown_codes.most_common(10))}")
print()
print("Top 10 POMI codes by # of NRM changes:")
top = sorted(nrm_changes.items(), key=lambda kv: -len(kv[1]))[:15]
for code, changes in top:
    old_new = Counter((o, n) for o, n in changes)
    summary = ", ".join(f"{o}→{n}×{c}" for (o, n), c in old_new.most_common(3))
    print(f"  {code} ({len(changes)} rules): {summary}")
print()
print("All NRM transitions (count ≥5):")
trans = Counter()
for changes in nrm_changes.values():
    for o, n in changes:
        trans[(o, n)] += 1
for (o, n), c in trans.most_common():
    if c >= 5:
        print(f"  {o:>5} → {n:<5}  {c} rules")
