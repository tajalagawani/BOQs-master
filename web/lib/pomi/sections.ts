// Compact POMI section guide (A–R) for the classifier system prompt — mirrors
// engine/pomi_reference.py so the AI and offline engines share the same priors.

export const SECTIONS: Record<string, { title: string; units: string; hint: string }> = {
  A: { title: "General Requirements", units: "Item", hint: "preliminaries, insurance, bonds, supervision, mobilisation, temporary works, site facilities" },
  B: { title: "Site Work", units: "m³/m²/m/Nr", hint: "excavation, earthworks, filling, disposal, dewatering, piling, boreholes, demolition, drainage, paving, fencing, landscaping, tunnelling, dredging" },
  C: { title: "Concrete Work", units: "m³/m²/kg/t/m", hint: "concrete, reinforcement, formwork/shuttering, blinding, precast, prestressed, slabs, columns, beams, pile caps" },
  D: { title: "Masonry", units: "m²/m/Nr", hint: "blockwork, brickwork, masonry walls, piers, cavity, coping, sills" },
  E: { title: "Metalwork", units: "kg/t/m/Nr", hint: "structural steel, balustrades, handrails, gratings, stanchions, stainless" },
  F: { title: "Woodwork", units: "m/m²/Nr", hint: "timber, joinery, skirting, architrave, shelving, ironmongery, carpentry" },
  G: { title: "Thermal & Moisture Protection", units: "m²/m", hint: "waterproofing, tanking, membranes, damp proofing, insulation, roofing felt, vapour barrier" },
  H: { title: "Doors and Windows", units: "Nr/m²/m", hint: "doors, windows, glazing, glass, screens, curtain walling, louvres, patent glazing, ironmongery" },
  J: { title: "Finishes", units: "m²/m", hint: "plaster, render, tiling, paint, decoration, screed, flooring, carpet, vinyl, ceilings, cladding, marble, granite" },
  K: { title: "Accessories", units: "m/Nr", hint: "partitions, toilet cubicles, signage, proprietary items" },
  L: { title: "Equipment", units: "Item/Nr", hint: "kitchen/catering, laboratory, stage, specialist function equipment" },
  M: { title: "Furnishings", units: "Item/Nr/m", hint: "loose furniture, curtains, blinds, rugs, artwork" },
  N: { title: "Special Construction", units: "Item/Nr", hint: "enclosures, prefabricated buildings, cold/clean rooms, pools, radiation protection" },
  P: { title: "Conveying Systems", units: "Nr/Item", hint: "lifts, escalators, hoists, conveyors, travelators" },
  Q: { title: "Mechanical Engineering Installations", units: "m/Nr/kg/Item", hint: "pipework, ductwork, HVAC, chilled water, drainage pipe, valves, pumps, fans, AHU/FCU, sanitary, plumbing, sprinkler, ventilation" },
  R: { title: "Electrical Engineering Installations", units: "m/Nr/Item", hint: "cable, conduit, wiring, lighting, luminaires, sockets, switchgear, distribution boards, transformers, earthing, containment, fire alarm, data, generators" },
};

export function section_summary(): string {
  return Object.entries(SECTIONS)
    .map(([k, s]) => `${k} — ${s.title} (units ${s.units}): ${s.hint}`)
    .join("\n");
}
