// Shared NRM L1 element palette + ordering for the Elemental-by-Project views.
//
// Colour and display order are keyed by the *element label* (post-repair, e.g.
// "Internal Walls and Doors", "Bridges & Tunnels") so the same element gets the
// same colour and position across the Composition and Distribution views.
//
// Two vocabularies coexist in the benchmark data:
//   • Buildings cohort  — ~13 elements (NRM-aligned)
//   • Infrastructure    — ~24 civil/utility elements
// Both are listed here in a sensible construction order; anything unknown falls
// back to a deterministic hashed colour and sorts to the end.

interface ElementMeta {
  /** Display rank (lower = drawn first / left-most in the stack). */
  rank: number;
  /** Stable hex fill. */
  color: string;
  /** Coarse family, used for grouping headers in the legend. */
  family: "Buildings" | "Infrastructure" | "Other";
}

// Order matters: index becomes the rank.
const BUILDINGS: Array<[string, string]> = [
  ["Substructure", "#78716c"],
  ["Superstructure", "#3b82f6"],
  ["Building External Envelope", "#0ea5e9"],
  ["Internal Walls and Doors", "#6366f1"],
  ["Conveying Systems", "#14b8a6"],
  ["Mechanical", "#10b981"],
  ["Electrical", "#f59e0b"],
  ["Sanitary Fittings", "#06b6d4"],
  ["Services Equipment", "#84cc16"],
  ["FF&E", "#8b5cf6"],
  ["General Requirements", "#a1a1aa"],
  ["External Works", "#22c55e"],
];

const INFRASTRUCTURE: Array<[string, string]> = [
  ["Earthworks", "#a16207"],
  ["Roads", "#57534e"],
  ["Bridges & Tunnels", "#1d4ed8"],
  ["Stormwater", "#0891b2"],
  ["Sewerage", "#4d7c0f"],
  ["Potable Water", "#0284c7"],
  ["Irrigation", "#16a34a"],
  ["Streetscape", "#ca8a04"],
  ["Public Realm - Open Space", "#65a30d"],
  ["Streetlighting", "#d97706"],
  ["Telecom", "#7c3aed"],
  ["Gas", "#dc2626"],
  ["Substation 0.4/11-22kV", "#ea580c"],
  ["District Cooling Plant", "#0d9488"],
  ["Chilled Water", "#2563eb"],
  ["Land Reclamation & Marine", "#0369a1"],
  ["Ground Investigation", "#92400e"],
  ["Demolition & Site Clearance", "#b91c1c"],
  ["Security", "#9333ea"],
  ["Employer's Network", "#4f46e5"],
  ["Offsite Utility Connections", "#c026d3"],
  ["Other Utility Buildings", "#db2777"],
  ["Preliminaries", "#71717a"],
  ["Facilitating Works", "#525252"],
];

const META = new Map<string, ElementMeta>();
BUILDINGS.forEach(([label, color], i) =>
  META.set(label, { rank: i, color, family: "Buildings" }),
);
INFRASTRUCTURE.forEach(([label, color], i) =>
  META.set(label, { rank: 100 + i, color, family: "Infrastructure" }),
);
// The repaired residual bucket — always last, muted.
META.set("Unclassified", { rank: 9000, color: "#d4d4d8", family: "Other" });

// Deterministic fallback palette for any label not enumerated above.
const FALLBACK = [
  "#64748b", "#0ea5e9", "#8b5cf6", "#f97316", "#14b8a6",
  "#ec4899", "#eab308", "#06b6d4", "#a855f7", "#22c55e",
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function elementColor(label: string): string {
  const m = META.get(label);
  if (m) return m.color;
  return FALLBACK[hash(label) % FALLBACK.length];
}

export function elementRank(label: string): number {
  const m = META.get(label);
  if (m) return m.rank;
  // Unknown labels sort after the known set but before Unclassified.
  return 1000 + (hash(label) % 1000);
}

export function elementFamily(label: string): ElementMeta["family"] {
  return META.get(label)?.family ?? "Other";
}

/** Sort a list of element labels into stable display order. */
export function sortElements(labels: string[]): string[] {
  return [...labels].sort(
    (a, b) => elementRank(a) - elementRank(b) || a.localeCompare(b),
  );
}
