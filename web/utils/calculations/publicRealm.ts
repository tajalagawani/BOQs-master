/**
 * Public Realm Calculation Utility
 *
 * This utility handles all calculations for the Public Realm table in the Masterplan.
 *
 * PUBLIC REALM TYPOLOGIES:
 * - District Park
 * - Neighborhood Park
 * - Local Park
 * - Pocket Park
 * - Buffer Landscapes and Trails
 *
 * CALCULATION RULES:
 * 1. Area of each type × Rate (from configuration based on price point)
 * 2. Total Public Realm Cost = Sum of all public realm costs
 * 3. Balance External Area = GLA - Total Building Plot Areas - Total Public Realm Areas
 *    - Error if negative (public realm exceeds available external area)
 *
 * DROPDOWN SELECTIONS:
 * - Asset Class: "Public Realm" (fixed)
 * - Asset Type L1: "Public Realm" (fixed)
 * - Asset Typology L2: One of the 5 typologies above
 * - Price Point: Basic, Premium (from cost model)
 * - Phase
 *
 * FREE ENTRY FIELDS:
 * - Park Area (m²)
 * - Number of Parks
 * - General Requirements (%)
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type PublicRealmTypology =
  | 'District Park'
  | 'Neighborhood Park'
  | 'Local Park'
  | 'Pocket Park'
  | 'Buffer Landscapes and Trails';

export interface PublicRealmInput {
  // Dropdown selections
  assetClass: string; // "Public Realm"
  assetTypeL1: string; // "Public Realm"
  assetTypologyL2: PublicRealmTypology;
  pricePoint: string;
  phase: string;

  // Free entry fields
  parkArea: number; // m² per park
  numberOfParks: number;
  generalRequirements: number; // Percentage

  // Rate from cost model (SAR per m²)
  sarPerM2: number;
}

export interface PublicRealmCalculated {
  // Area calculation
  totalParkArea: number; // parkArea × numberOfParks

  // Cost calculations
  sarPerM2: number;
  netBuildCost: number; // totalParkArea × rate
  generalRequirementsAmount: number;
  totalCost: number;
}

export interface PublicRealmResult extends PublicRealmCalculated {
  input: PublicRealmInput;
}

export interface BalanceExternalAreaResult {
  grossLandArea: number;
  totalBuildingPlotArea: number;
  totalPublicRealmArea: number;
  balanceExternalArea: number;
  isValid: boolean;
  error?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const PUBLIC_REALM_TYPOLOGIES: PublicRealmTypology[] = [
  'District Park',
  'Neighborhood Park',
  'Local Park',
  'Pocket Park',
  'Buffer Landscapes and Trails',
];

// ============================================================================
// INDIVIDUAL CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate Total Park Area
 * Total Park Area = Park Area per park × Number of Parks
 */
export function calculateTotalParkArea(
  parkArea: number,
  numberOfParks: number
): number {
  return parkArea * numberOfParks;
}

/**
 * Calculate Net Build Cost
 * Net Build Cost = Total Park Area × SAR per m²
 */
export function calculateNetBuildCost(
  totalParkArea: number,
  sarPerM2: number
): number {
  return Math.round(totalParkArea * sarPerM2);
}

/**
 * Calculate General Requirements Amount
 */
export function calculateGeneralRequirementsAmount(
  netBuildCost: number,
  generalRequirementsPercent: number
): number {
  return Math.round(netBuildCost * (generalRequirementsPercent / 100));
}

/**
 * Calculate Total Cost
 */
export function calculateTotalCost(
  netBuildCost: number,
  generalRequirementsPercent: number
): number {
  return Math.round(netBuildCost * (1 + generalRequirementsPercent / 100));
}

/**
 * Calculate Balance External Area
 * Balance = GLA - Total Building Plot Areas - Total Public Realm Areas
 *
 * Returns error if negative (areas exceed available land)
 */
export function calculateBalanceExternalArea(
  grossLandArea: number,
  totalBuildingPlotArea: number,
  totalPublicRealmArea: number
): BalanceExternalAreaResult {
  const balanceExternalArea = grossLandArea - totalBuildingPlotArea - totalPublicRealmArea;

  return {
    grossLandArea,
    totalBuildingPlotArea,
    totalPublicRealmArea,
    balanceExternalArea,
    isValid: balanceExternalArea >= 0,
    error: balanceExternalArea < 0
      ? `Balance External Area is negative (${Math.abs(balanceExternalArea).toLocaleString()} m²). Total allocated areas exceed Gross Land Area.`
      : undefined,
  };
}

// ============================================================================
// MAIN CALCULATION FUNCTION
// ============================================================================

/**
 * Calculate All Public Realm Values
 *
 * @param input - The public realm input values
 * @returns PublicRealmResult with all calculated values
 *
 * @example
 * ```typescript
 * const result = calculatePublicRealm({
 *   assetClass: 'Public Realm',
 *   assetTypeL1: 'Public Realm',
 *   assetTypologyL2: 'Neighborhood Park',
 *   pricePoint: 'Premium',
 *   phase: 'Phase 1',
 *   parkArea: 5000,
 *   numberOfParks: 3,
 *   generalRequirements: 10,
 *   sarPerM2: 150,
 * });
 *
 * console.log(result.totalParkArea); // 15000
 * console.log(result.totalCost); // Calculated cost
 * ```
 */
export function calculatePublicRealm(input: PublicRealmInput): PublicRealmResult {
  const parkArea = input.parkArea || 0;
  const numberOfParks = input.numberOfParks || 0;
  const genReq = input.generalRequirements || 0;
  const sarPerM2 = input.sarPerM2 || 0;

  // Calculate area
  const totalParkArea = calculateTotalParkArea(parkArea, numberOfParks);

  // Calculate costs
  const netBuildCost = calculateNetBuildCost(totalParkArea, sarPerM2);
  const generalRequirementsAmount = calculateGeneralRequirementsAmount(netBuildCost, genReq);
  const totalCost = calculateTotalCost(netBuildCost, genReq);

  return {
    input,
    totalParkArea,
    sarPerM2,
    netBuildCost,
    generalRequirementsAmount,
    totalCost,
  };
}

// ============================================================================
// BATCH CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate multiple public realm assets and return totals
 *
 * @param assets - Array of public realm inputs
 * @returns Object with individual results and aggregated totals
 */
export function calculatePublicRealmBatch(assets: PublicRealmInput[]): {
  results: PublicRealmResult[];
  totals: {
    totalParkArea: number;
    totalNetBuildCost: number;
    totalGeneralRequirements: number;
    totalCost: number;
  };
  byTypology: Record<PublicRealmTypology, {
    count: number;
    totalArea: number;
    totalCost: number;
  }>;
} {
  const results = assets.map(calculatePublicRealm);

  // Calculate totals
  const totals = {
    totalParkArea: results.reduce((sum, r) => sum + r.totalParkArea, 0),
    totalNetBuildCost: results.reduce((sum, r) => sum + r.netBuildCost, 0),
    totalGeneralRequirements: results.reduce((sum, r) => sum + r.generalRequirementsAmount, 0),
    totalCost: results.reduce((sum, r) => sum + r.totalCost, 0),
  };

  // Group by typology
  const byTypology: Record<PublicRealmTypology, { count: number; totalArea: number; totalCost: number }> = {
    'District Park': { count: 0, totalArea: 0, totalCost: 0 },
    'Neighborhood Park': { count: 0, totalArea: 0, totalCost: 0 },
    'Local Park': { count: 0, totalArea: 0, totalCost: 0 },
    'Pocket Park': { count: 0, totalArea: 0, totalCost: 0 },
    'Buffer Landscapes and Trails': { count: 0, totalArea: 0, totalCost: 0 },
  };

  results.forEach((r) => {
    const typology = r.input.assetTypologyL2;
    if (byTypology[typology]) {
      byTypology[typology].count += 1;
      byTypology[typology].totalArea += r.totalParkArea;
      byTypology[typology].totalCost += r.totalCost;
    }
  });

  return { results, totals, byTypology };
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate public realm input values
 */
export function validatePublicRealmInput(input: Partial<PublicRealmInput>): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required dropdown selections
  if (!input.assetTypologyL2) errors.push('Asset Typology is required');
  if (!input.pricePoint) errors.push('Price Point is required');
  if (!input.phase) errors.push('Phase is required');

  // Validate typology
  if (input.assetTypologyL2 && !PUBLIC_REALM_TYPOLOGIES.includes(input.assetTypologyL2)) {
    errors.push(`Invalid typology: ${input.assetTypologyL2}`);
  }

  // Required numeric fields
  if (input.parkArea === undefined || input.parkArea < 0) {
    errors.push('Park Area must be a positive number');
  }
  if (input.numberOfParks === undefined || input.numberOfParks < 1) {
    errors.push('Number of Parks must be at least 1');
  }
  if (input.generalRequirements === undefined || input.generalRequirements < 0) {
    errors.push('General Requirements percentage must be 0 or greater');
  }
  if (input.sarPerM2 === undefined || input.sarPerM2 < 0) {
    errors.push('SAR per m² rate must be a positive number');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate that total allocated areas don't exceed GLA
 */
export function validateAreaAllocation(
  grossLandArea: number,
  totalBuildingPlotArea: number,
  totalPublicRealmArea: number
): {
  isValid: boolean;
  balanceArea: number;
  error?: string;
  warning?: string;
} {
  const balanceArea = grossLandArea - totalBuildingPlotArea - totalPublicRealmArea;

  if (balanceArea < 0) {
    return {
      isValid: false,
      balanceArea,
      error: `Total allocated areas exceed Gross Land Area by ${Math.abs(balanceArea).toLocaleString()} m². Please reduce Building Assets plot areas or Public Realm areas.`,
    };
  }

  // Warning if balance is very small (less than 5% of GLA)
  const balancePercentage = (balanceArea / grossLandArea) * 100;
  if (balancePercentage < 5 && balancePercentage > 0) {
    return {
      isValid: true,
      balanceArea,
      warning: `Balance External Area is only ${balancePercentage.toFixed(1)}% of Gross Land Area. Consider if this is sufficient for roads, utilities, and other infrastructure.`,
    };
  }

  return {
    isValid: true,
    balanceArea,
  };
}
