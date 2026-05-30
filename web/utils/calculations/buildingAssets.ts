/**
 * Building Assets Calculation Utility
 *
 * This utility handles all calculations for the Building Assets table in the Masterplan.
 *
 * DROPDOWN SELECTIONS (from cost model):
 * - Asset Class
 * - Asset Type L1
 * - Asset Type L2
 * - Price Point
 * - Phase
 * - Base Date
 * - Percentage of contractors' general requirements
 *
 * FREE ENTRY FIELDS:
 * - Plot Area per building (m²)
 * - GFA per building (m²)
 * - Number of buildings
 * - Levels of each building
 *
 * NOTE: For multifamily assets, insert the total plot area of all buildings and total GFA,
 * then insert 1 in the number of buildings.
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface BuildingAssetInput {
  // Dropdown selections
  assetClass: string;
  assetTypeL1: string;
  assetTypeL2: string;
  pricePoint: string;
  phase: string;
  baseDate: string;
  generalRequirementsPercent: number; // Percentage (e.g., 10 for 10%)

  // Free entry fields
  plotAreaPerBuilding: number; // m²
  gfaPerBuilding: number; // m²
  numberOfBuildings: number;
  levels: number;

  // Optional parametric adjustments
  glazingRatioAdjustment?: number; // Percentage adjustment (e.g., 5 for 5% increase)

  // Rate from cost model (SAR per m² GFA)
  sarPerM2GFA: number;

  // Optional: Cost factor for base date adjustment
  costFactor?: number; // Multiplier (e.g., 1.05 for 5% uplift)
}

export interface BuildingAssetCalculated {
  // Area calculations
  totalPlotArea: number; // m²
  totalGFA: number; // m²
  far: number; // Floor Area Ratio (dimensionless)
  buildingFootprint: number; // m²
  externalArea: number; // m²

  // Cost calculations
  sarPerM2GFA: number; // SAR per m² (from cost model)
  netBuildCost: number; // SAR
  generalRequirementsAmount: number; // SAR
  sarPerM2Total: number; // SAR per m² (including general requirements)
  totalCost: number; // SAR (before adjustments)

  // Parametric adjustments
  glazingAdjustmentAmount: number; // SAR

  // Final cost
  finalCost: number; // SAR (after all adjustments)
}

export interface BuildingAssetResult extends BuildingAssetCalculated {
  input: BuildingAssetInput;
}

// ============================================================================
// INDIVIDUAL CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate Total Plot Area
 * Total Plot Area = Plot Area per building × Number of buildings
 */
export function calculateTotalPlotArea(
  plotAreaPerBuilding: number,
  numberOfBuildings: number
): number {
  return plotAreaPerBuilding * numberOfBuildings;
}

/**
 * Calculate Total GFA (Gross Floor Area)
 * Total GFA = GFA per building × Number of buildings
 */
export function calculateTotalGFA(
  gfaPerBuilding: number,
  numberOfBuildings: number
): number {
  return gfaPerBuilding * numberOfBuildings;
}

/**
 * Calculate FAR (Floor Area Ratio)
 * FAR = Total GFA / Total Plot Area
 *
 * Returns 0 if total plot area is 0 to avoid division by zero
 */
export function calculateFAR(
  totalGFA: number,
  totalPlotArea: number
): number {
  if (totalPlotArea === 0) return 0;
  return Number((totalGFA / totalPlotArea).toFixed(3));
}

/**
 * Calculate Building Footprint
 * Building Footprint = Total GFA / Number of Levels
 *
 * This assumes all storeys have consistent and uniform GFA.
 * Excludes any applicable podiums and/or basements.
 *
 * Returns 0 if levels is 0 to avoid division by zero
 */
export function calculateBuildingFootprint(
  totalGFA: number,
  levels: number
): number {
  if (levels === 0) return 0;
  return Math.round(totalGFA / levels);
}

/**
 * Calculate External Area
 * External Area = Total Plot Area - Building Footprint
 *
 * Returns 0 if result would be negative
 */
export function calculateExternalArea(
  totalPlotArea: number,
  buildingFootprint: number
): number {
  return Math.max(0, totalPlotArea - buildingFootprint);
}

/**
 * Calculate Net Build Cost
 * Net Build Cost = Total GFA × SAR per m² GFA
 *
 * The SAR per m² rate comes from the cost model based on:
 * - Asset Class
 * - Asset Type L1
 * - Asset Type L2
 * - Price Point
 */
export function calculateNetBuildCost(
  totalGFA: number,
  sarPerM2GFA: number
): number {
  return Math.round(totalGFA * sarPerM2GFA);
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
 * Calculate Total Cost (before parametric adjustments)
 * Total Cost = Net Build Cost + General Requirements Amount
 *
 * Or equivalently:
 * Total Cost = Net Build Cost × (1 + General Requirements % / 100)
 */
export function calculateTotalCost(
  netBuildCost: number,
  generalRequirementsPercent: number
): number {
  return Math.round(netBuildCost * (1 + generalRequirementsPercent / 100));
}

/**
 * Calculate SAR per m² Total
 * SAR per m² Total = Total Cost / Total GFA
 *
 * This represents the all-in cost per square meter including general requirements
 */
export function calculateSarPerM2Total(
  totalCost: number,
  totalGFA: number
): number {
  if (totalGFA === 0) return 0;
  return Math.round(totalCost / totalGFA);
}

/**
 * Calculate Glazing Ratio Adjustment
 * Glazing Adjustment Amount = Total Cost × (Glazing Ratio Adjustment % / 100)
 *
 * This is applied when a building has non-standard glazing ratio
 */
export function calculateGlazingAdjustment(
  totalCost: number,
  glazingRatioAdjustmentPercent: number
): number {
  return Math.round(totalCost * (glazingRatioAdjustmentPercent / 100));
}

/**
 * Calculate Final Cost
 * Final Cost = Total Cost + All Parametric Adjustments
 *
 * Currently includes:
 * - Glazing ratio adjustment
 *
 * Can be extended to include other parametric adjustments
 */
export function calculateFinalCost(
  totalCost: number,
  glazingAdjustmentAmount: number
): number {
  return Math.round(totalCost + glazingAdjustmentAmount);
}

/**
 * Apply Base Date Cost Factor
 * Adjusted Cost = Cost × Cost Factor
 *
 * The cost factor is retrieved from the CostFactor table based on base date
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
 * Calculate All Building Asset Values
 *
 * This is the main function that takes input values and returns all calculated fields.
 *
 * @param input - The building asset input values
 * @returns BuildingAssetResult with all calculated values
 *
 * @example
 * ```typescript
 * const input: BuildingAssetInput = {
 *   assetClass: 'Residential',
 *   assetTypeL1: 'Multi Family',
 *   assetTypeL2: 'Mid Rise',
 *   pricePoint: 'Premium',
 *   phase: 'Phase 1',
 *   baseDate: '1Q27',
 *   generalRequirementsPercent: 10,
 *   plotAreaPerBuilding: 5000,
 *   gfaPerBuilding: 15000,
 *   numberOfBuildings: 4,
 *   levels: 6,
 *   sarPerM2GFA: 3500,
 *   glazingRatioAdjustment: 5,
 *   costFactor: 1.05,
 * };
 *
 * const result = calculateBuildingAsset(input);
 * console.log(result.finalCost); // Final cost in SAR
 * ```
 */
export function calculateBuildingAsset(input: BuildingAssetInput): BuildingAssetResult {
  // Step 1: Calculate area values
  const totalPlotArea = calculateTotalPlotArea(
    input.plotAreaPerBuilding,
    input.numberOfBuildings
  );

  const totalGFA = calculateTotalGFA(
    input.gfaPerBuilding,
    input.numberOfBuildings
  );

  const far = calculateFAR(totalGFA, totalPlotArea);

  const buildingFootprint = calculateBuildingFootprint(totalGFA, input.levels);

  const externalArea = calculateExternalArea(totalPlotArea, buildingFootprint);

  // Step 2: Calculate base costs
  const sarPerM2GFA = input.sarPerM2GFA;

  const netBuildCost = calculateNetBuildCost(totalGFA, sarPerM2GFA);

  const generalRequirementsAmount = calculateGeneralRequirementsAmount(
    netBuildCost,
    input.generalRequirementsPercent
  );

  const totalCost = calculateTotalCost(netBuildCost, input.generalRequirementsPercent);

  const sarPerM2Total = calculateSarPerM2Total(totalCost, totalGFA);

  // Step 3: Calculate parametric adjustments
  const glazingAdjustmentAmount = calculateGlazingAdjustment(
    totalCost,
    input.glazingRatioAdjustment || 0
  );

  // Step 4: Calculate final cost
  let finalCost = calculateFinalCost(totalCost, glazingAdjustmentAmount);

  // Step 5: Apply base date cost factor if provided
  if (input.costFactor && input.costFactor !== 1) {
    finalCost = applyBaseDateCostFactor(finalCost, input.costFactor);
  }

  return {
    input,
    // Area calculations
    totalPlotArea,
    totalGFA,
    far,
    buildingFootprint,
    externalArea,
    // Cost calculations
    sarPerM2GFA,
    netBuildCost,
    generalRequirementsAmount,
    sarPerM2Total,
    totalCost,
    // Parametric adjustments
    glazingAdjustmentAmount,
    // Final cost
    finalCost,
  };
}

// ============================================================================
// BATCH CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate multiple building assets and return totals
 *
 * @param assets - Array of building asset inputs
 * @returns Object with individual results and aggregated totals
 */
export function calculateBuildingAssets(assets: BuildingAssetInput[]): {
  results: BuildingAssetResult[];
  totals: {
    totalPlotArea: number;
    totalGFA: number;
    totalNetBuildCost: number;
    totalGeneralRequirements: number;
    totalCost: number;
    totalFinalCost: number;
    averageFAR: number;
  };
} {
  const results = assets.map(calculateBuildingAsset);

  const totals = {
    totalPlotArea: results.reduce((sum, r) => sum + r.totalPlotArea, 0),
    totalGFA: results.reduce((sum, r) => sum + r.totalGFA, 0),
    totalNetBuildCost: results.reduce((sum, r) => sum + r.netBuildCost, 0),
    totalGeneralRequirements: results.reduce((sum, r) => sum + r.generalRequirementsAmount, 0),
    totalCost: results.reduce((sum, r) => sum + r.totalCost, 0),
    totalFinalCost: results.reduce((sum, r) => sum + r.finalCost, 0),
    averageFAR: 0,
  };

  // Calculate average FAR
  if (totals.totalPlotArea > 0) {
    totals.averageFAR = Number((totals.totalGFA / totals.totalPlotArea).toFixed(3));
  }

  return { results, totals };
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate building asset input values
 *
 * @param input - The building asset input to validate
 * @returns Object with isValid flag and array of error messages
 */
export function validateBuildingAssetInput(input: Partial<BuildingAssetInput>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Required dropdown selections
  if (!input.assetClass) errors.push('Asset Class is required');
  if (!input.assetTypeL1) errors.push('Asset Type L1 is required');
  if (!input.assetTypeL2) errors.push('Asset Type L2 is required');
  if (!input.pricePoint) errors.push('Price Point is required');
  if (!input.phase) errors.push('Phase is required');
  if (!input.baseDate) errors.push('Base Date is required');

  // Required numeric fields
  if (input.plotAreaPerBuilding === undefined || input.plotAreaPerBuilding < 0) {
    errors.push('Plot Area per building must be a positive number');
  }
  if (input.gfaPerBuilding === undefined || input.gfaPerBuilding < 0) {
    errors.push('GFA per building must be a positive number');
  }
  if (input.numberOfBuildings === undefined || input.numberOfBuildings < 1) {
    errors.push('Number of buildings must be at least 1');
  }
  if (input.levels === undefined || input.levels < 1) {
    errors.push('Levels must be at least 1');
  }
  if (input.generalRequirementsPercent === undefined || input.generalRequirementsPercent < 0) {
    errors.push('General Requirements percentage must be 0 or greater');
  }
  if (input.sarPerM2GFA === undefined || input.sarPerM2GFA < 0) {
    errors.push('SAR per m² GFA rate must be a positive number');
  }

  // Optional field validation
  if (input.glazingRatioAdjustment !== undefined &&
      (input.glazingRatioAdjustment < -100 || input.glazingRatioAdjustment > 100)) {
    errors.push('Glazing ratio adjustment must be between -100% and 100%');
  }
  if (input.costFactor !== undefined && input.costFactor < 0) {
    errors.push('Cost factor must be a positive number');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
