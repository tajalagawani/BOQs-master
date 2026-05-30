// Calculation utilities for Masterplan Summary
import { BuildingAsset, CarParkingAsset, AdditionalAsset, InfrastructureConfig, PublicRealmAsset, OtherCostsConfig, PhaseTimeline } from "@/types/masterplan";
import { NRM_CATEGORIES } from "@/lib/chartColors";

// Types for calculation results
export interface HighLevelMetrics {
  totalGLA: number;
  far: number;
  phases: number;
  plotArea: number;
  gfa: number;
  approvedBudget: number;
  buaForParking: number;
  baseDate: string;
  constructionCostHard: number;
  totalBUA: number;
  builtAssetsCost: number;
  totalConstructionCost: number;
  totalPlotAreaForBuildings: number;
  infraPRCost: number;
  variance: number;
}

export interface DistributionData {
  name: string;
  value: number;
}

export interface CostModelData {
  category: string;
  value: number;
}

export interface SCurveDataPoint {
  date: string;
  phase1SCurve: number;
  phase2SCurve: number;
  sCurveTotal: number;
  phase1Cost: number;
  phase2Cost: number;
  [key: string]: string | number;
}

// S-Curve settings interface
export interface SCurveSettings {
  steepness: number;
  midpoint: number;
  defaultPhaseDuration?: number;
  minPhaseDuration?: number;
  maxPhaseDuration?: number;
}

// Phase cost info for S-curve calculation
export interface PhaseCostInfo {
  phaseNumber: number;
  phaseName: string;
  startDate: string;
  totalMonths: number;
  totalCost: number;
}

// Calculate total GLA from all assets
export function calculateTotalGLA(
  buildingAssets: BuildingAsset[],
  carParking: CarParkingAsset[],
  additionalAssets: AdditionalAsset[]
): number {
  const buildingGLA = buildingAssets.reduce((sum, asset) => sum + (asset.totalGFA || 0), 0);
  const parkingGLA = carParking.reduce((sum, asset) => sum + (asset.totalParkingArea || 0), 0);
  const additionalGLA = additionalAssets.reduce((sum, asset) => {
    const gfa = asset.plotArea * asset.quantity;
    return sum + gfa;
  }, 0);

  return buildingGLA + parkingGLA + additionalGLA;
}

// Calculate FAR (Floor Area Ratio)
export function calculateFAR(totalGFA: number, totalPlotArea: number): number {
  if (totalPlotArea === 0) return 0;
  return totalGFA / totalPlotArea;
}

// Calculate total BUA (Built-Up Area)
export function calculateTotalBUA(
  buildingAssets: BuildingAsset[],
  carParking: CarParkingAsset[]
): number {
  const buildingBUA = buildingAssets.reduce((sum, asset) => sum + (asset.totalGFA || 0), 0);
  const parkingBUA = carParking.reduce((sum, asset) => sum + (asset.totalParkingArea || 0), 0);
  return buildingBUA + parkingBUA;
}

// Calculate variance
export function calculateVariance(approvedBudget: number, totalCost: number): number {
  return approvedBudget - totalCost;
}

// Get unique phases from building assets
export function getPhases(buildingAssets: BuildingAsset[]): string[] {
  const phases = new Set(buildingAssets.map(asset => asset.phase).filter(Boolean));
  return Array.from(phases).sort();
}

// Calculate GFA by Asset Class
export function calculateGFAByAssetClass(buildingAssets: BuildingAsset[]): DistributionData[] {
  const grouped = buildingAssets.reduce((acc, asset) => {
    const key = asset.assetClass || "Unknown";
    acc[key] = (acc[key] || 0) + (asset.totalGFA || 0);
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(grouped)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

// Calculate GFA by Asset Type
export function calculateGFAByAssetType(buildingAssets: BuildingAsset[]): DistributionData[] {
  const grouped = buildingAssets.reduce((acc, asset) => {
    const key = asset.assetTypeL1 || "Unknown";
    acc[key] = (acc[key] || 0) + (asset.totalGFA || 0);
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(grouped)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

// Calculate GFA by Typology
export function calculateGFAByTypology(buildingAssets: BuildingAsset[]): DistributionData[] {
  const grouped = buildingAssets.reduce((acc, asset) => {
    const key = asset.assetTypologyL2 || "Unknown";
    acc[key] = (acc[key] || 0) + (asset.totalGFA || 0);
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(grouped)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

// Calculate GFA by Price Point
export function calculateGFAByPricePoint(buildingAssets: BuildingAsset[]): DistributionData[] {
  const grouped = buildingAssets.reduce((acc, asset) => {
    const key = asset.pricePoint || "Unknown";
    acc[key] = (acc[key] || 0) + (asset.totalGFA || 0);
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(grouped)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

// Calculate Cost by Asset Class
export function calculateCostByAssetClass(buildingAssets: BuildingAsset[]): DistributionData[] {
  const grouped = buildingAssets.reduce((acc, asset) => {
    const key = asset.assetClass || "Unknown";
    acc[key] = (acc[key] || 0) + (asset.finalCost || asset.totalCost || 0);
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(grouped)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

// Calculate Cost by Phase
export function calculateCostByPhase(
  buildingAssets: BuildingAsset[],
  carParking: CarParkingAsset[],
  infrastructure: InfrastructureConfig | null
): DistributionData[] {
  const grouped: Record<string, number> = {};

  // Building assets
  buildingAssets.forEach(asset => {
    const phase = asset.phase || "Phase 1";
    grouped[phase] = (grouped[phase] || 0) + (asset.finalCost || asset.totalCost || 0);
  });

  // Car parking
  carParking.forEach(asset => {
    const phase = asset.phase || "Phase 1";
    grouped[phase] = (grouped[phase] || 0) + (asset.finalCost || asset.totalCost || 0);
  });

  // Infrastructure
  if (infrastructure) {
    const phase = infrastructure.phase || "Phase 1";
    grouped[phase] = (grouped[phase] || 0) + (infrastructure.totalInfrastructureCost || 0);
  }

  return Object.entries(grouped)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Calculate Cost by Asset Type
export function calculateCostByAssetType(buildingAssets: BuildingAsset[]): DistributionData[] {
  const grouped = buildingAssets.reduce((acc, asset) => {
    const key = asset.assetTypeL1 || "Unknown";
    acc[key] = (acc[key] || 0) + (asset.finalCost || asset.totalCost || 0);
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(grouped)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

// Cost model entry type for NRM calculation
interface CostModelEntry {
  assetClass: string;
  assetTypeL1: string;
  assetFormL2: string;
  pricePoint: string;
  nrmLvl1: string;
  rcdcCostGfa: number;
}

// Aggregate costs by NRM category from cost model data
export function aggregateCostsByNRM(
  buildingAssets: BuildingAsset[],
  costModelEntries?: CostModelEntry[]
): CostModelData[] {
  // If we have cost model data, calculate actual NRM distribution
  if (costModelEntries && costModelEntries.length > 0) {
    const nrmTotals: Record<string, number> = {};

    // For each building asset, find matching cost model entries and aggregate by NRM
    buildingAssets.forEach(asset => {
      const gfa = asset.totalGFA || 0;
      if (gfa === 0) return;

      // Find matching cost model entries for this asset
      const matchingEntries = costModelEntries.filter(entry =>
        entry.assetClass === asset.assetClass &&
        entry.assetTypeL1 === asset.assetTypeL1 &&
        entry.assetFormL2 === asset.assetTypologyL2 &&
        entry.pricePoint === asset.pricePoint
      );

      // Aggregate costs by NRM category
      matchingEntries.forEach(entry => {
        const nrmCategory = entry.nrmLvl1;
        const cost = gfa * (entry.rcdcCostGfa || 0);
        nrmTotals[nrmCategory] = (nrmTotals[nrmCategory] || 0) + cost;
      });
    });

    // Return sorted by NRM_CATEGORIES order
    return NRM_CATEGORIES.map(category => ({
      category,
      value: nrmTotals[category] || 0,
    }));
  }

  // Fallback: estimate based on total cost and default distribution
  const totalCost = buildingAssets.reduce((sum, asset) => sum + (asset.finalCost || asset.totalCost || 0), 0);

  // Default distribution percentages (fallback only)
  const defaultDistribution: Record<string, number> = {
    "Facilitating Works": 0.02,
    "Substructure": 0.08,
    "Superstructure": 0.15,
    "Building External Envelope": 0.12,
    "Internal Walls & Doors": 0.08,
    "Internal Finishes": 0.10,
    "FF&E": 0.05,
    "Services Equipment": 0.03,
    "Sanitary Fittings": 0.04,
    "Mechanical Services": 0.12,
    "Electrical Services": 0.10,
    "External Works": 0.06,
    "Conveying Systems": 0.03,
    "General Requirements": 0.02,
  };

  return NRM_CATEGORIES.map(category => ({
    category,
    value: totalCost * (defaultDistribution[category] || 0),
  }));
}

// Calculate FAR by Asset Class
export function calculateFARByAssetClass(buildingAssets: BuildingAsset[]): DistributionData[] {
  const gfaByClass = calculateGFAByAssetClass(buildingAssets);
  const totalPlotArea = buildingAssets.reduce((sum, asset) => sum + (asset.totalPlotArea || 0), 0);

  return gfaByClass.map(item => ({
    name: item.name,
    value: totalPlotArea > 0 ? item.value / totalPlotArea : 0,
  }));
}

// Calculate FAR by Asset Type
export function calculateFARByAssetType(buildingAssets: BuildingAsset[]): DistributionData[] {
  const gfaByType = calculateGFAByAssetType(buildingAssets);
  const totalPlotArea = buildingAssets.reduce((sum, asset) => sum + (asset.totalPlotArea || 0), 0);

  return gfaByType.map(item => ({
    name: item.name,
    value: totalPlotArea > 0 ? item.value / totalPlotArea : 0,
  }));
}

// Default S-curve settings
const DEFAULT_SCURVE_SETTINGS: SCurveSettings = {
  steepness: 10,
  midpoint: 0.5,
};

// S-curve function (logistic curve)
function calculateSCurveValue(
  t: number,
  totalMonths: number,
  totalCost: number,
  settings: SCurveSettings
): number {
  const normalizedT = t / totalMonths;
  const exponent = -settings.steepness * (normalizedT - settings.midpoint);
  return totalCost / (1 + Math.exp(exponent));
}

// Generate S-Curve data for Cost Trend chart with per-phase support
export function generateSCurveData(
  phases: string[],
  totalCost: number,
  startDate: string,
  durationMonths: number = 36,
  settings?: SCurveSettings
): SCurveDataPoint[] {
  const data: SCurveDataPoint[] = [];
  const startDateObj = parseQuarterDate(startDate) || new Date();
  const scurveSettings = settings || DEFAULT_SCURVE_SETTINGS;

  const phaseCount = phases.length || 2;
  const costPerPhase = totalCost / phaseCount;

  for (let month = 0; month <= durationMonths; month++) {
    const date = new Date(startDateObj);
    date.setMonth(date.getMonth() + month);
    const dateStr = formatDateForChart(date);

    // Phase 1 costs (first half of project)
    const phase1DurationMonths = durationMonths / phaseCount;
    const phase1Progress = month <= phase1DurationMonths
      ? calculateSCurveValue(month, phase1DurationMonths, costPerPhase, scurveSettings)
      : costPerPhase;

    // Phase 2 costs (second phase, if applicable)
    const phase2Progress = phaseCount > 1 && month > phase1DurationMonths
      ? calculateSCurveValue(month - phase1DurationMonths, phase1DurationMonths, costPerPhase, scurveSettings)
      : 0;

    // Monthly costs (derivative of S-curve approximation)
    const phase1MonthlyCost = month > 0
      ? Math.max(0, (phase1Progress - (data[month - 1]?.phase1SCurve || 0)))
      : 0;
    const phase2MonthlyCost = month > 0 && phaseCount > 1
      ? Math.max(0, (phase2Progress - (data[month - 1]?.phase2SCurve || 0)))
      : 0;

    data.push({
      date: dateStr,
      phase1SCurve: phase1Progress,
      phase2SCurve: phase2Progress,
      sCurveTotal: phase1Progress + phase2Progress,
      phase1Cost: phase1MonthlyCost,
      phase2Cost: phase2MonthlyCost,
    });
  }

  return data;
}

// Generate S-Curve data with per-phase configuration (overlapping phases supported)
export function generateSCurveDataWithPhases(
  phaseCosts: PhaseCostInfo[],
  settings?: SCurveSettings
): SCurveDataPoint[] {
  if (!phaseCosts || phaseCosts.length === 0) {
    return [];
  }

  const scurveSettings = settings || DEFAULT_SCURVE_SETTINGS;

  // Find the overall project timeline
  const phaseStartDates = phaseCosts.map(p => parseQuarterDate(p.startDate) || new Date());
  const phaseEndDates = phaseCosts.map((p, i) => {
    const start = phaseStartDates[i];
    const end = new Date(start);
    end.setMonth(end.getMonth() + p.totalMonths);
    return end;
  });

  const projectStart = new Date(Math.min(...phaseStartDates.map(d => d.getTime())));
  const projectEnd = new Date(Math.max(...phaseEndDates.map(d => d.getTime())));

  // Calculate total months for the entire project
  const totalProjectMonths = Math.ceil(
    (projectEnd.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24 * 30)
  );

  const data: SCurveDataPoint[] = [];

  for (let month = 0; month <= totalProjectMonths; month++) {
    const currentDate = new Date(projectStart);
    currentDate.setMonth(currentDate.getMonth() + month);
    const dateStr = formatDateForChart(currentDate);

    // Calculate cumulative S-curve value for each phase at this point in time
    const phaseValues: Record<string, number> = {};
    let totalSCurve = 0;

    phaseCosts.forEach((phase, index) => {
      const phaseStart = phaseStartDates[index];
      const monthsFromPhaseStart = Math.ceil(
        (currentDate.getTime() - phaseStart.getTime()) / (1000 * 60 * 60 * 24 * 30)
      );

      let phaseSCurve = 0;
      if (monthsFromPhaseStart >= phase.totalMonths) {
        // Phase is complete
        phaseSCurve = phase.totalCost;
      } else if (monthsFromPhaseStart > 0) {
        // Phase is in progress
        phaseSCurve = calculateSCurveValue(
          monthsFromPhaseStart,
          phase.totalMonths,
          phase.totalCost,
          scurveSettings
        );
      }
      // else: Phase hasn't started yet (phaseSCurve = 0)

      phaseValues[`phase${index + 1}SCurve`] = phaseSCurve;
      totalSCurve += phaseSCurve;
    });

    // Calculate monthly costs (derivative)
    const monthlyCosts: Record<string, number> = {};
    phaseCosts.forEach((_, index) => {
      const key = `phase${index + 1}SCurve`;
      const costKey = `phase${index + 1}Cost`;
      const prevValue = data.length > 0 ? (data[data.length - 1][key] as number) || 0 : 0;
      monthlyCosts[costKey] = Math.max(0, phaseValues[key] - prevValue);
    });

    data.push({
      date: dateStr,
      phase1SCurve: phaseValues.phase1SCurve || 0,
      phase2SCurve: phaseValues.phase2SCurve || 0,
      sCurveTotal: totalSCurve,
      phase1Cost: monthlyCosts.phase1Cost || 0,
      phase2Cost: monthlyCosts.phase2Cost || 0,
      ...phaseValues,
      ...monthlyCosts,
    });
  }

  return data;
}

// Parse quarter date format (e.g., "1Q27" -> Date)
function parseQuarterDate(quarterStr: string): Date | null {
  if (!quarterStr) return null;

  const match = quarterStr.match(/^(\d)Q(\d{2})$/);
  if (!match) {
    // Try parsing as regular date
    const date = new Date(quarterStr);
    return isNaN(date.getTime()) ? null : date;
  }

  const quarter = parseInt(match[1]);
  const year = 2000 + parseInt(match[2]);
  const month = (quarter - 1) * 3;

  return new Date(year, month, 1);
}

// Format date for chart display
function formatDateForChart(date: Date): string {
  return date.toISOString().slice(0, 7); // YYYY-MM format
}

// Calculate high-level metrics
export function calculateHighLevelMetrics(
  buildingAssets: BuildingAsset[],
  carParking: CarParkingAsset[],
  additionalAssets: AdditionalAsset[],
  infrastructure: InfrastructureConfig | null,
  publicRealm: PublicRealmAsset[],
  otherCosts: OtherCostsConfig | null,
  approvedBudget: number = 0
): HighLevelMetrics {
  // Calculate totals
  const buildingGFA = buildingAssets.reduce((sum, a) => sum + (a.totalGFA || 0), 0);
  const buildingPlotArea = buildingAssets.reduce((sum, a) => sum + (a.totalPlotArea || 0), 0);
  const buildingCost = buildingAssets.reduce((sum, a) => sum + (a.finalCost || a.totalCost || 0), 0);

  const parkingArea = carParking.reduce((sum, a) => sum + (a.totalParkingArea || 0), 0);
  const parkingCost = carParking.reduce((sum, a) => sum + (a.finalCost || a.totalCost || 0), 0);

  const additionalCost = additionalAssets.reduce((sum, a) => sum + (a.totalCost || 0), 0);

  const publicRealmCost = publicRealm.reduce((sum, a) => sum + (a.totalCost || 0), 0);

  const infraCost = infrastructure?.totalInfrastructureCost || 0;

  const totalGLA = buildingGFA + parkingArea;
  const totalPlotArea = buildingPlotArea + (infrastructure?.totalPlotArea || 0);

  // Construction costs
  const builtAssetsCost = buildingCost + parkingCost + additionalCost;
  const infraPRCost = infraCost + publicRealmCost;
  const constructionCostHard = builtAssetsCost + infraPRCost;

  // Other costs
  const softCosts = otherCosts?.softCostsAmount || 0;
  const authorityFees = otherCosts?.authorityFeesAmount || 0;
  const contingency = otherCosts?.contingencyAmount || 0;

  const totalConstructionCost = constructionCostHard + softCosts + authorityFees + contingency;

  // Get phases
  const phases = getPhases(buildingAssets);

  // Get base date (earliest)
  const baseDates = buildingAssets.map(a => a.baseDate).filter(Boolean);
  const baseDate = baseDates.length > 0 ? baseDates.sort()[0] : "";

  return {
    totalGLA,
    far: calculateFAR(buildingGFA, buildingPlotArea),
    phases: phases.length || 1,
    plotArea: totalPlotArea,
    gfa: buildingGFA,
    approvedBudget,
    buaForParking: parkingArea,
    baseDate,
    constructionCostHard,
    totalBUA: totalGLA,
    builtAssetsCost,
    totalConstructionCost,
    totalPlotAreaForBuildings: buildingPlotArea,
    infraPRCost,
    variance: calculateVariance(approvedBudget, totalConstructionCost),
  };
}

// Group building assets by category for Capex breakdown
export function groupBuildingAssetsByCategory(buildingAssets: BuildingAsset[]): Record<string, BuildingAsset[]> {
  return buildingAssets.reduce((acc, asset) => {
    const category = asset.assetTypeL1 || "Other";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(asset);
    return acc;
  }, {} as Record<string, BuildingAsset[]>);
}

// Calculate totals for a group of building assets
export function calculateAssetGroupTotals(assets: BuildingAsset[]): {
  totalGFA: number;
  avgSARPerM2: number;
  totalCost: number;
} {
  const totalGFA = assets.reduce((sum, a) => sum + (a.totalGFA || 0), 0);
  const totalCost = assets.reduce((sum, a) => sum + (a.finalCost || a.totalCost || 0), 0);
  const avgSARPerM2 = totalGFA > 0 ? totalCost / totalGFA : 0;

  return { totalGFA, avgSARPerM2, totalCost };
}
