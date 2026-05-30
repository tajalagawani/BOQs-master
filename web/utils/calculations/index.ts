/**
 * Masterplan Calculations Index
 *
 * This module exports all calculation utilities for the 5 masterplan tables:
 * 1. Building Assets
 * 2. Car Parking
 * 3. Additional Assets
 * 4. Infrastructure
 * 5. Public Realm
 * 6. Other Costs
 */

// Building Assets Calculations
export {
  calculateTotalPlotArea,
  calculateTotalGFA,
  calculateFAR,
  calculateBuildingFootprint,
  calculateExternalArea,
  calculateNetBuildCost,
  calculateGeneralRequirementsAmount,
  calculateTotalCost,
  calculateSarPerM2Total,
  calculateGlazingAdjustment,
  calculateFinalCost,
  applyBaseDateCostFactor,
  calculateBuildingAsset,
  calculateBuildingAssets,
  validateBuildingAssetInput,
  type BuildingAssetInput,
  type BuildingAssetCalculated,
  type BuildingAssetResult,
} from './buildingAssets';

// Car Parking Calculations
export {
  isPlotAreaApplicable,
  validateLevels,
  getMaxLevels,
  calculateTotalParkingArea,
  calculateFacadeAdjustment,
  calculateCarParking,
  calculateCarParkingBatch,
  validateCarParkingInput,
  estimateParkingSpaces,
  MAX_BASEMENT_LEVELS,
  PARKING_TYPOLOGY_CONFIG,
  type CarParkingTypology,
  type CarParkingInput,
  type CarParkingCalculated,
  type CarParkingResult,
} from './carParking';

// Additional Assets Calculations
export {
  calculateAdditionalAsset,
  calculateAdditionalAssets,
  validateAdditionalAssetInput,
  type AdditionalAssetInput,
  type AdditionalAssetCalculated,
  type AdditionalAssetResult,
} from './additionalAssets';

// Infrastructure Calculations (fully automated based on FAR)
export {
  determineDensityCategory,
  getInfrastructureRate,
  calculateNetInfrastructureCost,
  calculateTotalInfrastructureCost,
  calculateInfrastructure,
  createFARDensityRanges,
  validateFARDensityRanges,
  buildFARDensityRanges,
  DEFAULT_FAR_DENSITY_RANGES,
  DEFAULT_FAR_THRESHOLDS,
  DEFAULT_INFRASTRUCTURE_SPLIT,
  type DensityCategory,
  type FARDensityRange,
  type InfrastructureSplit,
  type InfrastructureRates,
  type InfrastructureInput,
  type InfrastructureCalculated,
  type InfrastructureResult,
} from './infrastructure';

// Public Realm Calculations
export {
  calculateTotalParkArea,
  calculatePublicRealm,
  calculatePublicRealmBatch,
  validatePublicRealmInput,
  validateAreaAllocation,
  PUBLIC_REALM_TYPOLOGIES,
  type PublicRealmTypology,
  type PublicRealmInput,
  type PublicRealmCalculated,
  type PublicRealmResult,
  type BalanceExternalAreaResult,
} from './publicRealm';

// Other Costs Calculations
export {
  calculateContingencyAmount,
  calculateAuthorityFeesAmount,
  calculateSoftCostsAmount,
  calculateTotalOtherCosts,
  calculateOtherCosts,
  recalculateOtherCostsConfig,
  validateOtherCostsInput,
  DEFAULT_OTHER_COSTS_PERCENTAGES,
  DEFAULT_WARNING_THRESHOLDS,
  type OtherCostsInput,
  type OtherCostsResult,
  type WarningThresholds,
} from './otherCosts';

// Re-export calculateBalanceExternalArea from infrastructure (the main implementation)
export { calculateBalanceExternalArea } from './infrastructure';
