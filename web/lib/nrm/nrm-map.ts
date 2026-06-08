// NRM element taxonomy → POMI clause mapping.
//
// Source: the client-provided NRM element schedule. Keyed by the 4-char NRM
// code (e.g. "2.01") that every POMI-classified item already carries
// (pomi.nrm_code). Used to surface the high-level NRM Group, the full
// POMI-clause set, and the measurement methods alongside each BOQ item.
//
// `group` spans several codes (e.g. 2.01–2.04 = "Superstructure") and is NOT
// derivable from the code number — hence this explicit table.

export interface NrmElement {
  /** 4-char NRM code, e.g. "2.01". */
  code: string;
  /** High-level NRM group, e.g. "Superstructure". */
  group: string;
  /** NRM element description, e.g. "Frame". */
  description: string;
  /** Measurement method(s) for the element. */
  method: string;
  /** Full POMI clause set (one clause per line, "• " prefixed). */
  clauses: string;
}

export const NRM_ELEMENTS: NrmElement[] = [
  {
    code: "1.01",
    group: "Substructure",
    description: "Substructure",
    method: "Volume (m³), Length (m), Area (m²), Enumerated (nr), Item",
    clauses: `• B8.1 Earthworks generally - ground information
• B8.2 Quantities for excavation (bulk before excavation)
• B8.4 Earthwork support (item)
• B8.5 Excavation in rock (volume)
• B9.1 Excavation by volume - oversite, reduce levels, cuttings, basement, trench, pit, diaphragm walls
• B9.2 Trench excavation for service pipes (length)
• B11.1 Disposal - backfilled into excavation / making up levels / removed (volume)
• B12.1 Filling material - into excavation / making up levels (volume)
• B13.1 Piling generally - driven piling definitions
• B13.2 Other piling systems
• B14.1 Supplying driven piles (length)
• B14.2 Heads and shoes (enumerated)
• B14.3 Driving piles (length)
• B14.4 Cutting off tops of piles (enumerated)
• B15.1 Boring for piles (length)
• B15.2 Boring through rock extra over (length)
• B15.3 Linings for piles (length)
• B15.4 Disposal from boring (volume)
• B15.5 Concrete filling to piles (volume)
• B15.6 Cutting off tops / enlarged bases (enumerated)
• B16.1-B16.6 Sheet piling - supply (area), drive (area), cut (length)
• B17.1 Performance designed piles (enumerated)
• B18.1 Testing piling (item)
• B7.1-B7.5 Underpinning - excavation (volume), cutting projecting foundations (length)
• C2.1 Poured concrete - foundations, pile caps, blinding, beds (volume)
• C3.1-C3.4 Reinforcement - bar (weight), fabric (area)
• C4.1 Shuttering - sides of foundations, pile caps, ground beams (area)`,
  },
  {
    code: "2.01",
    group: "Superstructure",
    description: "Frame",
    method: "Volume (m³), Weight (t), Area (m²), Length (m), Enumerated (nr), Item",
    clauses: `• C2.1 Poured concrete - walls, columns, beams, suspended slabs, staircases (volume)
• C2.2 Suspended slabs special construction (area)
• C3.1-C3.4 Reinforcement - bar (weight), fabric (area)
• C4.1 Shuttering - soffits, sides of walls, columns, beams (area)
• C5.1-C5.6 Precast concrete - floor slabs (area), structural units beams/stanchions (enumerated)
• C6.1-C6.4 Prestressed concrete (volume)
• E2.1 Structural metalwork - grillages, beams, stanchions, portal frames, roof trusses (weight)
• E2.2 Fittings - caps, brackets (item)
• E2.3 Fixings - bolts, rivets (item)
• E2.4 Wedging and grouting bases (enumerated)
• E2.5 Holding down bolts (enumerated)
• E2.6 Protective treatment (item)
• F2.1 Structural timbers - floors, pitched roofs, walls (length)
• F2.2 Strutting and bridging between joists (length)`,
  },
  {
    code: "2.02",
    group: "Superstructure",
    description: "Upper Floors",
    method: "Volume (m³), Area (m²), Weight (t), Length (m)",
    clauses: `• C2.1 Poured concrete - suspended slabs stating thickness (volume)
• C2.2 Suspended slabs special construction - coffered, troughed (area)
• C3.1-C3.4 Reinforcement - bar (weight), fabric (area)
• C4.1 Shuttering - soffits, sloping soffits of staircases (area)
• C5.3 Precast floor slabs, partition slabs (area)
• C5.5 Precast structural units - beams (enumerated)
• F3.1 Boarding and flooring - floors incl. landings (area)`,
  },
  {
    code: "2.03",
    group: "Superstructure",
    description: "Roof",
    method: "Area (m²), Length (m), Volume (m³), Weight (t), Enumerated (nr)",
    clauses: `• C2.1 Poured concrete - suspended slabs / roofs (volume)
• C3.1-C3.4 Reinforcement (weight / area)
• C4.1 Shuttering - soffits, sloping upper surfaces >15° (area)
• E2.1 Structural metalwork - roof trusses (weight)
• F2.1 Structural timbers - pitched roofs, flat roofs (length)
• F3.1 Boarding - roofs incl. tops and cheeks of dormers, gutters (area)
• F3.2 Eaves and verge boards, fascias, barge boards (length)
• G2.1 Roofing / waterproof coverings - flat, sloping, vertical (area)
• G2.2 Eaves, ridges, skirtings, fascias, flashings, aprons (length)
• G2.3 Roof lights, ventilators, soaker collars (enumerated)
• G4.1 Insulation (area)`,
  },
  {
    code: "2.04",
    group: "Superstructure",
    description: "Stairs and Ramps",
    method: "Volume (m³), Area (m²), Enumerated (nr), Length (m)",
    clauses: `• C2.1 Poured concrete - staircases incl. steps and strings (volume)
• C3.1-C3.4 Reinforcement (weight / area)
• C4.1 Shuttering - staircases, sloping soffits (area)
• C5.5 Precast structural units - stair units (enumerated)
• E3.3 Metalwork - staircases (enumerated)
• F2.1 Structural timbers (length)
• J3.1 Finishings - staircases, treads, risers, edges of landings (area)
• J6.3 Decorations - staircases (area)`,
  },
  {
    code: "2.05",
    group: "Building External Envelope",
    description: "External Walls",
    method: "Area (m²), Volume (m³), Length (m), Weight (t)",
    clauses: `• C2.1 Poured concrete - walls incl. attached columns (volume)
• C3.1-C3.4 Reinforcement (weight / area)
• C4.1 Shuttering - sides of walls, returns, reveals (area)
• D2.1 Masonry walls and piers - walls, cavity walls (area)
• D2.2 Faced or fair-faced work (area extra over)
• D3.1 Sills, copings, oversailing courses (length)
• D5.1 Concrete filling to cavities (area)
• D5.2 Expansion joints (length)
• G2.1 External waterproof coverings - vertical (area)
• G3.1 Damp-proof courses (length / area)
• G4.1 Insulation (area)
• J2.1-J2.3 Backgrounds - external walls (area)
• J3.1 Finishings - external walls (area)`,
  },
  {
    code: "2.06",
    group: "Building External Envelope",
    description: "Windows and External Doors",
    method: "Enumerated (nr), Area (m²), Length (m)",
    clauses: `• H1.1 Doors (enumerated)
• H1.2 Jambs, heads, sills, mullions, transomes (length)
• H2.1 Windows, skylights and frames (enumerated)
• H3.1 Screens, curtain walling (area / enumerated)
• H4.1 Ironmongery - units or sets (enumerated)
• H5.1 Glass (area)
• H5.2 Sealed factory-glazed units (enumerated)
• H6.1 Patent glazing - roofs, skylights, vertical surfaces (area)
• H6.2 Opening portions (enumerated)
• J6.3 Decorations - windows measured flat over glass (area)`,
  },
  {
    code: "2.07",
    group: "Internal Walls and Doors",
    description: "Internal Walls and Partitions",
    method: "Area (m²), Length (m), Volume (m³), Enumerated (nr)",
    clauses: `• C2.1 Poured concrete - internal walls (volume)
• C3.1-C3.4 Reinforcement (weight / area)
• C4.1 Shuttering - sides of walls (area)
• D2.1 Masonry internal walls (area)
• D5.2 Expansion joints (length)
• D5.3 Air bricks (enumerated)
• K2.1 Partitions taken over all doors and glazed units (length)
• K2.3 Cubicles (enumerated)
• J3.1 Finishings - walls incl. returns, reveals, columns (area)
• J6.3 Decorations - walls (area)`,
  },
  {
    code: "2.08",
    group: "Internal Walls and Doors",
    description: "Internal Doors",
    method: "Enumerated (nr), Length (m), Area (m²)",
    clauses: `• H1.1 Doors (enumerated)
• H1.2 Jambs, heads, sills, mullions, transomes (length)
• H3.2 Doors and frames within a screen (enumerated)
• H4.1 Ironmongery - units or sets (enumerated)
• K2.2 Doors and glazed units in partitions (enumerated)
• J6.3 Decorations - doors, general surfaces (area)`,
  },
  {
    code: "3.01",
    group: "Internal Finishes",
    description: "Wall Finishes",
    method: "Area (m²), Length (m)",
    clauses: `• J2.1 Backgrounds - walls (area)
• J2.2 Poured backgrounds / screeds - walls (area)
• J2.3 Pre-formed backgrounds - plasterboard, EML (area)
• J3.1 Finishings - walls incl. returns, reveals, attached / unattached columns (area)
• J3.2 Skirtings, bands, strings, mouldings, coves, channels (length)
• J4.1 Non-slip inserts, angle beads, lathing at junctions (length)
• J6.1-J6.3 Decorations - walls (area)`,
  },
  {
    code: "3.02",
    group: "Internal Finishes",
    description: "Floor Finishes",
    method: "Area (m²), Length (m)",
    clauses: `• J2.1 Backgrounds - floors (area)
• J2.2 Poured backgrounds / screeds - floors (area)
• J3.1 Finishings - floors incl. landings (area)
• J3.2 Skirtings, coverings to kerbs (length)
• J4.1 Dividing strips, non-slip inserts (length)
• J6.3 Decorations - floors (area)
• C7.1 Concrete surfaces to falls / cross-falls (area)
• C7.2 Concrete surface finishes (area)`,
  },
  {
    code: "3.03",
    group: "Internal Finishes",
    description: "Ceiling Finishes",
    method: "Area (m²)",
    clauses: `• J2.1 Backgrounds - ceilings (area)
• J2.3 Pre-formed backgrounds - plasterboard, EML (area)
• J3.1 Finishings - ceilings incl. attached / unattached beams, soffits of staircases (area)
• J5.1 Suspended ceilings - stating drop; sides and soffits of beams / upstands (area)
• J6.3 Decorations - ceilings (area)
• F3.1 Boarding - ceilings incl. attached / unattached beams, soffits (area)`,
  },
  {
    code: "4.01",
    group: "FF&E",
    description: "Furniture, Fittings and Equipment",
    method: "Enumerated (nr), Length (m), Area (m²), Item",
    clauses: `• M1.1 Furnishings - loose furniture, rugs, curtains, artwork (item / enumerated)
• M1.2 Each category of furnishing (item / enumerated / length)
• M2.1 Curtain track (length)
• L1.1 Equipment - specialist function e.g. food prep, lab, stage (item / enumerated)
• L1.2 Each category of equipment (item / enumerated)
• K1.1 Accessories - specially manufactured / proprietary items (enumerated)
• K1.2 Accessories generally (enumerated)
• F6.1 Finishings - cover fillets, architraves, skirtings, beads, edgings, window boards (length)
• F6.2 Fittings - worktops, handrails, balustrades (length)
• F6.3 Shelving (area / length)
• F6.4 Backboards (enumerated)
• F7.1 Composite / fabricated items (enumerated)
• F10.1 Ironmongery - units or sets (enumerated)`,
  },
  {
    code: "5.01",
    group: "Sanitary Fittings",
    description: "Sanitary Appliances and Fittings",
    method: "Enumerated (nr), Length (m)",
    clauses: `• Q4.1 Sanitary fittings, tanks, fans, pumps, hoods, air-handling units (enumerated)
• Q2.1 Connection pipework (length)
• Q2.3 Valves, traps (enumerated)
• B19.1 Underground drain pipes (length)
• B19.3 Drain accessories - gullies, traps (enumerated)
• B19.5 Inspection chambers (enumerated)`,
  },
  {
    code: "5.02",
    group: "Services Equipment",
    description: "Services Equipment",
    method: "Enumerated (nr), Item",
    clauses: `• Q4.1 Mechanical equipment - tanks, pumps, fans, air-handling units (enumerated)
• R7.1 Electrical equipment - transformers, generators, luminaires (enumerated)
• L1.1 Specialist function equipment (item / enumerated)
• Q5.1 Automatic controls - thermostats, motorised valves (enumerated)`,
  },
  {
    code: "5.03",
    group: "Mechanical",
    description: "Disposal Installations",
    method: "Length (m), Enumerated (nr), Item",
    clauses: `• Q2.1 Disposal pipework (length)
• Q2.2 Fittings to large pipes >60mm dia. (enumerated)
• Q2.3 Valves, traps, expansion compensators (enumerated)
• Q7.1 Insulation to pipework (length)
• Q8.1 Sundries per clause P2 (item)
• Q9.1 Incidental work per clause P3 (item)
• B19.1-B19.6 Underground drainage - pipes (length), fittings (enumerated), accessories (enumerated), chambers (enumerated)`,
  },
  {
    code: "5.04",
    group: "Mechanical",
    description: "Water Installations",
    method: "Length (m), Enumerated (nr), Item",
    clauses: `• Q2.1 Water supply pipework (length)
• Q2.2 Fittings to large pipes >60mm dia. (enumerated)
• Q2.3 Valves, traps, expansion compensators (enumerated)
• Q4.1 Tanks, pumps (enumerated)
• Q6.1 Connections to supply mains (enumerated)
• Q7.1 Insulation to pipework (length)
• Q8.1 Sundries per clause P2 (item)
• Q9.1 Incidental work per clause P3 (item)`,
  },
  {
    code: "5.05",
    group: "Mechanical",
    description: "Heat Source",
    method: "Length (m), Enumerated (nr), Item",
    clauses: `• Q4.1 Boilers, heat exchangers, pumps (enumerated)
• Q2.1 Heating flow and return pipework (length)
• Q2.3 Valves, expansion compensators (enumerated)
• Q5.1 Automatic controls - thermostats, motorised valves (enumerated)
• Q6.1 Connections to supply mains (enumerated)
• Q7.1 Insulation to pipework (length)
• Q8.1 Sundries per clause P2 (item)`,
  },
  {
    code: "5.06",
    group: "Mechanical",
    description: "Space Heating and Air Treatment",
    method: "Length (m), Weight (t), Area (m²), Enumerated (nr), Item",
    clauses: `• Q2.1 Heating / cooling circuit pipework (length)
• Q2.3 Valves, expansion compensators (enumerated)
• Q3.1 Rectangular ductwork (weight)
• Q3.2 Circular / oval / flexible ductwork (length)
• Q3.4 Dampers, grilles, flexible connectors (enumerated)
• Q4.1 Fans, pumps, air-handling units, hoods (enumerated)
• Q4.2 Continuous convectors (length)
• Q4.3 Heated / ventilated ceilings (area)
• Q5.1 Automatic controls (enumerated)
• Q7.1 Insulation to pipework (length)
• Q7.2 Insulation to rectangular ductwork (area)
• Q7.3 Insulation to circular / oval ductwork (length)
• Q8.1 Sundries per clause P2 (item)
• Q9.1 Incidental work per clause P3 (item)`,
  },
  {
    code: "5.07",
    group: "Mechanical",
    description: "Ventilation",
    method: "Length (m), Weight (t), Area (m²), Enumerated (nr), Item",
    clauses: `• Q3.1 Rectangular ductwork (weight)
• Q3.2 Circular / oval / flexible ductwork (length)
• Q3.3 Fittings to circular / oval ductwork (enumerated)
• Q3.4 Dampers, grilles, flexible connectors (enumerated)
• Q4.1 Fans, air-handling units (enumerated)
• Q5.1 Automatic controls (enumerated)
• Q7.2 Insulation to rectangular ductwork (area)
• Q7.3 Insulation to circular ductwork (length)
• Q8.1 Sundries per clause P2 (item)
• Q9.1 Incidental work per clause P3 (item)`,
  },
  {
    code: "5.08",
    group: "Electrical",
    description: "Electrical Installations",
    method: "Length (m), Enumerated (nr), Item",
    clauses: `• R2.2 Main circuit cable (length)
• R2.3 Main circuit conduit (length)
• R3.2 Sub-main cable and conduit (enumerated / length)
• R4.1 Final sub-circuits to lighting points, sockets, equipment points, auxiliary points (enumerated)
• R5.1 Accessories - ceiling roses, switches, socket outlets, bell pushes (enumerated)
• R6.1 Control gear - switchgear, distribution boards, contactors, starters (enumerated)
• R7.1 Equipment - transformers, generators, luminaires, external columns, clocks, loudspeakers (enumerated)
• R7.2 Controls incl. accessories and interconnecting cables (per relevant R clauses)
• R8.1 Connections to supply mains (enumerated)
• R9.1 Sundries per clause P2 (item)
• R10.1 Incidental work per clause P3 (item)`,
  },
  {
    code: "5.09",
    group: "Electrical",
    description: "Fuel Installations",
    method: "Length (m), Enumerated (nr), Item",
    clauses: `• Q2.1 Fuel supply pipework (length)
• Q2.3 Valves (enumerated)
• Q4.1 Storage tanks (enumerated)
• Q6.1 Connections to supply mains (enumerated)
• Q7.1 Insulation to pipework (length)
• Q8.1 Sundries per clause P2 (item)
• Q9.1 Incidental work per clause P3 (item)`,
  },
  {
    code: "5.10",
    group: "Conveying Systems",
    description: "Lift and Conveyor Installations",
    method: "Enumerated (nr), Item",
    clauses: `• P1.1 Lifts, hoists, conveyors, escalators (enumerated)
• P2.1 Sundries - supports, identification, testing and commissioning, tools, documents (item)
• P3.1 Incidental work - coordination, holes, mortices, chases, brackets (item)
• P3.2 Protective and decorative painting (item)
• P3.3 Other incidental work per relevant sections`,
  },
  {
    code: "5.11",
    group: "Conveying Systems",
    description: "Fire and Lightning Protection",
    method: "Enumerated (nr), Length (m), Item",
    clauses: `• R4.1 Final sub-circuits - fire alarm detection points (enumerated)
• R5.1 Accessories - detection devices, call points, sounders (enumerated)
• R6.1 Control gear - fire alarm panels (enumerated)
• R7.1 Equipment - sounders, beacons, sprinkler control (enumerated)
• R9.1 Sundries per clause P2 (item)
• R10.1 Incidental work per clause P3 (item)
• Q2.1 Sprinkler / suppression pipework (length)
• Q2.3 Valves, sprinkler heads (enumerated)`,
  },
  {
    code: "5.12",
    group: "Conveying Systems",
    description: "Communication, Security and Control Systems",
    method: "Enumerated (nr), Item",
    clauses: `• R4.1 Auxiliary installation points - telephone, data, security, AV (enumerated)
• R5.1 Accessories - data sockets, outlets (enumerated)
• R6.1 Control gear - CCTV panels, access control (enumerated)
• R7.1 Equipment - cameras, speakers, door entry units (enumerated)
• R9.1 Sundries per clause P2 (item)
• R10.1 Incidental work per clause P3 (item)`,
  },
  {
    code: "5.13",
    group: "Conveying Systems",
    description: "Specialist Installations",
    method: "Enumerated (nr), Item",
    clauses: `• N1.1 Special construction - enclosures or specialist installations (general)
• N2.1 Enclosures e.g. air-supported, geodetic, prefabricated (enumerated)
• N3.1 Installations e.g. radiation protection (item)
• Q4.1 Specialist mechanical equipment (enumerated)
• R7.1 Specialist electrical equipment (enumerated)`,
  },
  {
    code: "5.14",
    group: "Conveying Systems",
    description: "Builder's Work in Connection with Services",
    method: "Item, Enumerated (nr)",
    clauses: `• P3.1 Incidental work - coordination, holes, mortices, chases, brackets (item)
• P3.2 Protective and decorative painting (item)
• Q9.1 Incidental work to mechanical installations per clause P3 (item)
• R10.1 Incidental work to electrical installations per clause P3 (item)
• C7.6 Fixings, ties, inserts (enumerated / area)
• D5.3 Air bricks (enumerated)`,
  },
  {
    code: "6.01",
    group: "Prefabricated Buildings",
    description: "Prefabricated Buildings and Building Units",
    method: "Enumerated (nr), Item",
    clauses: `• N1.1 Special construction - prefabricated buildings (general)
• N2.1 Prefabricated enclosures (enumerated)
• N3.1 Specialist installations (item)`,
  },
  {
    code: "7.01",
    group: "Work to Existing Buildings",
    description: "Minor Demolition and Alteration Works",
    method: "Item, Enumerated (nr), Area (m²), Length (m)",
    clauses: `• B4.1 Removing isolated trees (enumerated)
• B4.2 Removing hedges (length)
• B4.3 Site clearance - vegetation, undergrowth, trees (area)
• B5.1 Demolitions - location and disposal rules (general)
• B5.2 Removing individual fittings, fixtures, engineering installations (item)
• B5.3 Demolishing individual structures or part thereof (item)
• B5.4 Cutting openings / alterations to existing structures (item)
• B5.5 Temporary screens and roofs (item)
• B6.1 Shoring incidental to demolitions (included)
• B6.2 Shoring - other, stating location (item)`,
  },
  {
    code: "8.01",
    group: "External Works",
    description: "Site Works, Drainage, External Services and Landscaping",
    method: "Area (m²), Volume (m³), Length (m), Enumerated (nr), Item",
    clauses: `• B1.1 Keeping records of site observations and tests (item)
• B1.2 Samples, site tests, analyses (item)
• B1.3 Providing reports (item)
• B4.1 Removing isolated trees (enumerated)
• B4.2 Removing hedges (length)
• B4.3 Site clearance (area)
• B9.1 Excavation - oversite, reduce levels, trenches (volume)
• B11.1 Disposal - backfill or remove (volume)
• B12.1 Filling material (volume)
• B19.1 Underground drain pipes (length)
• B19.2 Drain fittings (enumerated)
• B19.3 Drain accessories - gullies, traps (enumerated)
• B19.4 Concrete beds / coverings for drains (length)
• B19.5 Inspection chambers (enumerated)
• B19.6 Connections to existing drains (enumerated)
• B20.1 Paving and surfacing (area)
• B20.2 Expansion joints and water stops (length)
• B20.3 Channels, curbs, edgings (length)
• B21.1 Fencing incl. posts (length)
• B21.2 Special posts - gate posts, straining posts (enumerated)
• B21.3 Gates, barriers (enumerated)
• B22.1 Cultivating and fertilising (area)
• B22.2 Soiling, seeding and turfing (area)
• B22.3 Hedges (length)
• B22.4 Trees and shrubs (enumerated)
• Q2.1 External services pipework (length)
• Q6.1 Connections to supply mains (enumerated)
• R2.2-R2.3 External cable and conduit (length)
• R8.1 External connections to supply mains (enumerated)`,
  },
  {
    code: "9.01",
    group: "General Requirements",
    description: "Preliminaries / General Requirements",
    method: "Item",
    clauses: `• A1.1-A1.2 Conditions of contract - clause headings schedule, appendix insertions schedule (item)
• A2.1 Specification - cross-reference to relevant specification clauses (item)
• A3.1 Restrictions - access, working space, working hours, services maintenance, order of works (item)
• A4.1 Contractor's admin - site admin, supervision, security, safety and welfare, transport (item)
• A5.1 Constructional plant - small plant and tools, scaffolding, cranes, site transport (item)
• A6.1 Employer's facilities - accommodation, telephones, vehicles, staff attendance, equipment (item)
• A7.1 Contractor's facilities - accommodation, fencing, roads, water, power, telephones (item)
• A7.2 Contractor's facilities - non-discretionary particulars (item)
• A8.1 Temporary works - traffic diversion, access roads, bridges, cofferdams, pumping, de-watering (item)
• A8.2 Temporary works - non-discretionary particulars (item)
• A9.1 Sundry items - testing, protecting works, rubbish removal, traffic, roads, drying, noise, statutory obligations (item)
• A9.2 Sundry items - non-discretionary particulars (item)`,
  },
];

const BY_CODE = new Map(NRM_ELEMENTS.map((e) => [e.code, e]));

/** Look up the NRM element for a 4-char NRM code (e.g. "2.01"). */
export function nrmInfo(code: string | null | undefined): NrmElement | undefined {
  if (!code) return undefined;
  return BY_CODE.get(code.trim());
}
