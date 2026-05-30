/**
 * Pure constants used by the cost calculations. The roshn original
 * also exported a chart-color palette tied to its branding module —
 * IOX defines its own visual treatment so we deliberately do NOT
 * port the color palettes here.
 */

export const NRM_CATEGORIES = [
  "Facilitating Works",
  "Substructure",
  "Superstructure",
  "Building External Envelope",
  "Internal Walls & Doors",
  "Internal Finishes",
  "FF&E",
  "Services Equipment",
  "Sanitary Fittings",
  "Mechanical Services",
  "Electrical Services",
  "External Works",
  "Conveying Systems",
  "General Requirements",
] as const;

export type NRMCategory = (typeof NRM_CATEGORIES)[number];
