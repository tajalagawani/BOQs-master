/**
 * Chart colour palette + helpers — ported from roshn/src/lib/chartColors.ts.
 *
 * The palette is re-tuned to IOX zinc/emerald/blue tones (instead of
 * roshn's brand teal). All export names + signatures preserved so the
 * summary sub-components compile unchanged.
 */

export const CHART_COLORS = {
  primary: "#18181B",
  primaryDark: "#09090B",
  primaryLight: "#52525B",

  // Pie/bar palette
  palette: [
    "#18181B", // zinc-900
    "#52525B", // zinc-600
    "#0EA5E9", // sky-500
    "#10B981", // emerald-500
    "#8B5CF6", // violet-500
    "#F59E0B", // amber-500
    "#EF4444", // rose-500
    "#06B6D4", // cyan-500
    "#84CC16", // lime-500
    "#EC4899", // pink-500
    "#A855F7", // purple-500
    "#14B8A6", // teal-500
  ],

  // S-Curve specific
  phase1SCurve: "#0EA5E9",
  phase2SCurve: "#10B981",
  sCurveTotal: "#18181B",
  phase1Cost: "#374151",
  phase2Cost: "#9CA3AF",

  // Status
  positive: "#10B981",
  warning: "#F59E0B",
  negative: "#EF4444",

  // Neutrals
  gray: {
    50: "#FAFAFA",
    100: "#F4F4F5",
    200: "#E4E4E7",
    300: "#D4D4D8",
    400: "#A1A1AA",
    500: "#71717A",
    600: "#52525B",
    700: "#3F3F46",
    800: "#27272A",
    900: "#18181B",
  },
};

export function getChartColor(index: number): string {
  return CHART_COLORS.palette[index % CHART_COLORS.palette.length];
}

export function generateChartColors(count: number): string[] {
  return Array.from({ length: count }, (_, i) => getChartColor(i));
}

export function formatChartValue(
  value: number,
  type: "currency" | "number" | "percentage" | "area" = "number",
): string {
  switch (type) {
    case "currency":
      if (value >= 1_000_000_000)
        return `SAR ${(value / 1_000_000_000).toFixed(2)}B`;
      if (value >= 1_000_000)
        return `SAR ${(value / 1_000_000).toFixed(2)}M`;
      if (value >= 1_000) return `SAR ${(value / 1_000).toFixed(2)}K`;
      return `SAR ${value.toLocaleString()}`;
    case "percentage":
      return `${value.toFixed(1)}%`;
    case "area":
      return `${value.toLocaleString()} m²`;
    case "number":
    default:
      if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
      if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
      return value.toLocaleString();
  }
}

export function formatAbbreviated(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
}

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
