/**
 * Source-app Dropdown Options
 * ALL options come from cost model (CSV) - SINGLE SOURCE OF TRUTH
 */

// Type for cost model entry (matches Prisma model)
// Uses unknown for numeric fields since we only use string fields for dropdowns
interface CostModelEntry {
  assetClass: string;
  assetTypeL1: string;
  assetFormL2: string | null;
  pricePoint: string | null;
  nrmLvl1: string;
  rcdcCostGfa: unknown; // Decimal | number
  benchmarkedCostGfa: unknown; // Decimal | number | null
}

// Row data type for cascading
type RowData = Record<string, unknown>;

// ============================================
// DYNAMIC DATE GENERATION
// ============================================

/**
 * Generate quarter date options dynamically
 * Generates quarters from startYear to endYear (inclusive)
 * Format: "1Q24", "2Q24", etc.
 *
 * @param startYear - Starting year (default: current year - 1)
 * @param endYear - Ending year (default: current year + 6)
 * @returns Array of quarter date strings
 */
export function generateQuarterDates(startYear?: number, endYear?: number): string[] {
  const currentYear = new Date().getFullYear();
  const start = startYear ?? currentYear - 1;
  const end = endYear ?? currentYear + 6;

  const dates: string[] = [];

  for (let year = start; year <= end; year++) {
    for (let quarter = 1; quarter <= 4; quarter++) {
      const yearSuffix = year.toString().slice(-2);
      dates.push(`${quarter}Q${yearSuffix}`);
    }
  }

  return dates;
}

// Cache the quarter dates to avoid regenerating on every call
let cachedQuarterDates: string[] | null = null;
let cachedYear: number | null = null;

/**
 * Get quarter dates with caching
 * Regenerates only when the year changes
 */
function getQuarterDates(): string[] {
  const currentYear = new Date().getFullYear();

  if (!cachedQuarterDates || cachedYear !== currentYear) {
    cachedQuarterDates = generateQuarterDates();
    cachedYear = currentYear;
  }

  return cachedQuarterDates;
}

// ============================================
// DYNAMIC PHASE GENERATION
// ============================================

// Type for masterplan phase
interface MasterplanPhase {
  phaseNumber: number;
  phaseName: string;
  startDate: string;
  totalMonths: number;
}

/**
 * Get phase options from masterplan phases array
 * @param phases - Array of masterplan phases with phaseName
 * @returns Array of phase name strings
 */
export function getPhaseOptionsFromMasterplan(phases?: MasterplanPhase[]): string[] {
  if (!phases || phases.length === 0) {
    return ["Phase 1"]; // Default fallback
  }
  return phases.map(p => p.phaseName);
}

/**
 * Generate phase options dynamically based on number of phases
 * @deprecated Use getPhaseOptionsFromMasterplan instead for actual phase names
 * @param numberOfPhases - Number of phases for the masterplan (1-10)
 * @returns Array of phase strings ["Phase 1", "Phase 2", ...]
 */
export function generatePhaseOptions(numberOfPhases: number = 4): string[] {
  const count = Math.max(1, Math.min(10, numberOfPhases)); // Clamp between 1-10
  return Array.from({ length: count }, (_, i) => `Phase ${i + 1}`);
}

/**
 * Get unique values from cost model entries
 */
function getUniqueValues(
  entries: CostModelEntry[],
  field: keyof CostModelEntry
): string[] {
  const values = new Set<string>();
  entries.forEach((entry) => {
    const value = entry[field];
    if (value && typeof value === "string" && value !== "-") {
      values.add(value);
    }
  });
  return Array.from(values).sort();
}

/**
 * Filter entries by asset classes (for table filtering)
 */
function filterByAssetClasses(
  entries: CostModelEntry[],
  assetClasses: string[]
): CostModelEntry[] {
  return entries.filter((e) => assetClasses.includes(e.assetClass));
}

/**
 * Filter entries by hierarchy selection (for cascading)
 */
function filterBySelection(
  entries: CostModelEntry[],
  filters: {
    assetClass?: string;
    assetTypeL1?: string;
    assetFormL2?: string;
  }
): CostModelEntry[] {
  let filtered = entries;

  if (filters.assetClass) {
    filtered = filtered.filter((e) => e.assetClass === filters.assetClass);
  }
  if (filters.assetTypeL1) {
    filtered = filtered.filter((e) => e.assetTypeL1 === filters.assetTypeL1);
  }
  if (filters.assetFormL2) {
    filtered = filtered.filter((e) => e.assetFormL2 === filters.assetFormL2);
  }

  return filtered;
}

// ============================================
// BUILDING ASSETS - Cascading Dropdowns
// Asset Classes: Residential, Commercial, Retail, Community Building
// ============================================
const BUILDING_ASSET_CLASSES = [
  "Residential",
  "Commercial",
  "Retail",
  "Community Building",
];

export function getBuildingAssetsOptions(
  costModelEntries: CostModelEntry[],
  phases?: MasterplanPhase[]
): (row: RowData) => Record<string, string[]> {
  const safeEntries = costModelEntries || [];
  const baseEntries = filterByAssetClasses(safeEntries, BUILDING_ASSET_CLASSES);

  return (row: RowData) => {
    const selectedClass = row.assetClass as string | undefined;
    const selectedL1 = row.assetTypeL1 as string | undefined;
    const selectedL2 = row.assetTypologyL2 as string | undefined;

    // Asset Class - always show all building asset classes from CSV
    const assetClassOptions = getUniqueValues(baseEntries, "assetClass");

    // Asset Type L1 - filter by selected class
    const entriesForL1 = selectedClass
      ? filterBySelection(baseEntries, { assetClass: selectedClass })
      : baseEntries;
    const assetTypeL1Options = getUniqueValues(entriesForL1, "assetTypeL1");

    // Asset Typology L2 - filter by selected class + L1
    const entriesForL2 = filterBySelection(baseEntries, {
      assetClass: selectedClass,
      assetTypeL1: selectedL1,
    });
    const assetTypologyL2Options = getUniqueValues(entriesForL2, "assetFormL2");

    // Price Point - filter by selected class + L1 + L2
    const entriesForPP = filterBySelection(baseEntries, {
      assetClass: selectedClass,
      assetTypeL1: selectedL1,
      assetFormL2: selectedL2,
    });
    const pricePointOptions = getUniqueValues(entriesForPP, "pricePoint");

    return {
      assetClass: assetClassOptions,
      assetTypeL1: assetTypeL1Options,
      assetTypologyL2: assetTypologyL2Options,
      pricePoint: pricePointOptions,
      // Dynamic phase options from masterplan's actual phases
      phase: getPhaseOptionsFromMasterplan(phases),
      baseDate: getQuarterDates(),
      glazingPercentage: ["None", "Low", "Medium", "High"],
    };
  };
}

// ============================================
// CAR PARKING - Cascading Dropdowns
// Asset Class: Car Parking (from CSV)
// ============================================
export function getCarParkingOptions(
  costModelEntries: CostModelEntry[],
  phases?: MasterplanPhase[]
): (row: RowData) => Record<string, string[]> {
  const safeEntries = costModelEntries || [];
  const baseEntries = filterByAssetClasses(safeEntries, ["Car Parking"]);

  return (row: RowData) => {
    const selectedTypology = row.assetTypology as string | undefined;

    // Asset Class - from CSV
    const assetClassOptions = getUniqueValues(baseEntries, "assetClass");

    // Asset Typology - from CSV (assetFormL2)
    const assetTypologyOptions = getUniqueValues(baseEntries, "assetFormL2");

    // Price Points - filter by selected typology
    const entriesForPP = selectedTypology
      ? filterBySelection(baseEntries, { assetFormL2: selectedTypology })
      : baseEntries;
    const pricePointsOptions = getUniqueValues(entriesForPP, "pricePoint");

    // Asset Group - get from Building Asset classes in CSV
    const buildingEntries = filterByAssetClasses(safeEntries, BUILDING_ASSET_CLASSES);
    const assetGroupOptions = getUniqueValues(buildingEntries, "assetClass");

    return {
      assetClass: assetClassOptions,
      assetGroup: assetGroupOptions,
      assetTypology: assetTypologyOptions,
      pricePoints: pricePointsOptions,
      // Dynamic phase options from masterplan's actual phases
      phase: getPhaseOptionsFromMasterplan(phases),
      baseDate: getQuarterDates(),
      facadeAdjustment: ["None", "Light", "Medium", "Heavy"],
    };
  };
}

// ============================================
// PUBLIC REALM - Cascading Dropdowns
// Asset Class: Public Realm (from CSV)
// ============================================
export function getPublicRealmOptions(
  costModelEntries: CostModelEntry[],
  phases?: MasterplanPhase[]
): (row: RowData) => Record<string, string[]> {
  const safeEntries = costModelEntries || [];
  const baseEntries = filterByAssetClasses(safeEntries, ["Public Realm"]);

  return (row: RowData) => {
    const selectedL2 = row.assetTypologyL2 as string | undefined;

    // Asset Class - from CSV
    const assetClassOptions = getUniqueValues(baseEntries, "assetClass");

    // Asset Type L1 - from CSV
    const assetTypeL1Options = getUniqueValues(baseEntries, "assetTypeL1");

    // Asset Typology L2 - from CSV
    const assetTypologyL2Options = getUniqueValues(baseEntries, "assetFormL2");

    // Price Point - filter by selected L2
    const entriesForPP = selectedL2
      ? filterBySelection(baseEntries, { assetFormL2: selectedL2 })
      : baseEntries;
    const pricePointOptions = getUniqueValues(entriesForPP, "pricePoint");

    return {
      assetClass: assetClassOptions,
      assetTypeL1: assetTypeL1Options,
      assetTypologyL2: assetTypologyL2Options,
      pricePoint: pricePointOptions,
      // Dynamic phase options from masterplan's actual phases
      phase: getPhaseOptionsFromMasterplan(phases),
    };
  };
}

// ============================================
// ADDITIONAL ASSETS - Cascading Dropdowns
// Asset Class: Additional Asset (from CSV)
// ============================================
export function getAdditionalAssetOptions(
  costModelEntries: CostModelEntry[],
  phases?: MasterplanPhase[]
): (row: RowData) => Record<string, string[]> {
  const safeEntries = costModelEntries || [];
  const baseEntries = filterByAssetClasses(safeEntries, ["Additional Asset"]);

  return (row: RowData) => {
    const selectedL1 = row.assetTypeL1 as string | undefined;

    // Asset Class - from CSV
    const assetClassOptions = getUniqueValues(baseEntries, "assetClass");

    // Asset Type L1 - from CSV
    const assetTypeL1Options = getUniqueValues(baseEntries, "assetTypeL1");

    // Asset Typology L2 - filter by L1
    const entriesForL2 = selectedL1
      ? filterBySelection(baseEntries, { assetTypeL1: selectedL1 })
      : baseEntries;
    const assetTypologyL2Options = getUniqueValues(entriesForL2, "assetFormL2");

    // Price Points - from CSV (filter out "-" which means not applicable)
    const pricePointsOptions = getUniqueValues(baseEntries, "pricePoint").filter(p => p !== "-");

    return {
      assetClass: assetClassOptions,
      assetTypeL1: assetTypeL1Options,
      assetTypologyL2: assetTypologyL2Options,
      pricePoints: pricePointsOptions.length > 0 ? pricePointsOptions : ["-"],
      // Calculation type options
      calculationType: ["Lump Sum", "Per m²"],
      // Dynamic phase options from masterplan's actual phases
      phase: getPhaseOptionsFromMasterplan(phases),
    };
  };
}

// ============================================
// INFRASTRUCTURE - Rates calculated from CSV
// Density is determined by FAR, rates from CSV
// ============================================
export function getInfrastructureOptions(
  costModelEntries: CostModelEntry[]
): Record<string, string[]> {
  const safeEntries = costModelEntries || [];
  const baseEntries = filterByAssetClasses(safeEntries, ["Infrastructure"]);

  return {
    // These are for display only - density is auto-calculated
    assetDensity: getUniqueValues(baseEntries, "assetTypeL1"),
  };
}

/**
 * Calculate infrastructure rates from cost model entries
 * Returns the sum of all rcdcCostGfa values for each density level
 */
export function getInfrastructureRatesFromCostModel(
  costModelEntries: CostModelEntry[]
): { Low: number; Medium: number; High: number } {
  const safeEntries = costModelEntries || [];
  const baseEntries = filterByAssetClasses(safeEntries, ["Infrastructure"]);

  const calculateDensityRate = (density: string): number => {
    return baseEntries
      .filter((e) => e.assetTypeL1 === `${density} Density`)
      .reduce((sum, entry) => {
        const cost = typeof entry.rcdcCostGfa === "number" ? entry.rcdcCostGfa : Number(entry.rcdcCostGfa) || 0;
        return sum + cost;
      }, 0);
  };

  return {
    Low: calculateDensityRate("Low"),
    Medium: calculateDensityRate("Medium"),
    High: calculateDensityRate("High"),
  };
}

// ============================================
// LEGACY SUPPORT
// ============================================
export function getDropdownOptions(
  field: string,
  costModelEntries: CostModelEntry[],
  filters?: {
    assetClass?: string;
    assetTypeL1?: string;
    assetFormL2?: string;
  }
): string[] {
  if (!costModelEntries || !Array.isArray(costModelEntries)) {
    return [];
  }

  const filtered = filterBySelection(costModelEntries, filters || {});
  return getUniqueValues(filtered, field as keyof CostModelEntry);
}

export function getAllDropdownOptions(
  costModelEntries: CostModelEntry[],
  phases?: MasterplanPhase[]
): Record<string, string[]> {
  const safeEntries = costModelEntries || [];

  return {
    assetClass: getUniqueValues(safeEntries, "assetClass"),
    assetTypeL1: getUniqueValues(safeEntries, "assetTypeL1"),
    assetFormL2: getUniqueValues(safeEntries, "assetFormL2"),
    pricePoint: getUniqueValues(safeEntries, "pricePoint"),
    // Dynamic phase options from masterplan's actual phases
    phase: getPhaseOptionsFromMasterplan(phases),
    baseDate: getQuarterDates(),
    glazingPercentage: ["None", "Low", "Medium", "High"],
  };
}
