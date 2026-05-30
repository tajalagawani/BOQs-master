// Masterplan Estimate Types

export interface TeamMember {
  id: string;
  name: string;
  role: string;
}

export interface MasterplanEstimate {
  id: string;
  name: string;
  description?: string;
  currency: string;
  initialBudget: number;
  grossLandArea: number;
  numberOfPhases: number;
  developmentManager: string;
  targetFAR?: number;
  status: MasterplanStatus;
  baseDate: string;
  latitude?: number;
  longitude?: number;
  members?: TeamMember[];
  createdAt: string;
  updatedAt: string;
}

export type MasterplanStatus =
  | 'Modelling'
  | 'Planning'
  | 'Active'
  | 'On Hold'
  | 'Completed'
  | 'Archived';

export interface MasterplanVersion {
  id: string;
  masterplanId: string;
  versionName: string;
  versionNumber: number;
  buildingAssets: BuildingAsset[];
  carParking: CarParkingAsset[];
  additionalAssets: AdditionalAsset[];
  infrastructure: InfrastructureConfig;
  publicRealm: PublicRealmAsset[];
  otherCosts: OtherCostsConfig;
  createdAt: string;
  updatedAt: string;
}

// Building Asset Types - using string for dynamic CSV-driven dropdowns
export interface BuildingAsset {
  id: string;
  assetClass: string;
  assetTypeL1: string;
  assetTypologyL2: string;
  pricePoint: string;
  phase: string;
  baseDate: string; // Format: "1Q27", "2Q28"
  plotAreaPerBuilding: number;
  gfaPerBuilding: number;
  numberOfBuildings: number;
  levels: number;
  generalRequirements: number; // Percentage
  // Calculated fields
  totalPlotArea?: number;
  totalGFA?: number;
  far?: number;
  buildingFootprint?: number;
  externalArea?: number;
  sarPerM2GFA?: number;
  netBuildCost?: number;
  sarPerM2Total?: number;
  totalCost?: number;
  // Adjustment fields
  glazingPercentage?: string;
  // Final cost
  finalCost?: number;
}

// Car Parking Types - using string for dynamic CSV-driven dropdowns
export interface CarParkingAsset {
  id: string;
  assetClass: string; // Should be "Car Parking"
  assetGroup: string; // Linked asset type
  assetTypology: string;
  pricePoints?: string;
  phase: string;
  baseDate: string;
  parkingAreaPerSpace: number; // m² per parking space
  spacesPerLevel: number; // No. of parking spaces per level
  numberOfBuildings: number;
  levels: number; // Max 2 for basement
  generalRequirements: number;
  facadeAdjustment?: string;
  // Calculated fields
  totalParkingSpaces?: number; // spacesPerLevel * levels
  totalPlotArea?: number;
  totalParkingArea?: number;
  sarPerM2?: number;
  netBuildCost?: number;
  totalCost?: number;
  finalCost?: number;
}

// Additional Asset Types - using string for dynamic dropdowns
export interface AdditionalAsset {
  id: string;
  assetClass: string;
  assetGroup: string;
  assetTypeL1: string;
  assetTypologyL2: string;
  pricePoints?: string;
  calculationType: string; // Lump Sum or Per m²
  phase: string;
  baseDate: string;
  plotArea: number; // Only used for Per m² calculation
  quantity: number; // Number of units (for Lump Sum)
  sarPerM2GFA?: number; // Rate from CSV
  netBuildCost?: number;
  generalRequirements: number;
  totalCost?: number;
}

// Infrastructure Types - using string for dynamic dropdowns
export interface InfrastructureConfig {
  baseDate: string;
  assetDensity: string;
  grossLandArea: number;
  totalPlotArea: number;
  totalGLA: number;
  grossFAR: number;
  phase: string;
  balanceExternalArea: number;
  sarPerM2GLA: number;
  primaryCost: number;
  secondaryCost: number;
  generalRequirements: number;
  // Calculated
  netInfrastructureCost?: number;
  totalInfrastructureCost?: number;
}

// Public Realm Types - using string for dynamic CSV-driven dropdowns
export interface PublicRealmAsset {
  id: string;
  assetClass: string; // Should be "Public Realm"
  assetTypeL1: string; // Should be "Public Realm"
  assetTypologyL2: string;
  pricePoint: string;
  phase: string;
  parkArea: number;
  numberOfParks: number;
  generalRequirements: number;
  // Calculated
  totalParkArea?: number;
  sarPerM2?: number;
  netBuildCost?: number;
  totalCost?: number;
}

// Other Costs Types
export interface OtherCostsConfig {
  contingencyPercentage: number;
  authorityFeesPercentage: number;
  softCostsPercentage: number;
  // Calculated
  contingencyAmount?: number;
  authorityFeesAmount?: number;
  softCostsAmount?: number;
}

// Asset Hierarchy Configuration
export interface AssetHierarchyPricePoint {
  name: string;
  rate: number; // SAR per M2
}

export interface AssetTypologyL2 {
  name: string;
  pricePoints: AssetHierarchyPricePoint[];
}

export interface AssetTypeL1 {
  name: string;
  typologiesL2: AssetTypologyL2[];
}

export interface AssetClassConfig {
  name: string;
  assetTypesL1: AssetTypeL1[];
}

export interface AssetHierarchy {
  assetClasses: AssetClassConfig[];
}

// Currency Option
export interface CurrencyOption {
  code: string;
  name: string;
  symbol: string;
}

// Summary Metrics for Detail Page
export interface SummaryMetrics {
  initialBudget: number;
  constructionCost: number;
  totalCost: number;
  grossLandArea: number;
  calculatedPlotArea: number;
  targetFAR: number;
  calculatedFAR: number;
  balanceExternalArea: number;
  softCosts: number;
  authorityFees: number;
  contingency: number;
}

// Phase Timeline - defines timing and duration for each project phase
export interface PhaseTimeline {
  phaseNumber: number;      // 1, 2, 3... (sequential phase number)
  phaseName: string;        // "Phase 1", "Phase 2"... (display name)
  startDate: string;        // Quarter format: "1Q27", "3Q28" (when phase begins)
  totalMonths: number;      // Duration in months (e.g., 32, 55)
}

// Form Data Types
export interface MasterplanFormData {
  name: string;
  initialBudget?: number;
  developmentManager: string;
  numberOfPhases: number;
  phases: PhaseTimeline[];  // Timeline details for each phase
  grossLandArea: number;
  currency: string;
  targetFAR?: number;
  latitude?: number;
  longitude?: number;
  baseDate: string;
  members?: string[];
  description?: string;
  projectId?: string;
}
