/**
 * Legacy Calculations Module
 *
 * NOTE: Most calculation functions have been moved to dedicated modules:
 * - Building Assets: @/utils/calculations/buildingAssets
 * - Car Parking: @/utils/calculations/carParking
 * - Infrastructure: @/utils/calculations/infrastructure
 * - Public Realm: @/utils/calculations/publicRealm
 * - Additional Assets: @/utils/calculations/additionalAssets
 * - Other Costs: @/utils/calculations/otherCosts
 *
 * This file only contains generic utility functions.
 */

// Sum array of numbers
export function sumValues(values: number[]): number {
  return values.reduce((acc, val) => acc + val, 0);
}

// Calculate percentage of a value
export function calculatePercentage(value: number, percentage: number): number {
  return Math.round(value * (percentage / 100));
}
