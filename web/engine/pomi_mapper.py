"""
POMI mapper — assigns a POMI code to each parsed BOQ item.

Primary engine: Claude AI (per project decision). When ANTHROPIC_API_KEY is set,
items are classified in batches by Claude against the POMI section rules and the
real code table, returning {section, code, nrm, method, confidence, rationale}.

Fallback engine: a deterministic keyword/section scorer that runs with NO API key
so the pipeline works offline today. It is intentionally conservative — it picks
the best section and a representative code, and reports a modest confidence so
genuinely ambiguous items are flagged for review rather than trusted blindly.

Both engines share one interface: map_items(items) -> list[Mapping]. Swapping in
the real key changes accuracy, not the calling code.
"""

from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass, asdict
from typing import Optional

from .pomi_reference import SECTION_GUIDE, load_codes, codes_by_section, section_summary_text


@dataclass
class Mapping:
    section: str = ""          # POMI section letter A–R
    code: str = ""             # 7-char POMI code, e.g. C030000
    pomi_desc: str = ""        # description of the matched code
    nrm_code: str = ""
    nrm_desc: str = ""
    method: str = ""           # measurement method / unit
    confidence: float = 0.0    # 0–100
    engine: str = ""           # "claude" | "offline"
    needs_review: bool = False
    rationale: str = ""


REVIEW_THRESHOLD = 85.0


# --------------------------------------------------------------------------------
# Offline deterministic engine
# --------------------------------------------------------------------------------

_WORD = re.compile(r"[a-z]+")


def _tokens(text: str) -> set[str]:
    return set(_WORD.findall(text.lower()))


def _score_section(text: str, unit: str) -> list[tuple[str, float]]:
    """Score every section for an item by keyword hits + unit compatibility."""
    toks = _tokens(text)
    scored = []
    for letter, g in SECTION_GUIDE.items():
        hits = 0.0
        for kw in g["keywords"]:
            if " " in kw:
                if kw in text.lower():
                    hits += 2.0          # multi-word phrase match is strong
            elif kw in toks:
                hits += 1.0
        if unit and unit in g["units"]:
            hits += 0.5
        if hits:
            scored.append((letter, hits))
    scored.sort(key=lambda x: x[1], reverse=True)
    return scored


def _best_code_in_section(text: str, section: str) -> Optional[dict]:
    """Pick the code within a section whose description best overlaps the item."""
    toks = _tokens(text)
    best, best_overlap = None, 0
    for c in codes_by_section().get(section, []):
        ov = len(toks & _tokens(c["description"]))
        if ov > best_overlap:
            best, best_overlap = c, ov
    return best


def _offline_map_one(full_text: str, unit: str) -> Mapping:
    scored = _score_section(full_text, unit)
    if not scored:
        return Mapping(engine="offline", confidence=0.0, needs_review=True,
                       rationale="No keyword match to any POMI section.")
    top_letter, top_score = scored[0]
    runner = scored[1][1] if len(scored) > 1 else 0.0

    code = _best_code_in_section(full_text, top_letter)
    g = SECTION_GUIDE[top_letter]

    # Confidence: separation between top and runner-up sections, capped.
    margin = top_score - runner
    conf = min(82.0, 40.0 + top_score * 8 + margin * 6)
    if code is None:
        # We know the section but not a granular code -> use the section header code.
        section_codes = codes_by_section().get(top_letter, [])
        code = section_codes[0] if section_codes else {
            "code": f"{top_letter}000000", "description": g["title"],
            "nrm_code": "", "nrm_desc": "", "measurement": ", ".join(g["units"])}
        conf = min(conf, 65.0)

    return Mapping(
        section=top_letter, code=code["code"], pomi_desc=code.get("full_text") or code["description"],
        nrm_code=code.get("nrm_code", ""), nrm_desc=code.get("nrm_desc", ""),
        method=code.get("measurement", ", ".join(g["units"])),
        confidence=round(conf, 1), engine="offline",
        needs_review=conf < REVIEW_THRESHOLD,
        rationale=f"Section {top_letter} ({g['title']}) by keyword score {top_score:.0f}"
                  f" vs next {runner:.0f}.",
    )


# --------------------------------------------------------------------------------
# Claude engine
# --------------------------------------------------------------------------------

CLAUDE_MODEL = os.environ.get("POMI_CLAUDE_MODEL", "claude-opus-4-8")
_BATCH = 25


def _claude_available() -> bool:
    return bool(os.environ.get("ANTHROPIC_API_KEY"))


def _build_system_prompt() -> str:
    return (
        "You are a quantity surveyor expert in POMI (Principles of Measurement "
        "International, RICS). Classify each Bill of Quantities item into exactly "
        "one POMI section (A–R) and the most specific valid POMI code.\n\n"
        "POMI sections:\n" + section_summary_text() + "\n\n"
        "Rules: choose the section by the NATURE of the work, not just the unit. "
        "Return the single best 7-character POMI code from the provided code list "
        "for that section. Give a confidence 0–100 (be honest; <85 means a human "
        "should review). Respond ONLY with a JSON array, one object per item, in "
        "order, each: {\"i\": <index>, \"code\": \"<POMI code>\", \"section\": "
        "\"<letter>\", \"confidence\": <number>, \"rationale\": \"<short>\"}."
    )


def _claude_batch(items: list[dict]) -> list[dict]:
    import anthropic  # imported lazily so offline use needs no dependency

    client = anthropic.Anthropic()
    section_codes = {s: [{"code": c["code"], "desc": c["description"]}
                        for c in cs[:60]]
                     for s, cs in codes_by_section().items()}
    payload = {
        "code_list_by_section": section_codes,
        "items": [{"i": it["i"], "description": it["text"], "unit": it["unit"]}
                  for it in items],
    }
    msg = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=4096,
        system=_build_system_prompt(),
        messages=[{"role": "user", "content": json.dumps(payload, ensure_ascii=False)}],
    )
    raw = msg.content[0].text.strip()
    raw = re.sub(r"^```(?:json)?|```$", "", raw, flags=re.M).strip()
    return json.loads(raw)


def _claude_map(texts: list[tuple[str, str]]) -> list[Mapping]:
    by_code = {c["code"]: c for c in load_codes()}
    results: list[Mapping] = [None] * len(texts)  # type: ignore

    for start in range(0, len(texts), _BATCH):
        chunk = texts[start:start + _BATCH]
        batch = [{"i": start + j, "text": t, "unit": u} for j, (t, u) in enumerate(chunk)]
        try:
            answers = _claude_batch(batch)
        except Exception as exc:  # fall back per-batch, never crash the whole run
            for j, (t, u) in enumerate(chunk):
                results[start + j] = _offline_map_one(t, u)
                results[start + j].rationale += f" (Claude error: {exc})"
            continue
        for a in answers:
            idx = a.get("i")
            code = by_code.get(a.get("code", ""))
            if idx is None or idx >= len(texts):
                continue
            if code is None:
                t, u = texts[idx]
                results[idx] = _offline_map_one(t, u)
                continue
            conf = float(a.get("confidence", 0))
            results[idx] = Mapping(
                section=code["section"], code=code["code"], pomi_desc=code.get("full_text") or code["description"],
                nrm_code=code.get("nrm_code", ""), nrm_desc=code.get("nrm_desc", ""),
                method=code.get("measurement", ""), confidence=conf, engine="claude",
                needs_review=conf < REVIEW_THRESHOLD, rationale=a.get("rationale", ""),
            )
    # Any holes (model skipped an index) -> offline fallback.
    for i, r in enumerate(results):
        if r is None:
            t, u = texts[i]
            results[i] = _offline_map_one(t, u)
    return results


# --------------------------------------------------------------------------------
# Public interface
# --------------------------------------------------------------------------------

def map_items(items: list[dict], force_offline: bool = False) -> list[Mapping]:
    """items: list of dicts with at least 'full_description' and 'unit'."""
    texts = [(it.get("full_description") or it.get("description", ""), it.get("unit", ""))
             for it in items]
    if not force_offline and _claude_available():
        return _claude_map(texts)
    return [_offline_map_one(t, u) for t, u in texts]


def mapping_to_dict(m: Mapping) -> dict:
    return asdict(m)
