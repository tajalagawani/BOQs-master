// Cost Model Types

export interface CostModelEntry {
  id: string;
  assetClass: string;
  assetTypeL1: string;
  assetFormL2: string;
  pricePoint: string;
  nrmLvl1: string;
  rcdcCostGfa: number | null;
  benchmarkedCostGfa: number | null;
  costBua: number | null;
  costGia: number | null;
  costGfa: number | null;
}

export interface AssetHierarchyNode {
  id: string;
  label: string;
  type: "root" | "assetClass" | "assetTypeL1" | "assetFormL2" | "pricePoint";
  typeLabel?: string;
  children?: AssetHierarchyNode[];
  expanded?: boolean;
}

export interface CostModelFilters {
  search: string;
  assetClass: string;
  assetTypeL1: string;
  nrmLvl1: string;
}

export type ConfigTab =
  | "cost-modelling"
  | "parametric-matrix"
  | "cost-factor"
  | "density-range-factor"
  | "infrastructure-split"
  | "parking-space"
  | "scurve-settings"
  | "dropdown-options"
  | "system-defaults";

export interface ConfigTabItem {
  id: ConfigTab;
  label: string;
}

export const CONFIG_TABS: ConfigTabItem[] = [
  { id: "cost-modelling", label: "Cost Modelling" },
  { id: "parametric-matrix", label: "Parametric Matrix" },
  { id: "cost-factor", label: "Cost Factor" },
  { id: "density-range-factor", label: "Density Range Factor" },
  { id: "infrastructure-split", label: "Infrastructure Split" },
  { id: "parking-space", label: "Parking Space" },
  { id: "scurve-settings", label: "S-Curve" },
  { id: "dropdown-options", label: "Benchmarks Filter" },
  { id: "system-defaults", label: "System Defaults" },
];

// Parametric Matrix Types
export interface ParametricOption {
  id: string;
  label: string;
}

export interface ParametricParameter {
  id: string;
  label: string;
  options: ParametricOption[];
}

export interface ParametricTreeNode {
  id: string;
  label: string;
  type: "root" | "parameter" | "option";
  children?: ParametricTreeNode[];
}

export interface ParametricMatrixEntry {
  id: string;
  nrmLvl1: string;
  parameter: string;
  option: string;
  factor: number;
}
