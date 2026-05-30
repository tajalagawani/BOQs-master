/**
 * MasterplanDetailClient — full port of
 * roshn/src/components/masterplan/MasterplanDetailClient.tsx (1,489 LOC).
 *
 * Every helper function (rate lookups, recalculations, cascading
 * dropdowns, auto-empty-row insertion, infrastructure auto-calc,
 * other-costs recalculation, version management, debounced auto-save)
 * is preserved verbatim. Visual chrome rebuilt with IOX zinc tokens.
 */
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Copy,
  Trash2,
  ChevronDown,
  Loader2,
  Check,
  X,
  BarChart3,
  Plus,
} from "lucide-react";

import ConfirmDialog from "@/components/costx/ConfirmDialog";
import SummaryCards from "@/components/SummaryCards";
import BuildingAssets from "@/components/sections/BuildingAssets";
import CarParking from "@/components/sections/CarParking";
import AdditionalAsset from "@/components/sections/AdditionalAsset";
import Infrastructure from "@/components/sections/Infrastructure";
import PublicRealm from "@/components/sections/PublicRealm";
import OtherCosts from "@/components/sections/OtherCosts";

import { sumValues } from "@/utils/calculations";
import {
  getBuildingAssetsOptions,
  getCarParkingOptions,
  getAdditionalAssetOptions,
  getPublicRealmOptions,
  getInfrastructureRatesFromCostModel,
} from "@/utils/dropdownOptions";
import {
  calculateTotalPlotArea,
  calculateTotalGFA,
  calculateFAR,
  calculateBuildingFootprint,
  calculateExternalArea,
  calculateNetBuildCost,
  calculateTotalCost as calculateBuildingTotalCost,
  calculateSarPerM2Total,
} from "@/utils/calculations/buildingAssets";
import {
  calculateInfrastructure,
  buildFARDensityRanges,
} from "@/utils/calculations/infrastructure";
import { recalculateOtherCostsConfig } from "@/utils/calculations/otherCosts";
import { autoSaveMasterplanVersion } from "@/actions/masterplan";

import type {
  MasterplanVersion,
  BuildingAsset as BuildingAssetType,
  CarParkingAsset as CarParkingAssetType,
  AdditionalAsset as AdditionalAssetType,
  PublicRealmAsset as PublicRealmAssetType,
} from "@/types/masterplan";
import type { CostModelEntry } from "@/types/costModel";
import { cn } from "@/lib/cn";

/* ─────────────────────────────────────────────────────────────────────
 *  Props
 * ────────────────────────────────────────────────────────────────────*/
interface MasterplanProp {
  id: string;
  name: string;
  description: string | null;
  grossLandArea: number;
  calculatedPlotArea: number;
  balanceExternalArea: number;
  totalUnits: number;
  parkingSpaces: number;
  contingency: number;
  totalCost: number;
  costPerGfa: number;
  assetClass: string;
  assetTypeL1: string;
  assetFormL2: string | null;
  status: string;
  buildingCosts: unknown[];
  infrastructureCosts: unknown[];
  phases?: Array<{
    phaseNumber: number;
    phaseName: string;
    startDate: string;
    totalMonths: number;
  }>;
  calculations: {
    totalBuildingCosts: number;
    totalInfrastructureCosts: number;
    contingency: number;
    grandTotal: number;
    costPerGfa: number;
  };
}

interface Props {
  masterplan: MasterplanProp;
  costModelEntries: CostModelEntry[];
  savedVersion?: MasterplanVersion | null;
  configurations?: Record<string, unknown>;
}

/* ─────────────────────────────────────────────────────────────────────
 *  Empty-version factory (verbatim from roshn)
 * ────────────────────────────────────────────────────────────────────*/
const createEmptyVersion = (
  name: string,
  versionNum: number,
): MasterplanVersion =>
  ({
    id: String(Date.now()),
    masterplanId: "",
    versionName: name,
    versionNumber: versionNum,
    buildingAssets: [
      {
        id: "init-building-1",
        assetClass: "" as never,
        assetTypeL1: "",
        assetTypologyL2: "",
        pricePoint: "" as never,
        phase: "",
        baseDate: "",
        plotAreaPerBuilding: 0,
        gfaPerBuilding: 0,
        numberOfBuildings: 0,
        levels: 0,
        generalRequirements: 10,
      },
    ],
    carParking: [
      {
        id: "init-parking-1",
        assetClass: "Car Parking",
        assetGroup: "",
        assetTypology: "" as never,
        pricePoints: "N/A",
        phase: "",
        baseDate: "",
        parkingAreaPerSpace: 0,
        spacesPerLevel: 0,
        numberOfBuildings: 0,
        levels: 0,
        generalRequirements: 10,
      },
    ],
    additionalAssets: [
      {
        id: "init-additional-1",
        assetClass: "Additional Asset",
        assetGroup: "",
        assetTypeL1: "",
        assetTypologyL2: "",
        pricePoints: "-",
        calculationType: "Lump Sum" as never,
        phase: "",
        baseDate: "",
        plotArea: 0,
        quantity: 1,
        generalRequirements: 10,
      },
    ],
    infrastructure: {
      baseDate: "",
      assetDensity: "Medium",
      grossLandArea: 0,
      totalPlotArea: 0,
      totalGLA: 0,
      grossFAR: 0,
      phase: "",
      balanceExternalArea: 0,
      sarPerM2GLA: 0,
      primaryCost: 0,
      secondaryCost: 0,
      generalRequirements: 0,
      netInfrastructureCost: 0,
      totalInfrastructureCost: 0,
    },
    publicRealm: [
      {
        id: "init-publicrealm-1",
        assetClass: "Public Realm",
        assetTypeL1: "",
        assetTypologyL2: "" as never,
        pricePoint: "" as never,
        phase: "",
        parkArea: 0,
        numberOfParks: 0,
        generalRequirements: 10,
      },
    ],
    otherCosts: {
      contingencyPercentage: 0,
      contingencyAmount: 0,
      authorityFeesPercentage: 0,
      authorityFeesAmount: 0,
      softCostsPercentage: 0,
      softCostsAmount: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }) as unknown as MasterplanVersion;

/* ─────────────────────────────────────────────────────────────────────
 *  Rate lookup + recalculation helpers (verbatim from roshn)
 * ────────────────────────────────────────────────────────────────────*/
function getTotalRateFromCostModel(
  costModelEntries: CostModelEntry[],
  assetClass: string,
  assetTypeL1: string,
  assetTypologyL2: string,
  pricePoint: string,
): number {
  if (!costModelEntries || costModelEntries.length === 0) return 0;
  if (!assetClass || !assetTypeL1 || !assetTypologyL2 || !pricePoint) return 0;

  const normalize = (s: unknown): string =>
    (s == null ? "" : String(s)).trim();

  const matching = costModelEntries.filter(
    (e) =>
      normalize(e.assetClass) === normalize(assetClass) &&
      normalize(e.assetTypeL1) === normalize(assetTypeL1) &&
      normalize(e.assetFormL2) === normalize(assetTypologyL2) &&
      normalize(e.pricePoint) === normalize(pricePoint),
  );

  return matching.reduce((sum, entry) => {
    const rate = entry?.rcdcCostGfa as number | string | undefined;
    const num =
      typeof rate === "number" ? rate : parseFloat(String(rate)) || 0;
    return sum + num;
  }, 0);
}

function recalculateBuildingAsset(
  asset: BuildingAssetType,
  costModelEntries: CostModelEntry[],
): BuildingAssetType {
  const rate = getTotalRateFromCostModel(
    costModelEntries,
    asset.assetClass as string,
    asset.assetTypeL1,
    asset.assetTypologyL2,
    asset.pricePoint as string,
  );

  const plotArea = asset.plotAreaPerBuilding || 0;
  const gfa = asset.gfaPerBuilding || 0;
  const buildings = asset.numberOfBuildings || 0;
  const levels = asset.levels || 1;
  const genReq = asset.generalRequirements || 0;

  const totalPlotArea = calculateTotalPlotArea(plotArea, buildings);
  const totalGFA = calculateTotalGFA(gfa, buildings);
  const far = calculateFAR(totalGFA, totalPlotArea);
  const buildingFootprint = calculateBuildingFootprint(totalGFA, levels);
  const externalArea = calculateExternalArea(totalPlotArea, buildingFootprint);

  const netBuildCost = calculateNetBuildCost(totalGFA, rate);
  const totalCost = calculateBuildingTotalCost(netBuildCost, genReq);
  const sarPerM2Total = calculateSarPerM2Total(totalCost, totalGFA);

  let finalCost = totalCost;
  if (asset.glazingPercentage && asset.glazingPercentage !== "None") {
    const glazingFactors: Record<string, number> = {
      Low: 0.02,
      Medium: 0.05,
      High: 0.1,
    };
    const factor = glazingFactors[asset.glazingPercentage] || 0;
    finalCost = Math.round(totalCost * (1 + factor));
  }

  return {
    ...asset,
    totalPlotArea,
    totalGFA,
    far,
    buildingFootprint,
    externalArea,
    sarPerM2GFA: rate,
    netBuildCost,
    sarPerM2Total,
    totalCost,
    finalCost,
  };
}

const PLOT_AREA_APPLICABLE_TYPOLOGIES = [
  "On Grade",
  "Separate Structure - Multi Storey",
];
const MAX_BASEMENT_LEVELS = 2;

function getCarParkingRateFromCostModel(
  costModelEntries: CostModelEntry[],
  assetTypology: string,
  pricePoint: string,
): number {
  if (!costModelEntries || !assetTypology) return 0;
  const normalize = (s: unknown): string =>
    (s == null ? "" : String(s)).trim();
  const matching = costModelEntries.filter(
    (e) =>
      normalize(e.assetClass) === "Car Parking" &&
      normalize(e.assetFormL2) === normalize(assetTypology) &&
      (!pricePoint || normalize(e.pricePoint) === normalize(pricePoint)),
  );
  return matching.reduce((sum, entry) => {
    const rate = entry?.rcdcCostGfa as number | string | undefined;
    const num =
      typeof rate === "number" ? rate : parseFloat(String(rate)) || 0;
    return sum + num;
  }, 0);
}

const DEFAULT_PARKING_AREA_PER_SPACE = {
  onGrade: 35,
  basement: 45,
  podium: 35,
  separateStructure: 40,
};

function getParkingAreaPerSpace(
  assetTypology: string,
  parkingConfig?: Record<string, number>,
): number {
  if (!assetTypology) return 0;
  const config = parkingConfig || DEFAULT_PARKING_AREA_PER_SPACE;
  const t = assetTypology.toLowerCase();
  if (t.includes("on grade") || t.includes("on-grade"))
    return config.onGrade || DEFAULT_PARKING_AREA_PER_SPACE.onGrade;
  if (t.includes("basement"))
    return config.basement || DEFAULT_PARKING_AREA_PER_SPACE.basement;
  if (t.includes("podium"))
    return config.podium || DEFAULT_PARKING_AREA_PER_SPACE.podium;
  if (t.includes("separate") || t.includes("multi"))
    return (
      config.separateStructure ||
      DEFAULT_PARKING_AREA_PER_SPACE.separateStructure
    );
  return config.onGrade || DEFAULT_PARKING_AREA_PER_SPACE.onGrade;
}

function recalculateCarParking(
  parking: CarParkingAssetType,
  costModelEntries: CostModelEntry[],
  parkingAreaConfig?: Record<string, number>,
): CarParkingAssetType {
  const typology = parking.assetTypology || "";
  const pricePoint = parking.pricePoints || "N/A";

  const rate = getCarParkingRateFromCostModel(
    costModelEntries,
    typology as string,
    pricePoint,
  );

  let validatedLevels = parking.levels || 1;
  if (
    typology === "Basement (Up to Two Levels)" &&
    validatedLevels > MAX_BASEMENT_LEVELS
  ) {
    validatedLevels = MAX_BASEMENT_LEVELS;
  }

  const plotAreaApplicable =
    PLOT_AREA_APPLICABLE_TYPOLOGIES.includes(typology as string);
  void plotAreaApplicable;

  const parkingAreaPerSpace = getParkingAreaPerSpace(
    typology as string,
    parkingAreaConfig,
  );
  const genReq = parking.generalRequirements || 0;
  const spacesPerLevel = parking.spacesPerLevel || 0;

  const totalParkingSpaces = spacesPerLevel * validatedLevels;
  const totalParkingArea = spacesPerLevel * parkingAreaPerSpace;
  const totalPlotArea =
    validatedLevels > 0 ? Math.round(totalParkingArea / validatedLevels) : 0;

  const netBuildCost = Math.round(totalParkingArea * rate);
  const totalCost = Math.round(netBuildCost * (1 + genReq / 100));

  let finalCost = totalCost;
  if (parking.facadeAdjustment && parking.facadeAdjustment !== "None") {
    const facadeFactors: Record<string, number> = {
      Light: 0.02,
      Medium: 0.05,
      Heavy: 0.1,
    };
    const factor = facadeFactors[parking.facadeAdjustment] || 0;
    finalCost = Math.round(totalCost * (1 + factor));
  }

  return {
    ...parking,
    levels: validatedLevels,
    parkingAreaPerSpace,
    totalParkingSpaces,
    totalPlotArea,
    totalParkingArea,
    sarPerM2: rate,
    netBuildCost,
    totalCost,
    finalCost,
  };
}

function recalculateAdditionalAsset(
  asset: AdditionalAssetType,
  costModelEntries: CostModelEntry[],
): AdditionalAssetType {
  const rate = getTotalRateFromCostModel(
    costModelEntries,
    asset.assetClass,
    asset.assetTypeL1,
    asset.assetTypologyL2,
    asset.pricePoints || "-",
  );

  const calculationType = asset.calculationType || "Lump Sum";
  const quantity = asset.quantity || 1;
  const plotArea = asset.plotArea || 0;
  const genReq = asset.generalRequirements || 0;

  let netBuildCost: number;
  if (calculationType === "Lump Sum") {
    netBuildCost = Math.round(rate * quantity);
  } else {
    netBuildCost = Math.round(plotArea * rate);
  }
  const totalCost = Math.round(netBuildCost * (1 + genReq / 100));

  return {
    ...asset,
    sarPerM2GFA: rate,
    netBuildCost,
    totalCost,
  };
}

function recalculatePublicRealm(
  asset: PublicRealmAssetType,
  costModelEntries: CostModelEntry[],
): PublicRealmAssetType {
  const rate = getTotalRateFromCostModel(
    costModelEntries,
    asset.assetClass || "Public Realm",
    asset.assetTypeL1 || "Public Realm",
    asset.assetTypologyL2 as string,
    asset.pricePoint as string,
  );

  const parkArea = asset.parkArea || 0;
  const numberOfParks = asset.numberOfParks || 0;
  const genReq = asset.generalRequirements || 0;

  const totalParkArea = parkArea * numberOfParks;
  const netBuildCost = Math.round(totalParkArea * rate);
  const totalCost = Math.round(netBuildCost * (1 + genReq / 100));

  return {
    ...asset,
    totalParkArea,
    sarPerM2: rate,
    netBuildCost,
    totalCost,
  };
}

/* ─────────────────────────────────────────────────────────────────────
 *  The orchestrator component
 * ────────────────────────────────────────────────────────────────────*/
export default function MasterplanDetailClient({
  masterplan,
  costModelEntries,
  savedVersion,
  configurations = {},
}: Props) {
  // Initialize with saved version if available
  const initialVersion =
    savedVersion || createEmptyVersion(`${masterplan.name}_v1`, 1);
  if (!savedVersion) {
    initialVersion.id = "v1";
    initialVersion.masterplanId = masterplan.id;
  }

  // Version state
  const [versions, setVersions] = useState<MasterplanVersion[]>([
    initialVersion,
  ]);
  const [activeVersionId, setActiveVersionId] = useState(initialVersion.id);

  // Auto-save state
  type SaveStatus = "idle" | "saving" | "saved" | "error";
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [_lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  void _lastSavedAt;
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isInitialMount = useRef(true);

  const version = versions.find((v) => v.id === activeVersionId) || versions[0];

  // Recalculate all assets on mount when cost model entries arrive
  useEffect(() => {
    if (!costModelEntries || costModelEntries.length === 0) return;

    setVersions((prev) =>
      prev.map((v) => {
        const parkingAreaConfig = configurations?.parking_area_per_space as
          | Record<string, number>
          | undefined;
        return {
          ...v,
          buildingAssets: v.buildingAssets.map((a) =>
            recalculateBuildingAsset(a, costModelEntries),
          ),
          carParking: v.carParking.map((p) =>
            recalculateCarParking(p, costModelEntries, parkingAreaConfig),
          ),
          additionalAssets: v.additionalAssets.map((a) =>
            recalculateAdditionalAsset(a, costModelEntries),
          ),
          publicRealm: v.publicRealm.map((a) =>
            recalculatePublicRealm(a, costModelEntries),
          ),
        };
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [costModelEntries]);

  // Predicates for empty rows
  const isEmptyBuildingAsset = useCallback(
    (asset: BuildingAssetType) =>
      !asset.assetClass &&
      !asset.plotAreaPerBuilding &&
      !asset.gfaPerBuilding &&
      !asset.numberOfBuildings,
    [],
  );
  const isEmptyCarParking = useCallback(
    (parking: CarParkingAssetType) =>
      !parking.assetTypology &&
      !parking.parkingAreaPerSpace &&
      !parking.spacesPerLevel,
    [],
  );
  const isEmptyAdditionalAsset = useCallback(
    (asset: AdditionalAssetType) =>
      !asset.assetTypologyL2 && !asset.plotArea && (asset.quantity || 0) <= 1,
    [],
  );
  const isEmptyPublicRealm = useCallback(
    (asset: PublicRealmAssetType) =>
      !asset.assetTypologyL2 && !asset.parkArea && !asset.numberOfParks,
    [],
  );

  // Auto-add empty row to each section if none exists
  useEffect(() => {
    setVersions((prev) =>
      prev.map((v) => {
        if (v.id !== activeVersionId) return v;
        const updated = { ...v };
        let dirty = false;

        if (!v.buildingAssets.some(isEmptyBuildingAsset)) {
          updated.buildingAssets = [
            ...v.buildingAssets,
            {
              id: String(Date.now()),
              assetClass: "" as never,
              assetTypeL1: "",
              assetTypologyL2: "",
              pricePoint: "" as never,
              phase: "",
              baseDate: "",
              plotAreaPerBuilding: 0,
              gfaPerBuilding: 0,
              numberOfBuildings: 0,
              levels: 0,
              generalRequirements: 10,
            },
          ];
          dirty = true;
        }

        if (!v.carParking.some(isEmptyCarParking)) {
          updated.carParking = [
            ...v.carParking,
            {
              id: String(Date.now() + 1),
              assetClass: "Car Parking",
              assetGroup: "",
              assetTypology: "" as never,
              pricePoints: "N/A",
              phase: "",
              baseDate: "",
              parkingAreaPerSpace: 0,
              spacesPerLevel: 0,
              numberOfBuildings: 0,
              levels: 0,
              generalRequirements: 10,
            },
          ];
          dirty = true;
        }

        if (!v.additionalAssets.some(isEmptyAdditionalAsset)) {
          updated.additionalAssets = [
            ...v.additionalAssets,
            {
              id: String(Date.now() + 2),
              assetClass: "Additional Asset",
              assetGroup: "",
              assetTypeL1: "",
              assetTypologyL2: "",
              pricePoints: "-",
              calculationType: "Lump Sum" as never,
              phase: "",
              baseDate: "",
              plotArea: 0,
              quantity: 1,
              generalRequirements: 10,
            },
          ];
          dirty = true;
        }

        if (!v.publicRealm.some(isEmptyPublicRealm)) {
          updated.publicRealm = [
            ...v.publicRealm,
            {
              id: String(Date.now() + 3),
              assetClass: "Public Realm",
              assetTypeL1: "",
              assetTypologyL2: "" as never,
              pricePoint: "" as never,
              phase: "",
              parkArea: 0,
              numberOfParks: 0,
              generalRequirements: 10,
            },
          ];
          dirty = true;
        }

        return dirty ? updated : v;
      }),
    );
  }, [
    activeVersionId,
    version.buildingAssets.length,
    version.carParking.length,
    version.additionalAssets.length,
    version.publicRealm.length,
    isEmptyBuildingAsset,
    isEmptyCarParking,
    isEmptyAdditionalAsset,
    isEmptyPublicRealm,
  ]);

  // Debounced auto-save
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setSaveStatus("saving");
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const result = await autoSaveMasterplanVersion(masterplan.id, version);
        if (result.success) {
          setSaveStatus("saved");
          setLastSavedAt(result.savedAt || new Date().toISOString());
          setTimeout(() => setSaveStatus("idle"), 3000);
        } else {
          setSaveStatus("error");
        }
      } catch (e) {
        console.error("Auto-save error:", e);
        setSaveStatus("error");
      }
    }, 1000);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [versions, activeVersionId, masterplan.id, version]);

  // Auto-calculate infrastructure from building assets + GLA + density
  useEffect(() => {
    const totalPlotAreaFromAssets = version.buildingAssets.reduce(
      (sum, a) => sum + (a.totalPlotArea || 0),
      0,
    );
    const totalGFAFromAssets = version.buildingAssets.reduce(
      (sum, a) => sum + (a.totalGFA || 0),
      0,
    );
    const totalPublicRealmAreaFromAssets = version.publicRealm.reduce(
      (sum, a) => sum + (a.totalParkArea || 0),
      0,
    );

    const densityConfig = configurations?.density_range_factor as
      | { lowToUse?: number; midToUse?: number }
      | undefined;
    const splitConfig = configurations?.infrastructure_split as
      | { primary?: number; secondary?: number }
      | undefined;

    const infrastructureRates = getInfrastructureRatesFromCostModel(
      costModelEntries,
    );

    const farThresholds = densityConfig
      ? {
          lowMaxFAR: densityConfig.lowToUse ?? 0.465,
          mediumMaxFAR: densityConfig.midToUse ?? 1.5,
        }
      : undefined;

    const customFARRanges = buildFARDensityRanges(
      infrastructureRates,
      farThresholds,
    );

    const infrastructureSplit = splitConfig
      ? {
          primary: splitConfig.primary || 30,
          secondary: splitConfig.secondary || 70,
        }
      : undefined;

    const infraResult = calculateInfrastructure({
      grossLandArea: masterplan.grossLandArea,
      totalGFA: totalGFAFromAssets,
      totalPlotArea: totalPlotAreaFromAssets,
      generalRequirementsPercent:
        version.infrastructure.generalRequirements ?? 10,
      customFARRanges,
      infrastructureSplit,
    });

    const cur = version.infrastructure;
    if (
      cur.grossFAR !== infraResult.calculatedFAR ||
      cur.assetDensity !== infraResult.densityCategory ||
      cur.sarPerM2GLA !== infraResult.sarPerM2GLA ||
      cur.netInfrastructureCost !== infraResult.netInfrastructureCost ||
      cur.totalInfrastructureCost !== infraResult.totalInfrastructureCost ||
      cur.totalPlotArea !== totalPlotAreaFromAssets ||
      cur.totalGLA !== totalGFAFromAssets
    ) {
      setVersions((prev) =>
        prev.map((v) => {
          if (v.id === activeVersionId) {
            return {
              ...v,
              infrastructure: {
                ...v.infrastructure,
                grossLandArea: masterplan.grossLandArea,
                totalPlotArea: totalPlotAreaFromAssets,
                totalGLA: totalGFAFromAssets,
                grossFAR: infraResult.calculatedFAR,
                assetDensity: infraResult.densityCategory,
                balanceExternalArea:
                  masterplan.grossLandArea -
                  totalPlotAreaFromAssets -
                  totalPublicRealmAreaFromAssets,
                sarPerM2GLA: infraResult.sarPerM2GLA,
                netInfrastructureCost: infraResult.netInfrastructureCost,
                primaryCost: infraResult.primaryCost,
                secondaryCost: infraResult.secondaryCost,
                totalInfrastructureCost: infraResult.totalInfrastructureCost,
              },
            };
          }
          return v;
        }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    version.buildingAssets,
    version.publicRealm,
    version.infrastructure.generalRequirements,
    masterplan.grossLandArea,
    activeVersionId,
    configurations,
  ]);

  // Construction cost for other-costs roll-up
  const currentConstructionCost =
    sumValues(version.buildingAssets.map((a) => a.totalCost || 0)) +
    sumValues(version.carParking.map((a) => a.totalCost || 0)) +
    sumValues(version.additionalAssets.map((a) => a.totalCost || 0)) +
    (version.infrastructure.totalInfrastructureCost || 0) +
    sumValues(version.publicRealm.map((a) => a.totalCost || 0));

  // Auto-recalculate other costs whenever construction cost changes
  useEffect(() => {
    const recalculated = recalculateOtherCostsConfig(
      version.otherCosts,
      currentConstructionCost,
    );
    if (
      recalculated.contingencyAmount !== version.otherCosts.contingencyAmount ||
      recalculated.authorityFeesAmount !==
        version.otherCosts.authorityFeesAmount ||
      recalculated.softCostsAmount !== version.otherCosts.softCostsAmount
    ) {
      setVersions((prev) =>
        prev.map((v) =>
          v.id === activeVersionId ? { ...v, otherCosts: recalculated } : v,
        ),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentConstructionCost, activeVersionId]);

  /* ──────────── Version management ──────────── */
  const handleAddVersion = () => {
    const newVersionNumber = versions.length + 1;
    const newVersion = createEmptyVersion(
      `${masterplan.name}_version${newVersionNumber}`,
      newVersionNumber,
    );
    newVersion.masterplanId = masterplan.id;
    setVersions((prev) => [...prev, newVersion]);
    setActiveVersionId(newVersion.id);
  };
  const handleCopyVersion = () => {
    const newVersionNumber = versions.length + 1;
    const copied: MasterplanVersion = {
      ...version,
      id: String(Date.now()),
      versionName: `${masterplan.name}_version${newVersionNumber}`,
      versionNumber: newVersionNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setVersions((prev) => [...prev, copied]);
    setActiveVersionId(copied.id);
  };
  const [deleteVersionConfirm, setDeleteVersionConfirm] = useState(false);
  const handleDeleteVersion = () => {
    if (versions.length <= 1) {
      toast.error("Cannot delete the last version");
      return;
    }
    setDeleteVersionConfirm(true);
  };
  const confirmDeleteVersion = () => {
    const remaining = versions.filter((v) => v.id !== activeVersionId);
    setVersions(remaining);
    setActiveVersionId(remaining[0].id);
    toast.success("Version deleted successfully");
    setDeleteVersionConfirm(false);
  };

  /* ──────────── Add handlers ──────────── */
  const defaultBaseDate = masterplan.phases?.[0]?.startDate || "";

  const handleAddBuildingAsset = () => {
    setVersions((prev) =>
      prev.map((v) => {
        if (v.id !== activeVersionId) return v;
        const newAsset: BuildingAssetType = {
          id: String(Date.now()),
          assetClass: "" as never,
          assetTypeL1: "",
          assetTypologyL2: "",
          pricePoint: "" as never,
          phase: "",
          baseDate: defaultBaseDate,
          plotAreaPerBuilding: 0,
          gfaPerBuilding: 0,
          numberOfBuildings: 0,
          levels: 0,
          generalRequirements: 10,
        };
        return {
          ...v,
          buildingAssets: [...v.buildingAssets, newAsset],
          updatedAt: new Date().toISOString(),
        };
      }),
    );
  };

  const handleAddCarParking = () => {
    setVersions((prev) =>
      prev.map((v) => {
        if (v.id !== activeVersionId) return v;
        const newParking: CarParkingAssetType = {
          id: String(Date.now()),
          assetClass: "Car Parking",
          assetGroup: "",
          assetTypology: "" as never,
          pricePoints: "N/A",
          phase: "",
          baseDate: defaultBaseDate,
          parkingAreaPerSpace: 0,
          spacesPerLevel: 0,
          numberOfBuildings: 0,
          levels: 0,
          generalRequirements: 10,
        };
        return {
          ...v,
          carParking: [...v.carParking, newParking],
          updatedAt: new Date().toISOString(),
        };
      }),
    );
  };

  const handleAddAdditionalAsset = () => {
    setVersions((prev) =>
      prev.map((v) => {
        if (v.id !== activeVersionId) return v;
        const newAsset: AdditionalAssetType = {
          id: String(Date.now()),
          assetClass: "Additional Asset",
          assetGroup: "",
          assetTypeL1: "",
          assetTypologyL2: "",
          pricePoints: "-",
          calculationType: "Lump Sum" as never,
          phase: "",
          baseDate: defaultBaseDate,
          plotArea: 0,
          quantity: 1,
          generalRequirements: 10,
        };
        return {
          ...v,
          additionalAssets: [...v.additionalAssets, newAsset],
          updatedAt: new Date().toISOString(),
        };
      }),
    );
  };

  const handleAddPublicRealm = () => {
    setVersions((prev) =>
      prev.map((v) => {
        if (v.id !== activeVersionId) return v;
        const newAsset: PublicRealmAssetType = {
          id: String(Date.now()),
          assetClass: "Public Realm",
          assetTypeL1: "",
          assetTypologyL2: "" as never,
          pricePoint: "" as never,
          phase: "",
          parkArea: 0,
          numberOfParks: 0,
          generalRequirements: 10,
        };
        return {
          ...v,
          publicRealm: [...v.publicRealm, newAsset],
          updatedAt: new Date().toISOString(),
        };
      }),
    );
  };

  /* ──────────── Delete handlers ──────────── */
  const handleDeleteBuildingAsset = (id: string) =>
    setVersions((prev) =>
      prev.map((v) =>
        v.id === activeVersionId
          ? {
              ...v,
              buildingAssets: v.buildingAssets.filter((a) => a.id !== id),
              updatedAt: new Date().toISOString(),
            }
          : v,
      ),
    );

  const handleDeleteCarParking = (id: string) =>
    setVersions((prev) =>
      prev.map((v) =>
        v.id === activeVersionId
          ? {
              ...v,
              carParking: v.carParking.filter((a) => a.id !== id),
              updatedAt: new Date().toISOString(),
            }
          : v,
      ),
    );

  const handleDeleteAdditionalAsset = (id: string) =>
    setVersions((prev) =>
      prev.map((v) =>
        v.id === activeVersionId
          ? {
              ...v,
              additionalAssets: v.additionalAssets.filter((a) => a.id !== id),
              updatedAt: new Date().toISOString(),
            }
          : v,
      ),
    );

  const handleDeletePublicRealm = (id: string) =>
    setVersions((prev) =>
      prev.map((v) =>
        v.id === activeVersionId
          ? {
              ...v,
              publicRealm: v.publicRealm.filter((a) => a.id !== id),
              updatedAt: new Date().toISOString(),
            }
          : v,
      ),
    );

  /* ──────────── Update handlers with cascading + autopop ──────────── */
  const buildingOptionsProvider = getBuildingAssetsOptions(costModelEntries);
  const carParkingOptionsProvider = getCarParkingOptions(costModelEntries);
  const additionalAssetOptionsProvider =
    getAdditionalAssetOptions(costModelEntries);
  const publicRealmOptionsProvider = getPublicRealmOptions(costModelEntries);

  const handleUpdateBuildingAsset = (
    id: string,
    key: string,
    value: unknown,
  ) => {
    setVersions((prev) =>
      prev.map((v) => {
        if (v.id !== activeVersionId) return v;
        return {
          ...v,
          buildingAssets: v.buildingAssets.map((a) => {
            if (a.id !== id) return a;
            const updated = { ...a, [key]: value } as BuildingAssetType & {
              [k: string]: unknown;
            };

            if (key === "assetClass") {
              updated.assetTypeL1 = "";
              updated.assetTypologyL2 = "";
              updated.pricePoint = "" as never;
            } else if (key === "assetTypeL1") {
              updated.assetTypologyL2 = "";
              updated.pricePoint = "" as never;
            } else if (key === "assetTypologyL2") {
              updated.pricePoint = "" as never;
            }

            if (key === "phase" && value && masterplan.phases) {
              const sel = masterplan.phases.find(
                (p) => p.phaseName === value,
              );
              if (sel?.startDate) updated.baseDate = sel.startDate;
            }

            const options =
              typeof buildingOptionsProvider === "function"
                ? buildingOptionsProvider(updated)
                : buildingOptionsProvider;

            if (!updated.assetTypeL1 && options.assetTypeL1?.length === 1) {
              updated.assetTypeL1 = options.assetTypeL1[0];
            }
            if (
              !updated.assetTypologyL2 &&
              options.assetTypologyL2?.length === 1
            ) {
              updated.assetTypologyL2 = options.assetTypologyL2[0];
            }
            if (!updated.pricePoint && options.pricePoint?.length === 1) {
              updated.pricePoint = options.pricePoint[0] as never;
            }

            return recalculateBuildingAsset(
              updated as BuildingAssetType,
              costModelEntries,
            );
          }),
          updatedAt: new Date().toISOString(),
        };
      }),
    );
  };

  const handleUpdateCarParking = (
    id: string,
    key: string,
    value: unknown,
  ) => {
    setVersions((prev) =>
      prev.map((v) => {
        if (v.id !== activeVersionId) return v;
        return {
          ...v,
          carParking: v.carParking.map((a) => {
            if (a.id !== id) return a;
            const updated = { ...a, [key]: value } as CarParkingAssetType & {
              [k: string]: unknown;
            };
            if (key === "assetTypology") updated.pricePoints = "";
            if (key === "phase" && value && masterplan.phases) {
              const sel = masterplan.phases.find(
                (p) => p.phaseName === value,
              );
              if (sel?.startDate) updated.baseDate = sel.startDate;
            }
            const options =
              typeof carParkingOptionsProvider === "function"
                ? carParkingOptionsProvider(updated)
                : carParkingOptionsProvider;
            if (!updated.pricePoints && options.pricePoints?.length === 1) {
              updated.pricePoints = options.pricePoints[0];
            }
            const parkingAreaConfig = configurations?.parking_area_per_space as
              | Record<string, number>
              | undefined;
            return recalculateCarParking(
              updated as CarParkingAssetType,
              costModelEntries,
              parkingAreaConfig,
            );
          }),
          updatedAt: new Date().toISOString(),
        };
      }),
    );
  };

  const handleUpdateAdditionalAsset = (
    id: string,
    key: string,
    value: unknown,
  ) => {
    setVersions((prev) =>
      prev.map((v) => {
        if (v.id !== activeVersionId) return v;
        return {
          ...v,
          additionalAssets: v.additionalAssets.map((a) => {
            if (a.id !== id) return a;
            const updated = { ...a, [key]: value } as AdditionalAssetType & {
              [k: string]: unknown;
            };

            if (key === "assetClass") {
              updated.assetTypeL1 = "";
              updated.assetTypologyL2 = "";
              updated.pricePoints = "";
            } else if (key === "assetTypeL1") {
              updated.assetTypologyL2 = "";
              updated.pricePoints = "";
            } else if (key === "assetTypologyL2") {
              updated.pricePoints = "";
            }

            if (key === "phase" && value && masterplan.phases) {
              const sel = masterplan.phases.find(
                (p) => p.phaseName === value,
              );
              if (sel?.startDate) updated.baseDate = sel.startDate;
            }

            const options =
              typeof additionalAssetOptionsProvider === "function"
                ? additionalAssetOptionsProvider(updated)
                : additionalAssetOptionsProvider;
            if (!updated.assetTypeL1 && options.assetTypeL1?.length === 1)
              updated.assetTypeL1 = options.assetTypeL1[0];
            if (
              !updated.assetTypologyL2 &&
              options.assetTypologyL2?.length === 1
            )
              updated.assetTypologyL2 = options.assetTypologyL2[0];
            if (!updated.pricePoints && options.pricePoints?.length === 1)
              updated.pricePoints = options.pricePoints[0];

            return recalculateAdditionalAsset(
              updated as AdditionalAssetType,
              costModelEntries,
            );
          }),
          updatedAt: new Date().toISOString(),
        };
      }),
    );
  };

  const handleUpdatePublicRealm = (
    id: string,
    key: string,
    value: unknown,
  ) => {
    setVersions((prev) =>
      prev.map((v) => {
        if (v.id !== activeVersionId) return v;
        return {
          ...v,
          publicRealm: v.publicRealm.map((a) => {
            if (a.id !== id) return a;
            const updated = { ...a, [key]: value } as PublicRealmAssetType & {
              [k: string]: unknown;
            };
            if (key === "assetTypologyL2") updated.pricePoint = "" as never;
            const options =
              typeof publicRealmOptionsProvider === "function"
                ? publicRealmOptionsProvider(updated)
                : publicRealmOptionsProvider;
            if (!updated.pricePoint && options.pricePoint?.length === 1) {
              updated.pricePoint = options.pricePoint[0] as never;
            }
            return recalculatePublicRealm(
              updated as PublicRealmAssetType,
              costModelEntries,
            );
          }),
          updatedAt: new Date().toISOString(),
        };
      }),
    );
  };

  const handleUpdateInfrastructure = (key: string, value: unknown) =>
    setVersions((prev) =>
      prev.map((v) =>
        v.id === activeVersionId
          ? {
              ...v,
              infrastructure: { ...v.infrastructure, [key]: value },
              updatedAt: new Date().toISOString(),
            }
          : v,
      ),
    );

  const handleUpdateOtherCosts = (field: string, value: number) =>
    setVersions((prev) =>
      prev.map((v) => {
        if (v.id !== activeVersionId) return v;
        const updatedConfig = { ...v.otherCosts, [field]: value };
        const recalculated = recalculateOtherCostsConfig(
          updatedConfig,
          currentConstructionCost,
        );
        return {
          ...v,
          otherCosts: recalculated,
          updatedAt: new Date().toISOString(),
        };
      }),
    );

  /* ──────────── Roll-up totals ──────────── */
  const buildingAssetsTotalCost = sumValues(
    version.buildingAssets.map((a) => a.totalCost || 0),
  );
  const carParkingTotalCost = sumValues(
    version.carParking.map((a) => a.totalCost || 0),
  );
  const additionalAssetsTotalCost = sumValues(
    version.additionalAssets.map((a) => a.totalCost || 0),
  );
  const publicRealmTotalCost = sumValues(
    version.publicRealm.map((a) => a.totalCost || 0),
  );
  const constructionCost =
    buildingAssetsTotalCost +
    carParkingTotalCost +
    additionalAssetsTotalCost +
    (version.infrastructure.totalInfrastructureCost || 0) +
    publicRealmTotalCost;

  const calculatedPlotArea = sumValues(
    version.buildingAssets.map((a) => a.totalPlotArea || 0),
  );
  const totalGFA = sumValues(version.buildingAssets.map((a) => a.totalGFA || 0));
  const calculatedFAR = calculatedPlotArea > 0 ? totalGFA / calculatedPlotArea : 0;

  const totalPublicRealmArea = sumValues(
    version.publicRealm.map((a) => a.totalParkArea || 0),
  );
  const balanceExternalArea =
    masterplan.grossLandArea - calculatedPlotArea - totalPublicRealmArea;
  const isBalanceAreaValid = balanceExternalArea >= 0;

  const totalCost =
    constructionCost +
    (version.otherCosts.contingencyAmount || 0) +
    (version.otherCosts.authorityFeesAmount || 0) +
    (version.otherCosts.softCostsAmount || 0);

  /* ─────────────────────────────────────────────────────────────────
   *  Render
   * ────────────────────────────────────────────────────────────────*/
  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200 px-6 py-4 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-base font-semibold text-zinc-900 truncate">
              {masterplan.name} —{" "}
              <span className="font-normal text-zinc-500">
                Masterplan Estimate
              </span>
            </h1>

            {saveStatus === "saving" && (
              <span className="text-[11px] text-zinc-500 inline-flex items-center gap-1">
                <Loader2 className="size-3 animate-spin" />
                Saving…
              </span>
            )}
            {saveStatus === "saved" && (
              <span className="text-[11px] text-emerald-600 inline-flex items-center gap-1">
                <Check className="size-3" strokeWidth={2.5} />
                Saved
              </span>
            )}
            {saveStatus === "error" && (
              <span className="text-[11px] text-rose-600 inline-flex items-center gap-1">
                <X className="size-3" strokeWidth={2.5} />
                Error saving
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleAddVersion}
            className="h-9 px-4 inline-flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium rounded-full"
          >
            <Plus className="size-3.5" strokeWidth={2.25} />
            Add Masterplan Version
            <ChevronDown className="size-3.5" strokeWidth={1.75} />
          </button>
        </div>

        <p className="text-xs text-zinc-600">
          <span className="font-semibold">Parametric Cost Model:</span> Manage
          cost parameters grouped by Asset Class with detailed specifications
        </p>
      </div>

      {/* Version tabs */}
      <div className="bg-white px-6 py-3 flex items-center gap-2 overflow-x-auto border-b border-zinc-200 shrink-0">
        {versions.map((v) => (
          <div
            key={v.id}
            className={cn(
              "flex items-center gap-1 px-3 py-1.5 text-xs cursor-pointer transition-colors rounded-lg border",
              activeVersionId === v.id
                ? "bg-white text-zinc-900 border-zinc-300"
                : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100",
            )}
            onClick={() => setActiveVersionId(v.id)}
          >
            <span className="max-w-[250px] truncate font-medium">
              {v.versionName}
            </span>
            <div className="flex items-center gap-0.5 ml-1 border-l border-zinc-200 pl-1.5">
              <Link
                href={`/costx/${masterplan.id}/summary`}
                onClick={(e) => e.stopPropagation()}
                className="size-6 inline-flex items-center justify-center rounded hover:bg-zinc-100"
                title="View Summary"
              >
                <BarChart3 className="size-3.5 text-zinc-500" />
              </Link>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyVersion();
                }}
                className="size-6 inline-flex items-center justify-center rounded hover:bg-zinc-100"
                title="Copy Version"
              >
                <Copy className="size-3.5 text-zinc-500" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteVersion();
                }}
                className="size-6 inline-flex items-center justify-center rounded hover:bg-zinc-100"
                title="Delete Version"
              >
                <Trash2 className="size-3.5 text-zinc-500" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 bg-zinc-50">
        <SummaryCards
          initialBudget={masterplan.totalCost}
          constructionCost={constructionCost}
          totalCost={totalCost}
          grossLandArea={masterplan.grossLandArea}
          calculatedPlotArea={calculatedPlotArea}
          targetFAR={
            masterplan.grossLandArea
              ? masterplan.calculatedPlotArea / masterplan.grossLandArea
              : 0
          }
          calculatedFAR={calculatedFAR}
          balanceExternalArea={version.infrastructure.balanceExternalArea}
          softCosts={version.otherCosts.softCostsAmount || 0}
          authorityFees={version.otherCosts.authorityFeesAmount || 0}
          contingency={version.otherCosts.contingencyAmount || 0}
        />

        <div className="space-y-4">
          <BuildingAssets
            assets={version.buildingAssets}
            totalCost={buildingAssetsTotalCost}
            costModelEntries={costModelEntries}
            phases={masterplan.phases}
            onAddAsset={handleAddBuildingAsset}
            onDeleteAsset={handleDeleteBuildingAsset}
            onUpdateAsset={handleUpdateBuildingAsset}
          />
          <CarParking
            assets={version.carParking}
            totalCost={carParkingTotalCost}
            costModelEntries={costModelEntries}
            phases={masterplan.phases}
            onAddAsset={handleAddCarParking}
            onDeleteAsset={handleDeleteCarParking}
            onUpdateAsset={handleUpdateCarParking}
          />
          <AdditionalAsset
            assets={version.additionalAssets}
            totalCost={additionalAssetsTotalCost}
            costModelEntries={costModelEntries}
            phases={masterplan.phases}
            onAddAsset={handleAddAdditionalAsset}
            onDeleteAsset={handleDeleteAdditionalAsset}
            onUpdateAsset={handleUpdateAdditionalAsset}
          />
          <Infrastructure
            config={version.infrastructure}
            onUpdateConfig={handleUpdateInfrastructure}
          />
          <PublicRealm
            assets={version.publicRealm}
            totalCost={publicRealmTotalCost}
            costModelEntries={costModelEntries}
            phases={masterplan.phases}
            onAddAsset={handleAddPublicRealm}
            onDeleteAsset={handleDeletePublicRealm}
            onUpdateAsset={handleUpdatePublicRealm}
            grossLandArea={masterplan.grossLandArea}
            totalBuildingPlotArea={calculatedPlotArea}
            totalPublicRealmArea={totalPublicRealmArea}
            balanceExternalArea={balanceExternalArea}
            isBalanceAreaValid={isBalanceAreaValid}
          />
          <OtherCosts
            config={version.otherCosts}
            totalConstructionCost={constructionCost}
            onUpdatePercentage={handleUpdateOtherCosts}
          />
        </div>
      </div>

      {/* Delete version confirm */}
      <ConfirmDialog
        open={deleteVersionConfirm}
        onOpenChange={setDeleteVersionConfirm}
        title="Delete Version"
        description="Are you sure you want to delete this version? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmDeleteVersion}
      />
    </div>
  );
}
