/**
 * Infrastructure Calculation Utility
 *
 * This utility handles all calculations for the Infrastructure section in the Masterplan.
 * Infrastructure costs are FULLY AUTOMATED based on:
 * 1. Gross Land Area (GLA) - from masterplan initiation
 * 2. Density Category (Low/Medium/High) - automatically determined by total FAR
 * 3. Infrastructure Rate - configured per density level
 *
 * CALCULATION FLOW:
 * 1. Calculate total FAR from all building assets (Total GFA / Total Plot Area)
 * 2. Determine density category based on FAR ranges
 * 3. Get infrastructure rate for that density
 * 4. Calculate: Infrastructure Cost = GLA × Rate per m²
 *
 * FAR DENSITY RANGES (configurable):
 * - Low Density: FAR < 1.0
 * - Medium Density: FAR >= 1.0 and < 2.5
 * - High Density: FAR >= 2.5
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type DensityCategory = 'Low' | 'Medium' | 'High';

export interface FARDensityRange {
  category: DensityCategory;
  minFAR: number;
  maxFAR: number | null; // null means no upper limit
  rate: number; // SAR per m² GLA
}

export interface InfrastructureSplit {
  primary: number; // Percentage (e.g., 30 for 30%)
  secondary: number; // Percentage (e.g., 70 for 70%)
}

export interface InfrastructureInput {
  // From masterplan initiation
  grossLandArea: number; // m² (GLA)

  // From building assets (calculated totals)
  totalGFA: number; // Total GFA from all building assets
  totalPlotArea: number; // Total plot area from all building assets

  // Configuration
  generalRequirementsPercent: number;

  // Optional: Override density (for testing/manual adjustment)
  overrideDensity?: DensityCategory;

  // Optional: Custom FAR ranges (for configurable thresholds)
  customFARRanges?: FARDensityRange[];

  // Optional: Custom infrastructure split percentages (default: 30/70)
  infrastructureSplit?: InfrastructureSplit;
}

// Default infrastructure split (Primary 30%, Secondary 70%)
export const DEFAULT_INFRASTRUCTURE_SPLIT: InfrastructureSplit = {
  primary: 30,
  secondary: 70,
};

export interface InfrastructureCalculated {
  // FAR calculation
  calculatedFAR: number;

  // Density determination
  densityCategory: DensityCategory;

  // Rate
  sarPerM2GLA: number;

  // Cost calculations
  netInfrastructureCost: number; // GLA × Rate
  primaryCost: number; // 30% of net cost (primary infrastructure)
  secondaryCost: number; // 70% of net cost (secondary infrastructure)
  generalRequirementsAmount: number;
  totalInfrastructureCost: number;

  // Additional info
  balanceExternalArea: number; // GLA - Total Plot Area
}

export interface InfrastructureResult extends InfrastructureCalculated {
  input: InfrastructureInput;
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

/**
 * Infrastructure rates from Cost Model
 * These values are calculated dynamically from the Cost Model entries
 */
export interface InfrastructureRates {
  Low: number;
  Medium: number;
  High: number;
}

/**
 * Default FAR density thresholds (without rates)
 * Rates MUST come from Cost Model via getInfrastructureRatesFromCostModel()
 */
export const DEFAULT_FAR_THRESHOLDS = {
  lowMaxFAR: 0.465,   // From density_range_factor.lowToUse config
  mediumMaxFAR: 1.5,  // From density_range_factor.midToUse config
};

/**
 * Build FAR density ranges from Cost Model rates
 * This function combines the FAR thresholds with rates from the Cost Model
 *
 * @param rates - Infrastructure rates from Cost Model (via getInfrastructureRatesFromCostModel)
 * @param thresholds - Optional custom thresholds (default from config)
 */
export function buildFARDensityRanges(
  rates: InfrastructureRates,
  thresholds?: { lowMaxFAR: number; mediumMaxFAR: number }
): FARDensityRange[] {
  const t = thresholds || DEFAULT_FAR_THRESHOLDS;

  return [
    {
      category: 'Low',
      minFAR: 0,
      maxFAR: t.lowMaxFAR,
      rate: rates.Low,
    },
    {
      category: 'Medium',
      minFAR: t.lowMaxFAR,
      maxFAR: t.mediumMaxFAR,
      rate: rates.Medium,
    },
    {
      category: 'High',
      minFAR: t.mediumMaxFAR,
      maxFAR: null,
      rate: rates.High,
    },
  ];
}

/**
 * @deprecated Use buildFARDensityRanges() with rates from Cost Model instead
 * This constant is kept for backwards compatibility but should not be used
 * as it contains placeholder rates that may not match the Cost Model
 */
export const DEFAULT_FAR_DENSITY_RANGES: FARDensityRange[] = [
  {
    category: 'Low',
    minFAR: 0,
    maxFAR: 0.465,
    rate: 0, // MUST be provided from Cost Model
  },
  {
    category: 'Medium',
    minFAR: 0.465,
    maxFAR: 1.5,
    rate: 0, // MUST be provided from Cost Model
  },
  {
    category: 'High',
    minFAR: 1.5,
    maxFAR: null,
    rate: 0, // MUST be provided from Cost Model
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate FAR (Floor Area Ratio)
 * FAR = Total GFA / Total Plot Area
 */
export function calculateFAR(totalGFA: number, totalPlotArea: number): number {
  if (totalPlotArea === 0) return 0;
  return Number((totalGFA / totalPlotArea).toFixed(3));
}

/**
 * Determine density category based on FAR
 */
export function determineDensityCategory(
  far: number,
  farRanges: FARDensityRange[] = DEFAULT_FAR_DENSITY_RANGES
): DensityCategory {
  for (const range of farRanges) {
    const withinMin = far >= range.minFAR;
    const withinMax = range.maxFAR === null || far < range.maxFAR;

    if (withinMin && withinMax) {
      return range.category;
    }
  }

  // Default to Medium if no range matches (edge case)
  return 'Medium';
}

/**
 * Get infrastructure rate for a density category
 */
export function getInfrastructureRate(
  densityCategory: DensityCategory,
  farRanges: FARDensityRange[] = DEFAULT_FAR_DENSITY_RANGES
): number {
  const range = farRanges.find(r => r.category === densityCategory);
  return range?.rate || 250; // Default to medium rate
}

/**
 * Calculate Balance External Area
 * Balance External Area = Gross Land Area - Total Plot Area
 */
export function calculateBalanceExternalArea(
  grossLandArea: number,
  totalPlotArea: number
): number {
  return Math.max(0, grossLandArea - totalPlotArea);
}

// ============================================================================
// INDIVIDUAL CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate Net Infrastructure Cost
 * Net Infrastructure Cost = Gross Land Area × SAR per m² GLA
 */
export function calculateNetInfrastructureCost(
  grossLandArea: number,
  sarPerM2GLA: number
): number {
  return Math.round(grossLandArea * sarPerM2GLA);
}

/**
 * Calculate General Requirements Amount
 */
export function calculateGeneralRequirementsAmount(
  netCost: number,
  generalRequirementsPercent: number
): number {
  return Math.round(netCost * (generalRequirementsPercent / 100));
}

/**
 * Calculate Total Infrastructure Cost
 */
export function calculateTotalInfrastructureCost(
  netCost: number,
  generalRequirementsPercent: number
): number {
  return Math.round(netCost * (1 + generalRequirementsPercent / 100));
}

// ============================================================================
// MAIN CALCULATION FUNCTION
// ============================================================================

/**
 * Calculate All Infrastructure Values (Fully Automated)
 *
 * This function automatically:
 * 1. Calculates FAR from building assets totals
 * 2. Determines density category
 * 3. Gets the appropriate rate
 * 4. Calculates all infrastructure costs
 *
 * @param input - The infrastructure input values
 * @returns InfrastructureResult with all calculated values
 *
 * @example
 * ```typescript
 * const result = calculateInfrastructure({
 *   grossLandArea: 500000,      // from masterplan
 *   totalGFA: 750000,           // sum from building assets
 *   totalPlotArea: 400000,      // sum from building assets
 *   generalRequirementsPercent: 10,
 * });
 *
 * console.log(result.densityCategory); // 'Medium' (FAR = 1.875)
 * console.log(result.totalInfrastructureCost); // Calculated cost
 * ```
 */
export function calculateInfrastructure(input: InfrastructureInput): InfrastructureResult {
  const farRanges = input.customFARRanges || DEFAULT_FAR_DENSITY_RANGES;

  // Step 1: Calculate FAR from building assets
  const calculatedFAR = calculateFAR(input.totalGFA, input.totalPlotArea);

  // Step 2: Determine density category (or use override)
  const densityCategory = input.overrideDensity ||
    determineDensityCategory(calculatedFAR, farRanges);

  // Step 3: Get rate for this density
  const sarPerM2GLA = getInfrastructureRate(densityCategory, farRanges);

  // Step 4: Calculate costs
  const netInfrastructureCost = calculateNetInfrastructureCost(
    input.grossLandArea,
    sarPerM2GLA
  );

  // Split into primary and secondary costs (configurable, default 30%/70%)
  const split = input.infrastructureSplit || DEFAULT_INFRASTRUCTURE_SPLIT;
  const primaryCost = Math.round(netInfrastructureCost * (split.primary / 100));
  const secondaryCost = Math.round(netInfrastructureCost * (split.secondary / 100));

  const generalRequirementsAmount = calculateGeneralRequirementsAmount(
    netInfrastructureCost,
    input.generalRequirementsPercent
  );

  const totalInfrastructureCost = calculateTotalInfrastructureCost(
    netInfrastructureCost,
    input.generalRequirementsPercent
  );

  // Step 5: Calculate balance external area
  const balanceExternalArea = calculateBalanceExternalArea(
    input.grossLandArea,
    input.totalPlotArea
  );

  return {
    input,
    calculatedFAR,
    densityCategory,
    sarPerM2GLA,
    netInfrastructureCost,
    primaryCost,
    secondaryCost,
    generalRequirementsAmount,
    totalInfrastructureCost,
    balanceExternalArea,
  };
}

// ============================================================================
// CONFIGURATION FUNCTIONS
// ============================================================================

/**
 * Create custom FAR density ranges
 * Use this to allow administrators to reconfigure the density thresholds
 */
export function createFARDensityRanges(
  lowMaxFAR: number,
  mediumMaxFAR: number,
  lowRate: number,
  mediumRate: number,
  highRate: number
): FARDensityRange[] {
  return [
    {
      category: 'Low',
      minFAR: 0,
      maxFAR: lowMaxFAR,
      rate: lowRate,
    },
    {
      category: 'Medium',
      minFAR: lowMaxFAR,
      maxFAR: mediumMaxFAR,
      rate: mediumRate,
    },
    {
      category: 'High',
      minFAR: mediumMaxFAR,
      maxFAR: null,
      rate: highRate,
    },
  ];
}

/**
 * Validate FAR density ranges configuration
 */
export function validateFARDensityRanges(ranges: FARDensityRange[]): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check we have all three categories
  const categories = ranges.map(r => r.category);
  if (!categories.includes('Low')) errors.push('Missing Low density range');
  if (!categories.includes('Medium')) errors.push('Missing Medium density range');
  if (!categories.includes('High')) errors.push('Missing High density range');

  // Check rates are positive
  for (const range of ranges) {
    if (range.rate <= 0) {
      errors.push(`${range.category} density rate must be positive`);
    }
  }

  // Check ranges don't overlap and are continuous
  const sortedRanges = [...ranges].sort((a, b) => a.minFAR - b.minFAR);
  for (let i = 0; i < sortedRanges.length - 1; i++) {
    const current = sortedRanges[i];
    const next = sortedRanges[i + 1];
    if (current.maxFAR !== next.minFAR) {
      errors.push(`Gap or overlap between ${current.category} and ${next.category} ranges`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
