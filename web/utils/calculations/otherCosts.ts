/**
 * Other Costs Calculation Utility
 *
 * This utility handles calculations for the Other Costs section in the Masterplan.
 *
 * OTHER COSTS TYPES:
 * - Contingency
 * - Authority Fees
 * - Soft Costs (Professional Fees)
 *
 * CALCULATION RULES:
 * All costs are calculated as a percentage of the Total Construction Cost.
 * They do NOT overlap - each is calculated independently:
 *
 * 1. Contingency Amount = Total Construction Cost × (Contingency Percentage / 100)
 * 2. Authority Fees Amount = Total Construction Cost × (Authority Fees Percentage / 100)
 * 3. Soft Costs Amount = Total Construction Cost × (Soft Costs Percentage / 100)
 *
 * Total Other Costs = Contingency Amount + Authority Fees Amount + Soft Costs Amount
 *
 * USER INPUT:
 * - Contingency Percentage (free entry)
 * - Authority Fees Percentage (free entry)
 * - Soft Costs Percentage (free entry)
 *
 * AUTO-CALCULATED:
 * - All amount fields based on percentages and construction cost
 */

import { OtherCostsConfig } from "@/types/masterplan";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface OtherCostsInput {
  totalConstructionCost: number;
  contingencyPercentage: number;
  authorityFeesPercentage: number;
  softCostsPercentage: number;
}

export interface OtherCostsResult {
  contingencyPercentage: number;
  contingencyAmount: number;
  authorityFeesPercentage: number;
  authorityFeesAmount: number;
  softCostsPercentage: number;
  softCostsAmount: number;
  totalOtherCosts: number;
  totalProjectCost: number; // Construction + Other Costs
}

// ============================================================================
// INDIVIDUAL CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate Contingency Amount
 * Contingency = Total Construction Cost × (Contingency Percentage / 100)
 */
export function calculateContingencyAmount(
  totalConstructionCost: number,
  contingencyPercentage: number
): number {
  return Math.round(totalConstructionCost * (contingencyPercentage / 100));
}

/**
 * Calculate Authority Fees Amount
 * Authority Fees = Total Construction Cost × (Authority Fees Percentage / 100)
 */
export function calculateAuthorityFeesAmount(
  totalConstructionCost: number,
  authorityFeesPercentage: number
): number {
  return Math.round(totalConstructionCost * (authorityFeesPercentage / 100));
}

/**
 * Calculate Soft Costs Amount
 * Soft Costs = Total Construction Cost × (Soft Costs Percentage / 100)
 */
export function calculateSoftCostsAmount(
  totalConstructionCost: number,
  softCostsPercentage: number
): number {
  return Math.round(totalConstructionCost * (softCostsPercentage / 100));
}

/**
 * Calculate Total Other Costs
 */
export function calculateTotalOtherCosts(
  contingencyAmount: number,
  authorityFeesAmount: number,
  softCostsAmount: number
): number {
  return contingencyAmount + authorityFeesAmount + softCostsAmount;
}

// ============================================================================
// MAIN CALCULATION FUNCTION
// ============================================================================

/**
 * Calculate All Other Costs Values
 *
 * @param input - The other costs input values
 * @returns OtherCostsResult with all calculated values
 *
 * @example
 * ```typescript
 * const result = calculateOtherCosts({
 *   totalConstructionCost: 10000000,
 *   contingencyPercentage: 5,
 *   authorityFeesPercentage: 3,
 *   softCostsPercentage: 8,
 * });
 *
 * console.log(result.contingencyAmount); // 500000
 * console.log(result.authorityFeesAmount); // 300000
 * console.log(result.softCostsAmount); // 800000
 * console.log(result.totalOtherCosts); // 1600000
 * console.log(result.totalProjectCost); // 11600000
 * ```
 */
export function calculateOtherCosts(input: OtherCostsInput): OtherCostsResult {
  const totalConstructionCost = input.totalConstructionCost || 0;
  const contingencyPct = input.contingencyPercentage || 0;
  const authorityFeesPct = input.authorityFeesPercentage || 0;
  const softCostsPct = input.softCostsPercentage || 0;

  // Calculate amounts
  const contingencyAmount = calculateContingencyAmount(totalConstructionCost, contingencyPct);
  const authorityFeesAmount = calculateAuthorityFeesAmount(totalConstructionCost, authorityFeesPct);
  const softCostsAmount = calculateSoftCostsAmount(totalConstructionCost, softCostsPct);

  // Calculate totals
  const totalOtherCosts = calculateTotalOtherCosts(
    contingencyAmount,
    authorityFeesAmount,
    softCostsAmount
  );
  const totalProjectCost = totalConstructionCost + totalOtherCosts;

  return {
    contingencyPercentage: contingencyPct,
    contingencyAmount,
    authorityFeesPercentage: authorityFeesPct,
    authorityFeesAmount,
    softCostsPercentage: softCostsPct,
    softCostsAmount,
    totalOtherCosts,
    totalProjectCost,
  };
}

/**
 * Recalculate Other Costs Config
 * Helper function to recalculate amounts in OtherCostsConfig based on construction cost
 *
 * @param config - Current OtherCostsConfig with percentages
 * @param totalConstructionCost - Total construction cost to apply percentages to
 * @returns Updated OtherCostsConfig with calculated amounts
 */
export function recalculateOtherCostsConfig(
  config: OtherCostsConfig,
  totalConstructionCost: number
): OtherCostsConfig {
  const result = calculateOtherCosts({
    totalConstructionCost,
    contingencyPercentage: config.contingencyPercentage || 0,
    authorityFeesPercentage: config.authorityFeesPercentage || 0,
    softCostsPercentage: config.softCostsPercentage || 0,
  });

  return {
    contingencyPercentage: result.contingencyPercentage,
    contingencyAmount: result.contingencyAmount,
    authorityFeesPercentage: result.authorityFeesPercentage,
    authorityFeesAmount: result.authorityFeesAmount,
    softCostsPercentage: result.softCostsPercentage,
    softCostsAmount: result.softCostsAmount,
  };
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Warning Thresholds Configuration
 * These can be overridden by passing config from database
 */
export interface WarningThresholds {
  contingencyMax: number;
  contingencyTypicalMin: number;
  contingencyTypicalMax: number;
  authorityFeesMax: number;
  authorityFeesTypicalMin: number;
  authorityFeesTypicalMax: number;
  softCostsMax: number;
  softCostsTypicalMin: number;
  softCostsTypicalMax: number;
  totalOtherCostsMax: number;
}

/**
 * Default warning thresholds - used when no configuration is provided
 */
export const DEFAULT_WARNING_THRESHOLDS: WarningThresholds = {
  contingencyMax: 15,
  contingencyTypicalMin: 3,
  contingencyTypicalMax: 10,
  authorityFeesMax: 10,
  authorityFeesTypicalMin: 2,
  authorityFeesTypicalMax: 5,
  softCostsMax: 15,
  softCostsTypicalMin: 5,
  softCostsTypicalMax: 12,
  totalOtherCostsMax: 30,
};

/**
 * Validate Other Costs percentages
 * @param input - Partial input with percentages to validate
 * @param thresholds - Optional warning thresholds from configuration
 */
export function validateOtherCostsInput(
  input: Partial<OtherCostsInput>,
  thresholds?: Partial<WarningThresholds>
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Merge provided thresholds with defaults
  const config: WarningThresholds = {
    ...DEFAULT_WARNING_THRESHOLDS,
    ...thresholds,
  };

  // Validate percentages are non-negative
  if (input.contingencyPercentage !== undefined && input.contingencyPercentage < 0) {
    errors.push('Contingency percentage cannot be negative');
  }
  if (input.authorityFeesPercentage !== undefined && input.authorityFeesPercentage < 0) {
    errors.push('Authority fees percentage cannot be negative');
  }
  if (input.softCostsPercentage !== undefined && input.softCostsPercentage < 0) {
    errors.push('Soft costs percentage cannot be negative');
  }

  // Warning for unusually high percentages (using configurable thresholds)
  const contingency = input.contingencyPercentage || 0;
  const authorityFees = input.authorityFeesPercentage || 0;
  const softCosts = input.softCostsPercentage || 0;
  const totalPercentage = contingency + authorityFees + softCosts;

  if (contingency > config.contingencyMax) {
    warnings.push(`Contingency percentage (${contingency}%) is unusually high. Typical range is ${config.contingencyTypicalMin}-${config.contingencyTypicalMax}%.`);
  }
  if (authorityFees > config.authorityFeesMax) {
    warnings.push(`Authority fees percentage (${authorityFees}%) is unusually high. Typical range is ${config.authorityFeesTypicalMin}-${config.authorityFeesTypicalMax}%.`);
  }
  if (softCosts > config.softCostsMax) {
    warnings.push(`Soft costs percentage (${softCosts}%) is unusually high. Typical range is ${config.softCostsTypicalMin}-${config.softCostsTypicalMax}%.`);
  }
  if (totalPercentage > config.totalOtherCostsMax) {
    warnings.push(`Total other costs (${totalPercentage}%) exceeds ${config.totalOtherCostsMax}% of construction cost.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

/**
 * Default percentages for Other Costs
 * Based on typical industry standards
 */
export const DEFAULT_OTHER_COSTS_PERCENTAGES = {
  contingency: 5, // 5% contingency
  authorityFees: 3, // 3% authority fees
  softCosts: 8, // 8% professional fees
};
