/**
 * Car Parking Calculation Utility
 *
 * This utility handles all calculations for the Car Parking table in the Masterplan.
 *
 * DROPDOWN SELECTIONS:
 * - Asset Group: The building asset typology this car parking is related to
 * - Asset Typology: Car parking type (Above Ground, Basement, Podium, Free Standing)
 * - Phase
 * - Base Date
 * - Percentage of contractors' general requirements
 *
 * FREE ENTRY FIELDS:
 * - Plot Area (only applicable for Free Standing parking)
 * - GFA / Total Parking Area (m²)
 * - Number of Buildings (only for Free Standing)
 * - Levels (max 2 for Basement due to rate limitations)
 *
 * CALCULATION RULES:
 * - Free Standing: Plot area and GFA calculations apply (like building assets)
 * - Basement/Podium: Plot area is locked (not applicable), only parking area matters
 * - FAR is not calculated for car parking
 * - Cost = Parking Typology Rate × Parking Area
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type CarParkingTypology =
  | 'Above Ground'
  | 'Basement'
  | 'Podium'
  | 'Free Standing';

export interface CarParkingInput {
  // Dropdown selections
  assetGroup: string; // Related building asset typology
  assetTypology: CarParkingTypology;
  phase: string;
  baseDate: string;
  generalRequirementsPercent: number; // Percentage (e.g., 10 for 10%)

  // Free entry fields
  plotArea?: number; // m² - Only for Free Standing
  totalParkingArea: number; // m² - GFA / Total Parking Area
  numberOfBuildings?: number; // Only for Free Standing
  levels: number; // Max 2 for Basement

  // Rate from cost model (SAR per m²)
  sarPerM2: number;

  // Optional: Number of parking spaces (for reference)
  numberOfSpaces?: number;

  // Optional: Facade adjustment for above ground structures
  facadeAdjustmentPercent?: number;

  // Optional: Cost factor for base date adjustment
  costFactor?: number;
}

export interface CarParkingCalculated {
  // Area calculations (only for Free Standing)
  totalPlotArea: number | null; // m² - null for Basement/Podium
  totalParkingArea: number; // m²

  // Cost calculations
  sarPerM2: number; // SAR per m² (from cost model)
  netBuildCost: number; // SAR
  generalRequirementsAmount: number; // SAR
  totalCost: number; // SAR (before adjustments)

  // Adjustments
  facadeAdjustmentAmount: number; // SAR

  // Final cost
  finalCost: number; // SAR (after all adjustments)

  // Flags
  isPlotAreaApplicable: boolean;
  isLevelsValid: boolean;
}

export interface CarParkingResult extends CarParkingCalculated {
  input: CarParkingInput;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const MAX_BASEMENT_LEVELS = 2;

export const PARKING_TYPOLOGY_CONFIG: Record<CarParkingTypology, {
  plotAreaApplicable: boolean;
  maxLevels: number | null;
  description: string;
}> = {
  'Above Ground': {
    plotAreaApplicable: true,
    maxLevels: null,
    description: 'Above ground multi-level parking structure',
  },
  'Basement': {
    plotAreaApplicable: false,
    maxLevels: 2,
    description: 'Underground parking (max 2 levels due to rate)',
  },
  'Podium': {
    plotAreaApplicable: false,
    maxLevels: null,
    description: 'Parking integrated into building podium',
  },
  'Free Standing': {
    plotAreaApplicable: true,
    maxLevels: null,
    description: 'Separate parking structure on its own plot',
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if plot area calculations are applicable for this typology
 */
export function isPlotAreaApplicable(typology: CarParkingTypology): boolean {
  return PARKING_TYPOLOGY_CONFIG[typology].plotAreaApplicable;
}

/**
 * Check if levels are valid for the given typology
 */
export function validateLevels(typology: CarParkingTypology, levels: number): boolean {
  const config = PARKING_TYPOLOGY_CONFIG[typology];
  if (config.maxLevels === null) return levels >= 1;
  return levels >= 1 && levels <= config.maxLevels;
}

/**
 * Get maximum allowed levels for a typology
 */
export function getMaxLevels(typology: CarParkingTypology): number | null {
  return PARKING_TYPOLOGY_CONFIG[typology].maxLevels;
}

// ============================================================================
// INDIVIDUAL CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate Total Plot Area (Free Standing only)
 * Total Plot Area = Plot Area × Number of buildings
 *
 * Returns null for Basement and Podium parking as it's not applicable
 */
export function calculateTotalPlotArea(
  typology: CarParkingTypology,
  plotArea: number | undefined,
  numberOfBuildings: number | undefined
): number | null {
  if (!isPlotAreaApplicable(typology)) {
    return null;
  }

  const area = plotArea || 0;
  const buildings = numberOfBuildings || 1;

  return area * buildings;
}

/**
 * Calculate Total Parking Area
 * For Free Standing: Total Parking Area = Parking Area per building × Number of buildings
 * For Basement/Podium: Total Parking Area = Input parking area (no multiplication)
 */
export function calculateTotalParkingArea(
  typology: CarParkingTypology,
  parkingArea: number,
  numberOfBuildings: number | undefined
): number {
  if (isPlotAreaApplicable(typology) && numberOfBuildings) {
    return parkingArea * numberOfBuildings;
  }
  return parkingArea;
}

/**
 * Calculate Net Build Cost
 * Net Build Cost = Total Parking Area × SAR per m²
 *
 * The rate is determined by the car parking typology
 */
export function calculateNetBuildCost(
  totalParkingArea: number,
  sarPerM2: number
): number {
  return Math.round(totalParkingArea * sarPerM2);
}

/**
 * Calculate General Requirements Amount
 * General Requirements Amount = Net Build Cost × (General Requirements % / 100)
 */
export function calculateGeneralRequirementsAmount(
  netBuildCost: number,
  generalRequirementsPercent: number
): number {
  return Math.round(netBuildCost * (generalRequirementsPercent / 100));
}

/**
 * Calculate Total Cost (before adjustments)
 * Total Cost = Net Build Cost × (1 + General Requirements % / 100)
 */
export function calculateTotalCost(
  netBuildCost: number,
  generalRequirementsPercent: number
): number {
  return Math.round(netBuildCost * (1 + generalRequirementsPercent / 100));
}

/**
 * Calculate Facade Adjustment (for above ground structures)
 * Facade Adjustment = Total Cost × (Facade Adjustment % / 100)
 */
export function calculateFacadeAdjustment(
  totalCost: number,
  facadeAdjustmentPercent: number
): number {
  return Math.round(totalCost * (facadeAdjustmentPercent / 100));
}

/**
 * Calculate Final Cost
 * Final Cost = Total Cost + Facade Adjustment
 */
export function calculateFinalCost(
  totalCost: number,
  facadeAdjustmentAmount: number
): number {
  return Math.round(totalCost + facadeAdjustmentAmount);
}

/**
 * Apply Base Date Cost Factor
 * Adjusted Cost = Cost × Cost Factor
 */
export function applyBaseDateCostFactor(
  cost: number,
  costFactor: number
): number {
  return Math.round(cost * costFactor);
}

// ============================================================================
// MAIN CALCULATION FUNCTION
// ============================================================================

/**
 * Calculate All Car Parking Values
 *
 * This is the main function that takes input values and returns all calculated fields.
 *
 * @param input - The car parking input values
 * @returns CarParkingResult with all calculated values
 *
 * @example
 * ```typescript
 * // Basement Parking Example
 * const basementParking = calculateCarParking({
 *   assetGroup: 'Residential - Multi Family',
 *   assetTypology: 'Basement',
 *   phase: 'Phase 1',
 *   baseDate: '1Q27',
 *   generalRequirementsPercent: 10,
 *   totalParkingArea: 5000,
 *   levels: 2,
 *   sarPerM2: 2500,
 * });
 *
 * // Free Standing Parking Example
 * const freeStandingParking = calculateCarParking({
 *   assetGroup: 'Commercial - Office',
 *   assetTypology: 'Free Standing',
 *   phase: 'Phase 1',
 *   baseDate: '1Q27',
 *   generalRequirementsPercent: 10,
 *   plotArea: 2000,
 *   totalParkingArea: 3000,
 *   numberOfBuildings: 2,
 *   levels: 4,
 *   sarPerM2: 1800,
 * });
 * ```
 */
export function calculateCarParking(input: CarParkingInput): CarParkingResult {
  const typology = input.assetTypology;

  // Step 1: Validate levels
  const isLevelsValid = validateLevels(typology, input.levels);
  const plotAreaApplicable = isPlotAreaApplicable(typology);

  // Step 2: Calculate areas
  const totalPlotArea = calculateTotalPlotArea(
    typology,
    input.plotArea,
    input.numberOfBuildings
  );

  const totalParkingArea = calculateTotalParkingArea(
    typology,
    input.totalParkingArea,
    input.numberOfBuildings
  );

  // Step 3: Calculate costs
  const sarPerM2 = input.sarPerM2;
  const netBuildCost = calculateNetBuildCost(totalParkingArea, sarPerM2);

  const generalRequirementsAmount = calculateGeneralRequirementsAmount(
    netBuildCost,
    input.generalRequirementsPercent
  );

  const totalCost = calculateTotalCost(netBuildCost, input.generalRequirementsPercent);

  // Step 4: Calculate adjustments
  const facadeAdjustmentAmount = calculateFacadeAdjustment(
    totalCost,
    input.facadeAdjustmentPercent || 0
  );

  // Step 5: Calculate final cost
  let finalCost = calculateFinalCost(totalCost, facadeAdjustmentAmount);

  // Step 6: Apply base date cost factor if provided
  if (input.costFactor && input.costFactor !== 1) {
    finalCost = applyBaseDateCostFactor(finalCost, input.costFactor);
  }

  return {
    input,
    // Area calculations
    totalPlotArea,
    totalParkingArea,
    // Cost calculations
    sarPerM2,
    netBuildCost,
    generalRequirementsAmount,
    totalCost,
    // Adjustments
    facadeAdjustmentAmount,
    // Final cost
    finalCost,
    // Flags
    isPlotAreaApplicable: plotAreaApplicable,
    isLevelsValid,
  };
}

// ============================================================================
// BATCH CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate multiple car parking entries and return totals
 *
 * @param parkingEntries - Array of car parking inputs
 * @returns Object with individual results and aggregated totals
 */
export function calculateCarParkingBatch(parkingEntries: CarParkingInput[]): {
  results: CarParkingResult[];
  totals: {
    totalParkingArea: number;
    totalNetBuildCost: number;
    totalGeneralRequirements: number;
    totalCost: number;
    totalFinalCost: number;
    totalSpaces: number;
  };
  byTypology: Record<CarParkingTypology, {
    count: number;
    totalArea: number;
    totalCost: number;
  }>;
} {
  const results = parkingEntries.map(calculateCarParking);

  // Calculate totals
  const totals = {
    totalParkingArea: results.reduce((sum, r) => sum + r.totalParkingArea, 0),
    totalNetBuildCost: results.reduce((sum, r) => sum + r.netBuildCost, 0),
    totalGeneralRequirements: results.reduce((sum, r) => sum + r.generalRequirementsAmount, 0),
    totalCost: results.reduce((sum, r) => sum + r.totalCost, 0),
    totalFinalCost: results.reduce((sum, r) => sum + r.finalCost, 0),
    totalSpaces: results.reduce((sum, r) => sum + (r.input.numberOfSpaces || 0), 0),
  };

  // Group by typology
  const byTypology: Record<CarParkingTypology, { count: number; totalArea: number; totalCost: number }> = {
    'Above Ground': { count: 0, totalArea: 0, totalCost: 0 },
    'Basement': { count: 0, totalArea: 0, totalCost: 0 },
    'Podium': { count: 0, totalArea: 0, totalCost: 0 },
    'Free Standing': { count: 0, totalArea: 0, totalCost: 0 },
  };

  results.forEach((r) => {
    const typology = r.input.assetTypology;
    byTypology[typology].count += 1;
    byTypology[typology].totalArea += r.totalParkingArea;
    byTypology[typology].totalCost += r.finalCost;
  });

  return { results, totals, byTypology };
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate car parking input values
 *
 * @param input - The car parking input to validate
 * @returns Object with isValid flag and array of error messages
 */
export function validateCarParkingInput(input: Partial<CarParkingInput>): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required dropdown selections
  if (!input.assetGroup) errors.push('Asset Group is required');
  if (!input.assetTypology) errors.push('Asset Typology is required');
  if (!input.phase) errors.push('Phase is required');
  if (!input.baseDate) errors.push('Base Date is required');

  // Validate typology-specific fields
  if (input.assetTypology) {
    const typology = input.assetTypology;

    // Validate levels for Basement
    if (typology === 'Basement' && input.levels !== undefined) {
      if (input.levels > MAX_BASEMENT_LEVELS) {
        errors.push(`Basement parking cannot exceed ${MAX_BASEMENT_LEVELS} levels due to rate limitations`);
      }
    }

    // Validate plot area for Free Standing
    if (isPlotAreaApplicable(typology)) {
      if (input.plotArea === undefined || input.plotArea < 0) {
        warnings.push('Plot Area is recommended for Free Standing parking');
      }
      if (input.numberOfBuildings === undefined || input.numberOfBuildings < 1) {
        warnings.push('Number of Buildings should be specified for Free Standing parking');
      }
    }
  }

  // Required numeric fields
  if (input.totalParkingArea === undefined || input.totalParkingArea < 0) {
    errors.push('Total Parking Area must be a positive number');
  }
  if (input.levels === undefined || input.levels < 1) {
    errors.push('Levels must be at least 1');
  }
  if (input.generalRequirementsPercent === undefined || input.generalRequirementsPercent < 0) {
    errors.push('General Requirements percentage must be 0 or greater');
  }
  if (input.sarPerM2 === undefined || input.sarPerM2 < 0) {
    errors.push('SAR per m² rate must be a positive number');
  }

  // Optional field validation
  if (input.facadeAdjustmentPercent !== undefined &&
      (input.facadeAdjustmentPercent < -100 || input.facadeAdjustmentPercent > 100)) {
    errors.push('Facade adjustment must be between -100% and 100%');
  }
  if (input.costFactor !== undefined && input.costFactor < 0) {
    errors.push('Cost factor must be a positive number');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get parking spaces estimate based on parking area and typology
 * Standard assumption: 25-30 m² per parking space including circulation
 */
export function estimateParkingSpaces(
  totalParkingArea: number,
  typology: CarParkingTypology
): number {
  // m² per space varies by typology
  const m2PerSpace: Record<CarParkingTypology, number> = {
    'Above Ground': 28,
    'Basement': 30, // More circulation space needed
    'Podium': 28,
    'Free Standing': 25, // More efficient layout possible
  };

  const spaceSize = m2PerSpace[typology];
  return Math.floor(totalParkingArea / spaceSize);
}
