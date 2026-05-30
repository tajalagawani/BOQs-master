/**
 * Additional Assets (Infrastructure) Calculation Utility
 *
 * This utility handles all calculations for the Additional Assets table in the Masterplan.
 * Additional Assets include infrastructure items like district cooling plants, substations, etc.
 *
 * DROPDOWN SELECTIONS (from cost model):
 * - Asset Class
 * - Asset Group
 * - Asset Type L1
 * - Asset Typology L2 (e.g., District Cooling Plant, Substation, etc.)
 * - Price Points
 * - Phase
 * - Base Date
 *
 * FREE ENTRY FIELDS:
 * - Plot Area (m²)
 * - Percentage of contractors' general requirements
 *
 * CALCULATION RULES:
 * - SAR per m² is retrieved from the cost model based on asset hierarchy selection
 * - Net Build Cost = Plot Area × SAR per m²
 * - Total Cost = Net Build Cost × (1 + General Requirements % / 100)
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface AdditionalAssetInput {
  // Dropdown selections
  assetClass: string;
  assetGroup: string;
  assetTypeL1: string;
  assetTypologyL2: string;
  pricePoints?: string;
  phase: string;
  baseDate: string;

  // Free entry fields
  plotArea: number; // m²
  generalRequirements: number; // Percentage (e.g., 10 for 10%)

  // Rate from cost model (SAR per m²)
  sarPerM2GFA: number;

  // Optional: Cost factor for base date adjustment
  costFactor?: number;
}

export interface AdditionalAssetCalculated {
  // Rate
  sarPerM2GFA: number; // SAR per m² (from cost model)

  // Cost calculations
  netBuildCost: number; // SAR
  generalRequirementsAmount: number; // SAR
  totalCost: number; // SAR
}

export interface AdditionalAssetResult extends AdditionalAssetCalculated {
  input: AdditionalAssetInput;
}

// ============================================================================
// INDIVIDUAL CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate Net Build Cost
 * Net Build Cost = Plot Area × SAR per m²
 *
 * The SAR per m² rate comes from the cost model based on:
 * - Asset Class
 * - Asset Type L1
 * - Asset Typology L2
 * - Price Point
 */
export function calculateNetBuildCost(
  plotArea: number,
  sarPerM2GFA: number
): number {
  return Math.round(plotArea * sarPerM2GFA);
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
 * Calculate Total Cost
 * Total Cost = Net Build Cost × (1 + General Requirements % / 100)
 */
export function calculateTotalCost(
  netBuildCost: number,
  generalRequirementsPercent: number
): number {
  return Math.round(netBuildCost * (1 + generalRequirementsPercent / 100));
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
 * Calculate All Additional Asset Values
 *
 * This is the main function that takes input values and returns all calculated fields.
 *
 * @param input - The additional asset input values
 * @returns AdditionalAssetResult with all calculated values
 *
 * @example
 * ```typescript
 * const input: AdditionalAssetInput = {
 *   assetClass: 'Infrastructure',
 *   assetGroup: 'Utilities',
 *   assetTypeL1: 'District Cooling',
 *   assetTypologyL2: 'District Cooling Plant',
 *   pricePoints: 'Basic',
 *   phase: 'Phase 1',
 *   baseDate: '1Q24',
 *   plotArea: 5000,
 *   generalRequirements: 10,
 *   sarPerM2GFA: 2500,
 * };
 *
 * const result = calculateAdditionalAsset(input);
 * console.log(result.totalCost); // Total cost in SAR
 * ```
 */
export function calculateAdditionalAsset(input: AdditionalAssetInput): AdditionalAssetResult {
  const sarPerM2GFA = input.sarPerM2GFA;
  const plotArea = input.plotArea || 0;
  const genReq = input.generalRequirements || 0;

  // Calculate costs
  const netBuildCost = calculateNetBuildCost(plotArea, sarPerM2GFA);
  const generalRequirementsAmount = calculateGeneralRequirementsAmount(netBuildCost, genReq);
  let totalCost = calculateTotalCost(netBuildCost, genReq);

  // Apply base date cost factor if provided
  if (input.costFactor && input.costFactor !== 1) {
    totalCost = applyBaseDateCostFactor(totalCost, input.costFactor);
  }

  return {
    input,
    sarPerM2GFA,
    netBuildCost,
    generalRequirementsAmount,
    totalCost,
  };
}

// ============================================================================
// BATCH CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate multiple additional assets and return totals
 *
 * @param assets - Array of additional asset inputs
 * @returns Object with individual results and aggregated totals
 */
export function calculateAdditionalAssets(assets: AdditionalAssetInput[]): {
  results: AdditionalAssetResult[];
  totals: {
    totalPlotArea: number;
    totalNetBuildCost: number;
    totalGeneralRequirements: number;
    totalCost: number;
  };
} {
  const results = assets.map(calculateAdditionalAsset);

  const totals = {
    totalPlotArea: results.reduce((sum, r) => sum + (r.input.plotArea || 0), 0),
    totalNetBuildCost: results.reduce((sum, r) => sum + r.netBuildCost, 0),
    totalGeneralRequirements: results.reduce((sum, r) => sum + r.generalRequirementsAmount, 0),
    totalCost: results.reduce((sum, r) => sum + r.totalCost, 0),
  };

  return { results, totals };
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate additional asset input values
 *
 * @param input - The additional asset input to validate
 * @returns Object with isValid flag and array of error messages
 */
export function validateAdditionalAssetInput(input: Partial<AdditionalAssetInput>): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required dropdown selections
  if (!input.assetClass) errors.push('Asset Class is required');
  if (!input.assetTypeL1) errors.push('Asset Type L1 is required');
  if (!input.assetTypologyL2) errors.push('Asset Typology L2 is required');
  if (!input.phase) errors.push('Phase is required');
  if (!input.baseDate) errors.push('Base Date is required');

  // Required numeric fields
  if (input.plotArea === undefined || input.plotArea < 0) {
    errors.push('Plot Area must be a positive number');
  }
  if (input.generalRequirements === undefined || input.generalRequirements < 0) {
    errors.push('General Requirements percentage must be 0 or greater');
  }
  if (input.sarPerM2GFA === undefined || input.sarPerM2GFA < 0) {
    errors.push('SAR per m² rate must be a positive number');
  }

  // Optional field validation
  if (input.costFactor !== undefined && input.costFactor < 0) {
    errors.push('Cost factor must be a positive number');
  }

  // Warnings
  if (!input.pricePoints) {
    warnings.push('Price Point is recommended for accurate cost estimation');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
